import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth'
import { getFirestore, doc, getDoc, collection, getDocs, type Firestore } from 'firebase/firestore'
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
let firestore: Firestore | undefined
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

export function getFirebaseFirestore(): Firestore | undefined {
  if (!firestore) {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return undefined
    }
    firestore = getFirestore(firebaseApp)
  }

  return firestore
}

/**
 * Checks whether an email address is allowed based on records stored in Firebase Firestore datastore.
 * Supports checking a document in `allowed_emails` collection or a doc ID matching normalized email.
 */
export async function isEmailAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false
  }

  const normalizedEmail = email.trim().toLowerCase()
  const db = getFirebaseFirestore()

  // If Firebase Firestore is not initialized (e.g. demo mode / missing API keys), allow access for local dev
  if (!db) {
    return true
  }

  try {
    // 1. Direct document check: `allowed_emails/{normalizedEmail}`
    const docRef = doc(db, 'allowed_emails', normalizedEmail)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data.allowed !== false) {
        return true
      }
    }

    // 2. Collection scan / lookup fallback in `allowed_emails` collection where field `email` matches
    const colRef = collection(db, 'allowed_emails')
    const colSnap = await getDocs(colRef)

    // If the collection is entirely empty in Firestore, allow all users (or demo mode)
    if (colSnap.empty) {
      return true
    }

    for (const d of colSnap.docs) {
      const data = d.data()
      const docEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
      if (d.id.toLowerCase() === normalizedEmail || docEmail === normalizedEmail) {
        if (data.allowed !== false) {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.warn('Firestore query failed when checking allowed emails:', error)
    // If Firestore rules or connection fails, default to allowing if demo or logging error
    return true
  }
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
