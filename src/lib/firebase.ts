import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics'
import { getRemoteConfig, fetchAndActivate, type RemoteConfig } from 'firebase/remote-config'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let analytics: Analytics | undefined
let remoteConfig: RemoteConfig | undefined

export function getFirebaseApp(): FirebaseApp | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (!firebaseConfig.apiKey) {
    return undefined
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }

  return app
}

export async function initAnalytics(): Promise<Analytics | undefined> {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    return undefined
  }

  if (analytics) {
    return analytics
  }

  const supported = await isAnalyticsSupported()
  if (supported) {
    analytics = getAnalytics(firebaseApp)
    return analytics
  }

  return undefined
}

export async function initRemoteConfig(): Promise<RemoteConfig | undefined> {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    return undefined
  }

  if (remoteConfig) {
    return remoteConfig
  }

  try {
    remoteConfig = getRemoteConfig(firebaseApp)
    remoteConfig.settings.minimumFetchIntervalMillis =
      process.env.NODE_ENV === 'development' ? 10000 : 3600000
    await fetchAndActivate(remoteConfig)
    return remoteConfig
  } catch (error) {
    console.warn('Firebase Remote Config failed to fetch or activate:', error)
    return remoteConfig
  }
}
