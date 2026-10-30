import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth'
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
let auth: Auth | undefined
let googleProvider: GoogleAuthProvider | undefined
let analyticsPromise: Promise<Analytics | undefined> | undefined
let remoteConfigPromise: Promise<RemoteConfig | undefined> | undefined

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

export function getFirebaseAuth(): Auth | undefined {
  if (!auth) {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return undefined
    }
    auth = getAuth(firebaseApp)
    // Ensure persistence is set to browser local persistence so sessions persist after browser restarts
    void setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Failed to set Firebase Auth persistence:', err)
    })
  }

  return auth
}

/** Fresh ID token of the signed-in user (waits for the persisted session to restore), if any. */
export async function getIdToken(): Promise<string | undefined> {
  const firebaseAuth = getFirebaseAuth()
  if (!firebaseAuth) return undefined
  await firebaseAuth.authStateReady()
  return firebaseAuth.currentUser?.getIdToken()
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider()
  }

  return googleProvider
}

export async function initAnalytics(): Promise<Analytics | undefined> {
  if (analyticsPromise) {
    return analyticsPromise
  }

  analyticsPromise = (async () => {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return undefined
    }

    try {
      const supported = await isAnalyticsSupported()
      if (supported) {
        return getAnalytics(firebaseApp)
      }
    } catch (error) {
      console.warn('Firebase Analytics initialization failed:', error)
    }

    return undefined
  })()

  return analyticsPromise
}

export async function initRemoteConfig(): Promise<RemoteConfig | undefined> {
  if (remoteConfigPromise) {
    return remoteConfigPromise
  }

  remoteConfigPromise = (async () => {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return undefined
    }

    try {
      const rc = getRemoteConfig(firebaseApp)
      rc.settings.minimumFetchIntervalMillis =
        process.env.NODE_ENV === 'development' ? 10000 : 3600000
      await fetchAndActivate(rc)
      return rc
    } catch (error) {
      console.warn('Firebase Remote Config failed to fetch or activate:', error)
      return undefined
    }
  })()

  return remoteConfigPromise
}
