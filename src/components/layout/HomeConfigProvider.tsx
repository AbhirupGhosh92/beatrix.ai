'use client'

import { createContext, useContext } from 'react'
import type { HomeConfig } from '../../data/homeConfig.ts'

const HomeConfigContext = createContext<HomeConfig | null>(null)

/** Hands the runtime-loaded landing page config (fetched in the root layout) to client components. */
export function HomeConfigProvider({ config, children }: { config: HomeConfig; children: React.ReactNode }) {
  return <HomeConfigContext.Provider value={config}>{children}</HomeConfigContext.Provider>
}

export function useHomeConfig(): HomeConfig {
  const config = useContext(HomeConfigContext)
  if (!config) throw new Error('useHomeConfig must be used inside <HomeConfigProvider>')
  return config
}
