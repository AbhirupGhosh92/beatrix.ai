// The only way the site talks to the private AI service in ai_backend/ (Cloud Run). Server-only, so
// the service URL, token and payloads never reach a browser. Calls carry a Google ID token for the
// site's service identity (the same mechanism as cloudFunctions.ts); only that account may invoke
// the service. Until real models exist the service answers with fixed results marked `stub: true`.
import 'server-only'
import { authHeaders } from './cloudFunctions.ts'

const TIMEOUT_MS = 20_000

export const AI_ACTIONS = ['tailor', 'skill-match'] as const
export type AiAction = (typeof AI_ACTIONS)[number]

export class AiServiceError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface AiRequest {
  /** The open resume's data. */
  data: Record<string, unknown>
  jobDescription: string
}

export interface TailorResult {
  stub?: boolean
  data: Record<string, unknown>
}

export interface SkillMatchResult {
  stub?: boolean
  matchPercent: number
  matched: string[]
  missing: string[]
}

const isAction = (value: string): value is AiAction => (AI_ACTIONS as readonly string[]).includes(value)
export { isAction }

/** Calls one AI route. Throws AiServiceError (503 when unconfigured, 502 on any service failure). */
export async function callAi<Result>(action: AiAction, body: AiRequest): Promise<Result> {
  const base = process.env.AI_BACKEND_URL?.replace(/\/+$/, '')
  if (!base) throw new AiServiceError(503, 'The AI service is not configured for this environment.')
  try {
    const res = await fetch(`${base}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders(base)) },
      body: JSON.stringify({ data: body.data, jobDescription: body.jobDescription }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new AiServiceError(502, `The AI service is unavailable (HTTP ${res.status}).`)
    return (await res.json()) as Result
  } catch (err) {
    if (err instanceof AiServiceError) throw err
    throw new AiServiceError(502, 'The AI service could not be reached.')
  }
}
