'use client'

import Link from 'next/link'
import { useBlogConfig } from '../layout/BlogConfigProvider.tsx'
import { useGetBlogHeadersQuery } from '../../store/api.ts'
import { Reveal, Stagger, StaggerItem } from '../ui/motion.tsx'

/**
 * A random sample of published blog headers for anonymous visitors. Renders nothing while the blog is
 * off, while loading, when the request failed or when there is no published post (never an error).
 */
export default function LandingBlog() {
  const { enabled, home } = useBlogConfig()
  const { data } = useGetBlogHeadersQuery(undefined, { skip: !enabled, refetchOnMountOrArgChange: true })
  if (!enabled || !data || data.length === 0) return null
  return (
    <section className="mx-auto w-full max-w-screen-2xl px-3 py-12 sm:px-6 lg:px-8">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-2 text-center">
        <h2 className="heading-display text-2xl sm:text-3xl">{home.heading}</h2>
        <p className="text-muted">{home.intro}</p>
      </Reveal>
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((post) => (
          <StaggerItem key={post.id} className="h-full">
            <article className="blog-card flex h-full flex-col gap-3">
              <p className="text-meta">
                {post.authorName} ·{' '}
                <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString()}</time>
              </p>
              <h3 className="break-words text-lg font-semibold">
                <Link href={`/posts/${post.id}`} className="blog-card-link">
                  {post.title}
                </Link>
              </h3>
              <p className="text-muted break-words">{post.excerpt}</p>
              {post.tags.length > 0 && (
                <ul className="mt-auto flex flex-wrap gap-1" aria-label="Tags">
                  {post.tags.map((tag) => (
                    <li key={tag} className="blog-tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
