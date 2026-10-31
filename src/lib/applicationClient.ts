// The browser's calls to this site's own /api/applications routes (the session cookie is sent
// automatically). Errors carry the HTTP status so the UI can tell a full cap (409) from the rest.
import type {
  ApplicationDetail,
  ApplicationInput,
  ApplicationList,
  ApplicationSummary,
  CreatedResume,
} from './applicationTypes.ts'

export class ApplicationApiError extends Error {
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
  if (!res.ok) throw new ApplicationApiError(res.status, data.error || `Request failed (${res.status}).`)
  return data as T
}

export const applicationApi = {
  list: () => request<ApplicationList>('/api/applications'),
  get: (id: string) => request<{ application: ApplicationDetail }>(`/api/applications/${id}`),
  create: (input: ApplicationInput) =>
    request<{ application: ApplicationSummary }>('/api/applications', { method: 'POST', body: input }),
  update: (id: string, input: ApplicationInput) =>
    request<{ application: ApplicationSummary }>(`/api/applications/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<{ success: boolean }>(`/api/applications/${id}`, { method: 'DELETE' }),
  createResume: (id: string) => request<CreatedResume>(`/api/applications/${id}/resume`, { method: 'POST' }),
}
