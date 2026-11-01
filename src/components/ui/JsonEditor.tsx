'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Editor, { type BeforeMount, type Monaco } from '@monaco-editor/react'
import JsonView from '@uiw/react-json-view'
import { defineMonacoThemes, MONACO_DARK_THEME, MONACO_LIGHT_THEME } from '../../styles/vendor/monaco.ts'
import { Code, GitFork, Maximize2, Minimize2, Search, MinusSquare, PlusSquare } from 'lucide-react'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  /** Editor height in pixels; the CMS page uses the default. */
  height?: number
  /** Accessible name of the whole editor. */
  label?: string
}

export function JsonEditor({ value, onChange, readOnly = false, height = 500, label }: JsonEditorProps) {
  const [viewMode, setViewMode] = useState<'code' | 'tree'>('code')
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false)
  const monacoRef = useRef<Monaco | null>(null)
  const [treeSearch, setTreeSearch] = useState<string>('')
  const [collapsedDepth, setCollapsedDepth] = useState<number | boolean>(1)
  const [full, setFull] = useState(false)

  // Full screen: Escape leaves it, and the page behind does not scroll meanwhile.
  useEffect(() => {
    if (!full) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFull(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [full])

  // Detect dark vs light theme based on document attribute or class
  useEffect(() => {
    const updateTheme = (e?: Event) => {
      // The document-level listener sees every input; only theme toggles matter.
      if (e?.type === 'change' && !(e.target instanceof Element && e.target.matches('.theme-controller'))) {
        return
      }
      // beatrix-dark sets `color-scheme: dark`, which daisyUI applies on :root
      // for both data-theme and the :has() theme controller, so it is the most
      // reliable signal.
      const isDark =
        getComputedStyle(document.documentElement).getPropertyValue('color-scheme').includes('dark') ||
        document.documentElement.getAttribute('data-theme') === 'beatrix-dark' ||
        !!document.querySelector('input.theme-controller[value="beatrix-dark"]:checked')
      setIsDarkTheme(isDark)
    }

    updateTheme()

    const observer = new MutationObserver(() => updateTheme())
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
      subtree: true,
    })

    // Delegated, so a toggle mounted after this editor is still heard
    // (ThemeToggle dispatches 'change' after syncing its initial state).
    document.addEventListener('change', updateTheme)

    return () => {
      observer.disconnect()
      document.removeEventListener('change', updateTheme)
    }
  }, [])

  // Define the themes before the editor is created: the `theme` prop is applied at
  // creation, and an undefined theme name falls back to white `vs`.
  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco
    defineMonacoThemes(monaco)
  }

  // Re-read the code palette when the theme flips, so token changes reach the editor.
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    defineMonacoThemes(monaco)
    monaco.editor.setTheme(isDarkTheme ? MONACO_DARK_THEME : MONACO_LIGHT_THEME)
  }, [isDarkTheme])

  // Parse JSON for tree view
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }, [value])

  const editor = (
    <div role="group" aria-label={label} className={`flex flex-col w-full border border-base-300 rounded-xl overflow-hidden bg-base-100 ${full ? 'flex-1 min-h-0' : 'h-full'}`}>
      {/* Editor Sub-Header / Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-base-200 border-b border-base-300 text-xs">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-base-300/60 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`btn btn-xs gap-1.5 ${
              viewMode === 'code' ? 'btn-primary font-bold shadow-sm' : 'btn-ghost text-base-content/70'
            }`}
          >
            <Code size={13} />
            Code Editor
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            disabled={parsedJson === null}
            className={`btn btn-xs gap-1.5 ${
              viewMode === 'tree' ? 'btn-primary font-bold shadow-sm' : 'btn-ghost text-base-content/70'
            }`}
            title={parsedJson === null ? 'Tree view requires valid JSON' : 'Switch to Tree View'}
          >
            <GitFork size={13} />
            Tree View
          </button>
        </div>

        {/* Tree View Controls (Search & Collapse) */}
        {viewMode === 'tree' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2 text-base-content/50" />
              <input
                type="text"
                placeholder="Search keys/values..."
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="input input-xs input-bordered pl-7 pr-2 font-mono text-xs w-36 focus:w-48 transition-all"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCollapsedDepth(1)}
                className="btn btn-ghost btn-xs gap-1"
                title="Collapse all top-level nodes"
              >
                <MinusSquare size={13} />
                Collapse
              </button>
              <button
                type="button"
                onClick={() => setCollapsedDepth(false)}
                className="btn btn-ghost btn-xs gap-1"
                title="Expand all nodes"
              >
                <PlusSquare size={13} />
                Expand
              </button>
            </div>
          </div>
        )}

        {/* Info hint */}
        <div className="text-muted font-mono hidden sm:block">
          {viewMode === 'code' ? 'Press Ctrl+F to Search / Replace' : 'Interactive JSON Tree'}
        </div>

        <button
          type="button"
          onClick={() => setFull((on) => !on)}
          className="btn btn-ghost btn-xs gap-1"
          aria-pressed={full}
          title={full ? 'Exit full screen (Esc)' : 'Edit in full screen'}
        >
          {full ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>

      {/* Editor Main Content Container */}
      <div className={`relative flex-1 w-full ${full ? 'min-h-0' : ''}`} style={full ? undefined : { minHeight: height }}>
        {viewMode === 'code' ? (
          <Editor
            height={full ? '100%' : `${height}px`}
            defaultLanguage="json"
            language="json"
            value={value}
            onChange={(val) => onChange(val ?? '')}
            beforeMount={handleBeforeMount}
            theme={isDarkTheme ? MONACO_DARK_THEME : MONACO_LIGHT_THEME}
            options={{
              readOnly,
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              folding: true,
              foldingHighlight: true,
              foldingStrategy: 'auto',
              showFoldingControls: 'always',
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="p-4 h-full overflow-auto bg-base-100 font-mono text-sm" style={full ? undefined : { minHeight: height }}>
            {parsedJson !== null ? (
              <JsonView
                value={parsedJson}
                collapsed={collapsedDepth}
                shortenTextAfterLength={100}
                displayDataTypes={true}
                displayObjectSize={true}
                highlightUpdates={true}
                keyName={treeSearch ? treeSearch : undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-error font-sans">
                Cannot display Tree View: JSON contains syntax errors.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Full screen is a portal to <body>, so no transformed ancestor (a modal box) can shrink it.
  if (!full) return editor
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label ? `${label} (full screen)` : 'JSON editor (full screen)'} className="fixed inset-0 z-[1000] flex flex-col bg-base-100 p-2 sm:p-4">
      {editor}
    </div>,
    document.body,
  )
}
