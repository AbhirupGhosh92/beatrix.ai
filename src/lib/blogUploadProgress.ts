// A client-only store for the progress of image uploads, keyed by a serializable upload id (never
// Redux: progress ticks many times a second and a File or function in an action would trip the
// serializable check). The upload endpoint in store/api.ts writes it; the editor's UploadStatus reads it.

export interface UploadProgress {
  loaded: number
  total: number
}

const progress = new Map<string, UploadProgress>()
const listeners = new Set<() => void>()
let version = 0

const emit = () => {
  version += 1
  for (const listener of listeners) listener()
}

export function setUploadProgress(uploadId: string, loaded: number, total: number): void {
  progress.set(uploadId, { loaded, total })
  emit()
}

export function clearUploadProgress(uploadId: string): void {
  if (progress.delete(uploadId)) emit()
}

export function getUploadProgress(uploadId: string): UploadProgress | undefined {
  return progress.get(uploadId)
}

export function subscribeUploadProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Changes on every update; a stable snapshot for useSyncExternalStore. */
export const getUploadProgressVersion = (): number => version
