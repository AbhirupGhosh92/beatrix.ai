import { cache } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlogContent from '../../../components/blog/BlogContent.tsx'
import { getBlogConfig } from '../../../middleware/blogConfigService.ts'
import { getPublicBlogPost } from '../../../middleware/blogService.ts'
import { getProfile } from '../../../middleware/profileService.ts'

// A published post, server rendered for everyone (the proxy lets only /posts/<id> through without a
// session). 404 while the blog is off and for a draft, deleted or unknown post. The cache() below shares
// the one fetch between the metadata and the page.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const load = cache(async (id: string) => {
  if (!(await getBlogConfig()).enabled) return null
  try {
    return await getPublicBlogPost(id)
  } catch (err) {
    console.error('public blog post failed:', err)
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load((await params).id)
  return post ? { title: post.title, description: post.excerpt } : {}
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const [post, profile] = await Promise.all([load(id), getProfile()])
  if (!post) notFound()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 edge-b bg-base-100/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center px-3 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold hover-subtle">
            {profile.person.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-10 sm:px-6 lg:px-8">
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <h1 className="break-words text-3xl font-bold sm:text-4xl">{post.title}</h1>
            <p className="text-meta">
              {post.authorName} ·{' '}
              <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('en-US')}</time>
            </p>
            {post.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag} className="blog-tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </header>
          <BlogContent
            format={post.format}
            body={post.body}
            content={post.content}
            imageUrl={(imageId) => `/api/posts/${post.id}/images/${imageId}`}
          />
        </article>
      </main>
    </div>
  )
}
