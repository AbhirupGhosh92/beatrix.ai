// The only way the site talks to the Cloud Functions in functions/. Server-only (importing this
// from client code fails the build), so function URLs, tokens and payloads never reach a browser.
//
// Every call is authenticated: the functions are private (Cloud Run IAM accepts only the App
// Hosting service account), so each request carries a Google-signed ID token minted for that
// identity with the official google-auth-library.
//   - Production (App Hosting): the runtime service account is picked up automatically.
//   - Local dev: set FUNCTIONS_CALLER_SERVICE_ACCOUNT to that service account's email (your gcloud
//     user must be allowed to impersonate it), or point GOOGLE_APPLICATION_CREDENTIALS at its key.
import 'server-only'
import { GoogleAuth, Impersonated } from 'google-auth-library'

const REGION = 'us-central1'
const TIMEOUT_MS = 10_000

export class CloudFunctionError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })

function functionUrl(name: string): string {
  const project =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT
  if (!project) throw new Error('Firebase project id is not configured (NEXT_PUBLIC_FIREBASE_PROJECT_ID).')
  return `https://${REGION}-${project}.cloudfunctions.net/${name}`
}

// Google ID tokens last an hour; reuse one per function until shortly before it expires, since the
// proxy calls a function on every protected request.
const TOKEN_REUSE_MS = 50 * 60 * 1000
const tokenCache = new Map<string, { headers: Record<string, string>; expiresAt: number }>()
// Concurrent requests that find the token expired share one mint instead of each minting their own.
const pendingTokens = new Map<string, Promise<Record<string, string>>>()

async function authHeaders(audience: string): Promise<Record<string, string>> {
  const cached = tokenCache.get(audience)
  if (cached && cached.expiresAt > Date.now()) return cached.headers

  let pending = pendingTokens.get(audience)
  if (!pending) {
    pending = mintAuthHeaders(audience)
      .then((headers) => {
        tokenCache.set(audience, { headers, expiresAt: Date.now() + TOKEN_REUSE_MS })
        return headers
      })
      .finally(() => pendingTokens.delete(audience))
    pendingTokens.set(audience, pending)
  }
  return pending
}

async function mintAuthHeaders(audience: string): Promise<Record<string, string>> {
  const target = process.env.FUNCTIONS_CALLER_SERVICE_ACCOUNT
  if (target) {
    const impersonated = new Impersonated({
      sourceClient: await auth.getClient(),
      targetPrincipal: target,
      targetScopes: ['https://www.googleapis.com/auth/cloud-platform'],
      lifetime: 3600,
      delegates: [],
    })
    return { Authorization: `Bearer ${await impersonated.fetchIdToken(audience)}` }
  }
  const headers = await (await auth.getIdTokenClient(audience)).getRequestHeaders(audience)
  return { Authorization: headers.get('authorization') ?? '' }
}

/** POSTs `body` as JSON to the named Cloud Function with a service identity token. */
export async function callCloudFunction<Response>(name: string, body: object = {}): Promise<Response> {
  const url = functionUrl(name)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders(url)) },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  const data = await res.json().catch(() => undefined)
  if (!res.ok) {
    const message: string | undefined = data?.error?.message
    // Functions answer {error: {message}}. Anything else (e.g. the IAM 401/403 page) is a
    // server-side misconfiguration, not the caller's fault, so report it as a bad gateway.
    if (message) throw new CloudFunctionError(res.status, message)
    throw new CloudFunctionError(502, `Cloud function ${name} is unavailable (HTTP ${res.status}).`)
  }
  if (data === undefined) {
    throw new CloudFunctionError(502, `Cloud function ${name} returned an invalid or empty response.`)
  }
  return data as Response
}
