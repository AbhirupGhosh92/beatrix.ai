'use client'


import { useEffect, useRef } from 'react'
import { Cat, Cpu } from 'lucide-react'
import { useProfile } from './ProfileProvider.tsx'

// daisyUI theme controller as a single toggle button: while the checkbox is
// checked, the page uses its `value` theme (pure CSS, via :has() on <html>);
// unchecked falls back to the default (light) theme. The dark theme has no
// `prefersdark` flag, so the initial state is decided here: the saved choice in
// localStorage, else the OS preference. The same logic runs in an inline script
// in app/layout.tsx (setting data-theme) so the first paint has no flash; it is
// removed once this component mounts and the controller takes over.
const STORAGE_KEY = 'theme'
const DARK = 'beatrix-dark'
const LIGHT = 'beatrix-light'

function getInitialTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === DARK || stored === LIGHT) return stored
  } catch {
    // storage unavailable; fall through to the OS preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT
}

export function ThemeToggle() {
  const profile = useProfile()
  const inputRef = useRef<HTMLInputElement>(null)

  // Server markup is unchecked (no window); sync the checkbox with the saved or
  // OS theme on mount, then drop the pre-paint data-theme so the controller wins.
  useEffect(() => {
    const input = inputRef.current
    if (input) input.checked = getInitialTheme() === DARK
    document.documentElement.removeAttribute('data-theme')
    // Setting `checked` fires no event; tell listeners (e.g. the admin JSON editor).
    input?.dispatchEvent(new Event('change', { bubbles: true }))
  }, [])

  return (
    <label className="button-secondary btn-square swap swap-rotate">
      <input
        type="checkbox"
        value={DARK}
        className="theme-controller"
        aria-label={profile.nav.toggleThemeLabel}
        ref={inputRef}
        onChange={(e) => {
          try {
            localStorage.setItem(STORAGE_KEY, e.target.checked ? DARK : LIGHT)
          } catch {
            // ignore persistence failures
          }
        }}
      />
      {/* icon matches the active theme: cyberpunk chip in dark, cute cat in light */}
      <Cpu size={20} className="swap-on" aria-hidden="true" />
      <Cat size={20} className="swap-off" aria-hidden="true" />
    </label>
  )
}
