// The one data layer for the browser's calls to this site's own /api/* routes (the session cookie is
// sent automatically; admin routes also get the Firebase ID token). Each request's loading, success
// and error state lives here, errors keep the HTTP status so callers can tell a 409 from the rest,
// and notifications.ts turns the outcomes into snackbars.
import { createApi } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { isRole } from '../lib/access.ts'
import type { Role } from '../lib/access.ts'
import { getIdToken } from '../lib/firebase.ts'
import type { ApplicationDetail, ApplicationInput, ApplicationList, ApplicationSummary, CreatedResume } from '../lib/applicationTypes.ts'
import type {
  BlogBookmarks,
  BlogImage,
  BlogList,
  BlogPost,
  BlogSaveArg,
  CommentAddResult,
  PostEngagement,
} from '../lib/blogTypes.ts'
import type { BlogEditorConfig, BlogHeader } from '../data/blogConfig.ts'
import type { BuilderConfig, ResumeEnvelope, ResumeSummary } from '../lib/resumeTypes.ts'
import type { ResumeData, ResumeView, Structure } from '../lib/resumeValidation.ts'

export interface ApiError {
  /** HTTP status, or 0 when the request never reached the site. */
  status: number
  message: string
}

export interface ApiRequest {
  url: string
  method?: string
  body?: unknown
  /** Send the signed-in Firebase ID token (the /api/admin routes). */
  admin?: boolean
}

export const baseQuery: BaseQueryFn<ApiRequest, unknown, ApiError> = async ({ url, method = 'GET', body, admin }) => {
  try {
    const token = admin ? await getIdToken() : null
    const res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: { status: res.status, message: data?.error || `Request failed (${res.status}).` } }
    return { data }
  } catch {
    return { error: { status: 0, message: 'Could not reach the server. Check your connection and try again.' } }
  }
}

export interface TailorResult {
  stub?: boolean
  data: ResumeData
}

export interface SkillMatchResult {
  stub?: boolean
  matchPercent: number
  matched: string[]
  missing: string[]
}

export type AccessAction = 'add' | 'setRole' | 'revoke' | 'restore'

export interface AccessUser {
  email: string
  displayName: string
  role: Role
  allowed: boolean
  createdAt: string | null
  lastLoginAt: string | null
}

/** Someone without access who still owns resume or application data (counts only, never content). */
export interface DataOwner {
  email: string
  /** Resumes. */
  count: number
  applications: number
  bytes: number
  updatedAt: string | null
}

export interface CmsFileItem {
  filename: string
  displayName: string
  exists: boolean
  size: number
  updatedAt: string | null
}

export interface CmsFileContent extends CmsFileItem {
  content: string
}

