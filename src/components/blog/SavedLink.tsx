'use client'

import Link from 'next/link'
import { useGetSessionRoleQuery } from '../../store/api.ts'

// Link to the viewer's saved posts, shown to signed-in viewers only.
export default function SavedLink() {
  const { data: role } = useGetSessionRoleQuery()
  if (!role) return null
  return (
    <Link href="/bookmarks" className="text-meta hover-subtle">
      Saved
    </Link>
  )
}
