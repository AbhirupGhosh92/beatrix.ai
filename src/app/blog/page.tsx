import { Suspense } from 'react'
import BlogPage from '../../components/blog/BlogPage.tsx'
import { SkeletonPage } from '../../components/ui/Skeleton.tsx'

export default function Blog() {
  // useSearchParams in BlogPage needs a Suspense boundary if the page is ever prerendered.
  return (
    <Suspense fallback={<SkeletonPage label="Loading your posts" />}>
      <BlogPage />
    </Suspense>
  )
}