export interface SaveResumeArg {
  id: string
  title: string
  data: ResumeData
  structure?: Structure
  view?: ResumeView | null
  generation: string
  /** Autosave: update the sync indicator only, no success snackbar. */
  silent?: boolean
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Session', 'Resumes', 'Resume', 'ResumeConfig', 'Applications', 'Application', 'Users', 'Owners', 'CmsFiles', 'CmsFile', 'BlogPosts', 'BlogPost', 'BlogConfig', 'BlogHeaders', 'Engagement', 'Bookmarks'],
  endpoints: (build) => ({
    // Session: null role when logged out (401 is the normal anonymous answer, not a failure).
    getSessionRole: build.query<Role | null, void>({
      providesTags: ['Session'],
      async queryFn(_arg, _api, _extra, baseQ) {
        const result = await baseQ({ url: '/api/auth/me' })
        const role = (result.data as { role?: unknown } | undefined)?.role
        return { data: isRole(role) ? role : null }
      },
    }),
    signIn: build.mutation<{ success?: boolean }, { idToken: string }>({
      query: (body) => ({ url: '/api/auth/session', method: 'POST', body }),
      // A new session must never see the previous user's cached data.
      invalidatesTags: ['Session', 'Resumes', 'Resume', 'ResumeConfig', 'Applications', 'Application', 'BlogPosts', 'BlogPost', 'BlogConfig', 'Engagement', 'Bookmarks'],
    }),
    signOut: build.mutation<{ success?: boolean }, void>({
      query: () => ({ url: '/api/auth/session', method: 'DELETE' }),
      invalidatesTags: ['Session', 'Resumes', 'Resume', 'ResumeConfig', 'Applications', 'Application', 'BlogPosts', 'BlogPost', 'BlogConfig', 'Engagement', 'Bookmarks'],
    }),

    // Blog: the author's own posts (the public home headers are the one public read).
    getBlogConfig: build.query<BlogEditorConfig, void>({
      query: () => ({ url: '/api/blog/config' }),
      providesTags: ['BlogConfig'],
    }),
    listBlogPosts: build.query<BlogList, { all: boolean }>({
      query: ({ all }) => ({ url: all ? '/api/blog?scope=all' : '/api/blog' }),
      providesTags: ['BlogPosts'],
    }),
    getBlogPost: build.query<BlogPost, string>({
      query: (id) => ({ url: `/api/blog/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'BlogPost', id }],
      // The editor holds the working copy; a cached older version must never reopen as the post.
      keepUnusedDataFor: 0,
    }),
    saveBlogPost: build.mutation<BlogPost, BlogSaveArg>({
      query: ({ id, ...body }) => ({ url: id ? `/api/blog/${id}` : '/api/blog', method: id ? 'PUT' : 'POST', body }),
      invalidatesTags: ['BlogPosts', 'BlogHeaders'],
    }),
    deleteBlogPost: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/api/blog/${id}`, method: 'DELETE' }),
      invalidatesTags: ['BlogPosts', 'BlogHeaders'],
    }),
    uploadBlogImage: build.mutation<BlogImage, { postId: string; name: string; dataBase64: string }>({
      query: ({ postId, name, dataBase64 }) => ({ url: `/api/blog/${postId}/images`, method: 'POST', body: { name, dataBase64 } }),
    }),
    // Blog engagement (any signed-in user): likes, bookmarks and comments on a published post.
    getPostEngagement: build.query<PostEngagement, string>({
      query: (id) => ({ url: `/api/posts/${id}/engagement` }),
      providesTags: (_r, _e, id) => [{ type: 'Engagement', id }],
    }),
    // One older page of comments (`before` = the createdAt of the oldest one shown); used with the lazy hook.
    getOlderComments: build.query<PostEngagement, { id: string; before: string }>({
      query: ({ id, before }) => ({ url: `/api/posts/${id}/engagement?before=${encodeURIComponent(before)}` }),
      keepUnusedDataFor: 0,
    }),
    toggleLike: build.mutation<{ liked: boolean; likeCount: number }, string>({
      query: (id) => ({ url: `/api/posts/${id}/like`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('getPostEngagement', id, (draft) => {
            if (!draft.viewer) return
            draft.viewer.liked = !draft.viewer.liked
            draft.likeCount = Math.max(0, draft.likeCount + (draft.viewer.liked ? 1 : -1))
          }),
        )
        try {
          const { data } = await queryFulfilled
          dispatch(
            api.util.updateQueryData('getPostEngagement', id, (draft) => {
              if (draft.viewer) draft.viewer.liked = data.liked
              draft.likeCount = data.likeCount
            }),
          )
        } catch {
          patch.undo()
        }
      },
    }),
    toggleBookmark: build.mutation<{ bookmarked: boolean }, string>({
      query: (id) => ({ url: `/api/posts/${id}/bookmark`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('getPostEngagement', id, (draft) => {
            if (draft.viewer) draft.viewer.bookmarked = !draft.viewer.bookmarked
          }),
        )
        try {
          const { data } = await queryFulfilled
          dispatch(
            api.util.updateQueryData('getPostEngagement', id, (draft) => {
              if (draft.viewer) draft.viewer.bookmarked = data.bookmarked
            }),
          )
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: ['Bookmarks'],
    }),
    addComment: build.mutation<CommentAddResult, { id: string; text: string }>({
      query: ({ id, text }) => ({ url: `/api/posts/${id}/comments`, method: 'POST', body: { text } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Engagement', id }],
    }),
    removeComment: build.mutation<{ commentCount: number }, { id: string; commentId: string }>({
      query: ({ id, commentId }) => ({ url: `/api/posts/${id}/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Engagement', id }],
    }),
    getBookmarks: build.query<BlogBookmarks, void>({
      query: () => ({ url: '/api/bookmarks' }),
      providesTags: ['Bookmarks'],
    }),
    getBlogHeaders: build.query<BlogHeader[], void>({
      query: () => ({ url: '/api/blog/headers' }),
      providesTags: ['BlogHeaders'],
    }),

    // Resume builder.
    getResumeConfig: build.query<BuilderConfig, void>({
      query: () => ({ url: '/api/resumes/config' }),
      providesTags: ['ResumeConfig'],
    }),
    listResumes: build.query<{ resumes: ResumeSummary[]; cap: number | null }, void>({
      query: () => ({ url: '/api/resumes' }),
      providesTags: ['Resumes'],
    }),
    getResume: build.query<ResumeEnvelope, string>({
      query: (id) => ({ url: `/api/resumes/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Resume', id }],
      // The workspace holds the working copy; a cached older version must never reopen as the resume.
      keepUnusedDataFor: 0,
    }),
    createResume: build.mutation<ResumeEnvelope, { title: string }>({
      query: (body) => ({ url: '/api/resumes', method: 'POST', body }),
      invalidatesTags: ['Resumes'],
    }),
    saveResume: build.mutation<ResumeEnvelope, SaveResumeArg>({
      query: ({ id, title, data, structure, view, generation }) => ({
        url: `/api/resumes/${id}`,
        method: 'PUT',
        body: { title, data, ...(structure ? { structure } : {}), ...(view !== undefined ? { view } : {}), generation },
      }),
      invalidatesTags: ['Resumes'],
    }),
    deleteResume: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/api/resumes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Resumes', 'Applications'],
    }),

    // Job tracker.
    listApplications: build.query<ApplicationList, void>({
      query: () => ({ url: '/api/applications' }),
      providesTags: ['Applications'],
    }),
    getApplication: build.query<{ application: ApplicationDetail }, string>({
      query: (id) => ({ url: `/api/applications/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Application', id }],
    }),
    createApplication: build.mutation<{ application: ApplicationSummary }, ApplicationInput>({
      query: (body) => ({ url: '/api/applications', method: 'POST', body }),
      invalidatesTags: ['Applications'],
    }),
    updateApplication: build.mutation<{ application: ApplicationSummary }, { id: string; input: ApplicationInput }>({
      query: ({ id, input }) => ({ url: `/api/applications/${id}`, method: 'PUT', body: input }),
      invalidatesTags: (_r, _e, { id }) => ['Applications', { type: 'Application', id }],
    }),
    deleteApplication: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/api/applications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Applications'],
    }),
    createTailoredResume: build.mutation<CreatedResume, string>({
      query: (id) => ({ url: `/api/applications/${id}/resume`, method: 'POST' }),
      invalidatesTags: ['Applications', 'Resumes'],
    }),

    // Admin (the Firebase ID token rides along; the Cloud Functions enforce the admin role).
    listUsers: build.query<{ users: AccessUser[]; truncated: boolean }, void>({
      query: () => ({ url: '/api/admin/users', admin: true }),
      providesTags: ['Users'],
    }),
    adminSetUser: build.mutation<unknown, { email: string; action: AccessAction; role?: Role }>({
      query: (body) => ({ url: '/api/admin/users', method: 'POST', body, admin: true }),
      invalidatesTags: ['Users', 'Owners'],
    }),
    listOwners: build.query<{ owners: DataOwner[]; truncated: boolean }, void>({
      query: () => ({ url: '/api/admin/resumes', admin: true }),
      providesTags: ['Owners'],
    }),
    adminPurgeOwner: build.mutation<{ deletedObjects: number; deletedApplications: number }, { email: string; confirmEmail: string }>({
      query: (body) => ({ url: '/api/admin/resumes', method: 'POST', body, admin: true }),
      invalidatesTags: ['Owners'],
    }),
    listCmsFiles: build.query<{ files: CmsFileItem[] }, void>({
      query: () => ({ url: '/api/admin/cms', admin: true }),
      providesTags: ['CmsFiles'],
    }),
    getCmsFile: build.query<CmsFileContent, string>({
      query: (file) => ({ url: `/api/admin/cms?file=${encodeURIComponent(file)}`, admin: true }),
      providesTags: (_r, _e, file) => [{ type: 'CmsFile', id: file }],
    }),
    cmsSave: build.mutation<{ message?: string }, { file: string; content: string }>({
      query: (body) => ({ url: '/api/admin/cms', method: 'POST', body, admin: true }),
      invalidatesTags: (_r, _e, { file }) => ['CmsFiles', { type: 'CmsFile', id: file }],
    }),

    // AI actions (stubbed server side until real models exist).
    tailorResume: build.mutation<TailorResult, { data: ResumeData; jobDescription: string }>({
      query: (body) => ({ url: '/api/ai/tailor', method: 'POST', body }),
    }),
    skillMatch: build.mutation<SkillMatchResult, { data: ResumeData; jobDescription: string }>({
      query: (body) => ({ url: '/api/ai/skill-match', method: 'POST', body }),
    }),
  }),
})

export const {
  useGetSessionRoleQuery,
  useSignInMutation,
  useSignOutMutation,
  useGetBlogConfigQuery,
  useListBlogPostsQuery,
  useGetBlogPostQuery,
  useSaveBlogPostMutation,
  useDeleteBlogPostMutation,
  useUploadBlogImageMutation,
  useGetBlogHeadersQuery,
  useGetPostEngagementQuery,
  useLazyGetOlderCommentsQuery,
  useToggleLikeMutation,
  useToggleBookmarkMutation,
  useAddCommentMutation,
  useRemoveCommentMutation,
  useGetBookmarksQuery,
  useGetResumeConfigQuery,
  useListResumesQuery,
  useGetResumeQuery,
  useLazyGetResumeQuery,
  useCreateResumeMutation,
  useSaveResumeMutation,
  useDeleteResumeMutation,
  useListApplicationsQuery,
  useLazyListApplicationsQuery,
  useGetApplicationQuery,
  useLazyGetApplicationQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useCreateTailoredResumeMutation,
  useListUsersQuery,
  useAdminSetUserMutation,
  useListOwnersQuery,
  useAdminPurgeOwnerMutation,
  useListCmsFilesQuery,
  useGetCmsFileQuery,
  useCmsSaveMutation,
  useTailorResumeMutation,
  useSkillMatchMutation,
} = api
