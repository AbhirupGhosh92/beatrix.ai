import type { Monaco } from '@monaco-editor/react'

/** Names of the Monaco themes defined by `defineMonacoThemes`. */
export const MONACO_DARK_THEME = 'beatrix-dark-theme'
export const MONACO_LIGHT_THEME = 'beatrix-light-theme'

type Mode = 'dark' | 'light'

const TOKENS = {
  bg: '--code-bg',
  fg: '--code-fg',
  lineHighlight: '--code-line-highlight',
  cursor: '--code-cursor',
  whitespace: '--code-whitespace',
  lineNumber: '--code-line-number',
  lineNumberActive: '--code-line-number-active',
  key: '--code-key',
  string: '--code-string',
  number: '--code-number',
  keyword: '--code-keyword',
} as const

type TokenName = keyof typeof TOKENS

/**
 * Monaco themes only accept concrete colors, not CSS variables, so read the code
 * palette (styles/tokens/code.css) from a hidden probe element carrying the
 * theme's data-theme. That yields both palettes whichever theme is active.
 */
function readTokens(mode: Mode): Partial<Record<TokenName, string>> {
  const probe = document.createElement('div')
  probe.hidden = true
  probe.setAttribute('data-theme', mode === 'dark' ? 'beatrix-dark' : 'beatrix-light')
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const out: Partial<Record<TokenName, string>> = {}
  for (const name of Object.keys(TOKENS) as TokenName[]) {
    const raw = style.getPropertyValue(TOKENS[name]).trim()
    const hex = raw && toHex(raw)
    if (hex) out[name] = hex
  }
  probe.remove()
  return out
}

/** Normalises any CSS color (hex, oklch, var results, ...) to #rrggbb for Monaco. */
function toHex(color: string): string | undefined {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase()
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return undefined
  ctx.fillStyle = '#000000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function defineTheme(monaco: Monaco, name: string, mode: Mode) {
  const t = readTokens(mode)
  const fg = (hex?: string) => hex?.slice(1)
  const colors: Record<string, string> = {}
  const set = (key: string, value?: string) => {
    if (value) colors[key] = value
  }
  set('editor.background', t.bg)
  set('editor.foreground', t.fg)
  set('editor.lineHighlightBackground', t.lineHighlight)
  set('editorCursor.foreground', t.cursor)
  set('editorWhitespace.foreground', t.whitespace)
  set('editorLineNumber.foreground', t.lineNumber)
  set('editorLineNumber.activeForeground', t.lineNumberActive)

  monaco.editor.defineTheme(name, {
    base: mode === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: fg(t.key), fontStyle: 'bold' },
      { token: 'string.value.json', foreground: fg(t.string) },
      { token: 'number', foreground: fg(t.number) },
      { token: 'keyword.json', foreground: fg(t.keyword) },
    ],
    colors,
  })
}

/**
 * Defines both Monaco themes from the code palette. Call it before the editor is
 * created (the `theme` prop is applied at creation and an undefined name falls
 * back to white `vs`) and again after a palette change.
 */
export function defineMonacoThemes(monaco: Monaco) {
  defineTheme(monaco, MONACO_DARK_THEME, 'dark')
  defineTheme(monaco, MONACO_LIGHT_THEME, 'light')
}
