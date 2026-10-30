// The browser's calls to this site's own /api/resumes routes (the session cookie is sent
// automatically). Errors carry the HTTP status so the UI can tell a stale save (409) from the rest.
import type { BuilderConfig, Resume, ResumeEnvelope, ResumeSummary } from './resumeTypes.ts'
import type { ResumeData, Structure } from './resumeValidation.ts'

export class ResumeApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, init: { method?: string; body?: object } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ResumeApiError(res.status, data.error || `Request failed (${res.status}).`)
  return data as T
}

export const resumeApi = {
  config: () => request<BuilderConfig>('/api/resumes/config'),
  list: () => request<{ resumes: ResumeSummary[]; cap: number | null }>('/api/resumes'),
  create: (title: string) => request<ResumeEnvelope>('/api/resumes', { method: 'POST', body: { title } }),
  get: (id: string) => request<ResumeEnvelope>(`/api/resumes/${id}`),
  save: (id: string, input: { title: string; data: ResumeData; structure?: Structure; generation: string }) =>
    request<ResumeEnvelope>(`/api/resumes/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<{ success: boolean }>(`/api/resumes/${id}`, { method: 'DELETE' }),
}

export type { Resume }
