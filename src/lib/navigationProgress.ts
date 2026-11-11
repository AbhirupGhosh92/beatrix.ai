// Client-only flag for "a page navigation is in progress". It is transient visual state
// (like hover flags), so it lives outside Redux. Read it with useSyncExternalStore.

/** A navigation that never reports completion must not leave the loader on screen. */
export const NAVIGATION_TIMEOUT_MS = 15_000

let navigating = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function setNavigating(value: boolean) {
  if (navigating === value) return
  navigating = value
  emit()
}

/** Marks a navigation as started. Call it before any programmatic `router.push`. */
export function startNavigation() {
  clearTimeout(timer)
  timer = setTimeout(finishNavigation, NAVIGATION_TIMEOUT_MS)
  setNavigating(true)
}

/** Marks the navigation as finished (the destination is shown, or it was abandoned). */
export function finishNavigation() {
  clearTimeout(timer)
  timer = undefined
  setNavigating(false)
}

export function subscribeNavigation(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNavigating() {
  return navigating
}

export function getServerNavigating() {
  return false
}
