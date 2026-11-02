'use client'

import { useEffect, useRef } from 'react'
import { useCreateResumeMutation, useDeleteResumeMutation, useGetResumeConfigQuery, useListResumesQuery } from '../../store/api.ts'
import { useAppDispatch, useAppSelector } from '../../store/hooks.ts'
import { openResume } from '../../store/resumeWorkspace.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'
import ResumeEditor from './ResumeEditor.tsx'
import ResumeList from './ResumeList.tsx'

// The builder page: the user's resumes, and the editor for the one that is open. The config and the
// list come from the store's data layer; which resume is open lives in the workspace slice.
export default function ResumeBuilder() {
  const dispatch = useAppDispatch()
  const openId = useAppSelector((state) => state.resumeWorkspace.openId)
  const configQuery = useGetResumeConfigQuery()
  const listQuery = useListResumesQuery()
  const [createResume, { isLoading: creating }] = useCreateResumeMutation()
  const [deleteResume, { isLoading: deleting }] = useDeleteResumeMutation()
  const deepLinkHandled = useRef(false)

  const config = configQuery.data
  const resumes = listQuery.data?.resumes

  // Leaving the page closes the open resume.
  useEffect(() => () => void dispatch(openResume(null)), [dispatch])

  // Deep link from the job tracker: /resume-builder?open=<id> opens that resume, once the list is known.
  useEffect(() => {
    if (deepLinkHandled.current || !resumes) return
    deepLinkHandled.current = true
    const wanted = new URLSearchParams(window.location.search).get('open')
    if (wanted && resumes.some((resume) => resume.id === wanted)) dispatch(openResume(wanted))
  }, [resumes, dispatch])

  const create = async (title: string) => {
    try {
      const { resume } = await createResume({ title }).unwrap()
      dispatch(openResume(resume.id))
    } catch {
      // Already reported by the error snackbar.
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteResume(id).unwrap()
    } catch {
      // Already reported by the error snackbar.
    }
  }

  if (configQuery.isLoading || listQuery.isLoading) return <SkeletonPage label="Loading your resumes" />
  if (!config || !resumes) {
    const failed = !config ? configQuery : listQuery
    const message = (failed.error && 'message' in failed.error ? failed.error.message : undefined) ?? 'The resume builder is unavailable.'
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          if (!config) void configQuery.refetch()
          if (!resumes) void listQuery.refetch()
        }}
      />
    )
  }

  if (openId) {
    return <ResumeEditor key={openId} id={openId} config={config} onClose={() => dispatch(openResume(null))} />
  }

  return (
    <ResumeList
      resumes={resumes}
      cap={config.cap}
      busy={creating || deleting}
      onOpen={(id) => dispatch(openResume(id))}
      onCreate={create}
      onDelete={remove}
    />
  )
}
