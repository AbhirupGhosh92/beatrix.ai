'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useGetBlogConfigQuery, useListBlogPostsQuery } from '../../store/api.ts'
import { ErrorState, SkeletonPage } from '../ui/Skeleton.tsx'
import BlogEditor from './BlogEditor.tsx'
import BlogList from './BlogList.tsx'

/** `null` shows the list, `'new'` a blank editor, anything else the post with that id. */
type Editing = string | 'new' | null

// The blog page: the author's posts, and the editor for the one that is open (?open=<id> deep link).
export default function BlogPage() {
  // ?open=<id> deep link, read with Next's hook (the same value on server and client) and used only
  // to seed local state, so opening, closing and "New post" keep working without a navigation.
  const initialId = useSearchParams().get('open')
  const [editing, setEditing] = useState<Editing>(initialId)
  const [showAll, setShowAll] = useState(false)
  const configQuery = useGetBlogConfigQuery()
  const listQuery = useListBlogPostsQuery({ all: showAll })

  const config = configQuery.data
  const list = listQuery.data

  if (configQuery.isLoading || (listQuery.isLoading && !list)) return <SkeletonPage label="Loading your posts" />
  if (!config || !list) {
    const failed = !config ? configQuery : listQuery
    const message = (failed.error && 'message' in failed.error ? failed.error.message : undefined) ?? 'The blog is unavailable.'
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          if (!config) void configQuery.refetch()
          if (!list) void listQuery.refetch()
        }}
      />
    )
  }

  if (editing) {
    return (
      <BlogEditor
        key={editing}
        id={editing === 'new' ? null : editing}
        config={config}
        onOpen={(id) => setEditing(id)}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <BlogList
      posts={list.posts}
      canSeeAll={list.canSeeAll || config.isAdmin}
      showAll={showAll}
      onToggleAll={setShowAll}
      onOpen={setEditing}
      onNew={() => setEditing('new')}
    />
  )
}
