'use client'

import { createContext, useContext } from 'react'
import type { Profile } from '../../data/profile.ts'

const ProfileContext = createContext<Profile | null>(null)

/** Hands the runtime-loaded profile (fetched in the root layout) to client components. */
export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
}

export function useProfile(): Profile {
  const profile = useContext(ProfileContext)
  if (!profile) throw new Error('useProfile must be used inside <ProfileProvider>')
  return profile
}
