'use client'

import { useState } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '../../lib/firebase.ts'
import { useSignInMutation } from '../../store/api.ts'
import type { ApiError } from '../../store/api.ts'

function GoogleIcon() {
  return (
    <svg className="gsi-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  )
}

interface Props {
  signInLabel: string
  signingInLabel: string
  /** `{email}` is replaced by the account's address. */
  restrictedError: string
  unknownEmail: string
  failedError: string
}

/**
 * The Google sign-in button: opens the popup, then asks the server to check the allow list and set the
 * session cookie (the store refreshes the role on success; a failure also raises an error snackbar).
 */
export default function GoogleSignIn({ signInLabel, signingInLabel, restrictedError, unknownEmail, failedError }: Props) {
  const [signInServer] = useSignInMutation()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    setLoginError(null)

    const auth = getFirebaseAuth()
    if (!auth) {
      setLoginError(failedError)
      setIsLoggingIn(false)
      return
    }

    try {
      const credential = await signInWithPopup(auth, getGoogleProvider())
      const user = credential.user
      try {
        await signInServer({ idToken: await user.getIdToken() }).unwrap()
      } catch (failure) {
        await signOut(auth)
        const { status, message } = failure as ApiError
        setLoginError(
          status === 403 ? restrictedError.replace('{email}', user.email || unknownEmail) : message || failedError,
        )
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : failedError)
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <>
      {loginError && <div className="mb-4 text-xs text-error font-medium">{loginError}</div>}
      <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="gsi-button">
        {isLoggingIn ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            {signingInLabel}
          </>
        ) : (
          <>
            <GoogleIcon />
            {signInLabel}
          </>
        )}
      </button>
    </>
  )
}
