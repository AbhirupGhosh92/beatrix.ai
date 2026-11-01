// The browser's calls to this site's own /api/ai routes. The server forwards them to the private AI
// service; nothing here knows its address. Until real models exist results carry `stub: true`.
import type { ResumeData } from './resumeValidation.ts'

export class AiApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface TailorResult {
  stub?: boolean
  data: ResumeData
}

export interface SkillMatchResult {
  stub?: boolean
  matchPercent: number
  matched: string[]
  missing: string[]
}

async function post<T>(action: string, data: ResumeData, jobDescription: string): Promise<T> {
  const res = await fetch(`/api/ai/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, jobDescription }),
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new AiApiError(res.status, body.error || `Request failed (${res.status}).`)
  return body as T
}

export const aiApi = {
  tailor: (data: ResumeData, jobDescription: string) => post<TailorResult>('tailor', data, jobDescription),
  skillMatch: (data: ResumeData, jobDescription: string) => post<SkillMatchResult>('skill-match', data, jobDescription),
}
