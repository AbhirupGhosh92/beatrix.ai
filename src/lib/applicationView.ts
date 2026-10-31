// What the job tracker table shows: search, filter and sort over the applications already loaded
// in the browser (the list is bounded by the safety limit, so no server query is needed).
import type { TrackerStatus } from '../data/resumeConfig.ts'
import type { ApplicationSummary } from './applicationTypes.ts'

export type SortKey = 'company' | 'role' | 'status' | 'appliedAt'
export type SortDir = 'asc' | 'desc'

export interface ViewState {
  search: string
  /** A status id, or '' for all. */
  status: string
  /** Selected labels; an application must have every one of them. */
  labels: string[]
  sort: { key: SortKey; dir: SortDir }
}

export const DEFAULT_VIEW: ViewState = { search: '', status: '', labels: [], sort: { key: 'appliedAt', dir: 'desc' } }

/** Same rule as the server: trimmed, single spaces, lowercase. */
export const normalizeLabel = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

/** Every distinct label in the list, sorted; these are the suggestions and the filter choices. */
export function allLabels(list: readonly ApplicationSummary[]): string[] {
  return [...new Set(list.flatMap((a) => a.labels))].sort()
}

/** Search terms must all appear (in any order) in the company, role, notes or labels. */
export function matchesSearch(a: ApplicationSummary, search: string): boolean {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = [a.company, a.role, a.notes, ...a.labels].join('\n').toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function filterApplications(list: readonly ApplicationSummary[], view: ViewState): ApplicationSummary[] {
  return list.filter(
    (a) =>
      (view.status === '' || a.status === view.status) &&
      view.labels.every((label) => a.labels.includes(label)) &&
      matchesSearch(a, view.search),
  )
}

/** Orders by one column; ties fall back to the newest applied date so the order is stable. */
export function sortApplications(
  list: readonly ApplicationSummary[],
  sort: ViewState['sort'],
  statuses: readonly TrackerStatus[],
): ApplicationSummary[] {
  const rank = (id: string) => {
    const index = statuses.findIndex((s) => s.id === id)
    return index === -1 ? statuses.length : index
  }
  const compare = (a: ApplicationSummary, b: ApplicationSummary): number => {
    switch (sort.key) {
      case 'company':
        return a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
      case 'role':
        return a.role.localeCompare(b.role, undefined, { sensitivity: 'base' })
      case 'status':
        return rank(a.status) - rank(b.status)
      case 'appliedAt':
        return a.appliedAt.localeCompare(b.appliedAt)
    }
  }
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...list].sort(
    (a, b) => sign * compare(a, b) || b.appliedAt.localeCompare(a.appliedAt) || b.createdAt.localeCompare(a.createdAt),
  )
}

export const viewApplications = (list: readonly ApplicationSummary[], view: ViewState, statuses: readonly TrackerStatus[]) =>
  sortApplications(filterApplications(list, view), view.sort, statuses)

/** Clicking the active column reverses it; a new column starts ascending (dates start newest first). */
export function nextSort(current: ViewState['sort'], key: SortKey): ViewState['sort'] {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: key === 'appliedAt' ? 'desc' : 'asc' }
}
