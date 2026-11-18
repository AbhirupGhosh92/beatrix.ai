'use client'

import { createContext, useContext, useMemo } from 'react'
import type { PublicBlogConfig } from '../../data/blogConfig.ts'
import type { DrawerContext } from '../../lib/drawer.ts'

const BlogConfigContext = createContext<PublicBlogConfig | null>(null)

/** Hands the public subset of blog-config.json (fetched in the root layout) to client components. */
export function BlogConfigProvider({ config, children }: { config: PublicBlogConfig; children: React.ReactNode }) {
  return <BlogConfigContext.Provider value={config}>{children}</BlogConfigContext.Provider>
}

export function useBlogConfig(): PublicBlogConfig {
  const config = useContext(BlogConfigContext)
  if (!config) throw new Error('useBlogConfig must be used inside <BlogConfigProvider>')
  return config
}

/** The context the drawer and menus pass to `visibleDrawerItems` and friends. */
export function useBlogAccess(): DrawerContext {
  const { enabled, writeRoles } = useBlogConfig()
  return useMemo(() => ({ blogEnabled: enabled, blogWriteRoles: writeRoles }), [enabled, writeRoles])
}
