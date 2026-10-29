'use client'

import { useEffect } from 'react'
import { initAnalytics, initRemoteConfig } from '../../lib/firebase.ts'

export default function FirebaseInit() {
  useEffect(() => {
    void initAnalytics()
    void initRemoteConfig()
  }, [])

  return null
}
