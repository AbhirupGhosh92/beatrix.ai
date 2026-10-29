'use client'

import { useEffect, useState, useMemo } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import JsonView from '@uiw/react-json-view'
import { darkTheme } from '@uiw/react-json-view/dark'
import { lightTheme } from '@uiw/react-json-view/light'
import { Code, GitFork, Search, MinusSquare, PlusSquare } from 'lucide-react'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export function JsonEditor({ value, onChange, readOnly = false }: JsonEditorProps) {
  const [viewMode, setViewMode] = useState<'code' | 'tree'>('code')
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false)
  const [treeSearch, setTreeSearch] = useState<string>('')
  const [collapsedDepth, setCollapsedDepth] = useState<number | boolean>(1)

  // Detect dark vs light theme based on document attribute or class
  useEffect(() => {
    const updateTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'beatrix-dark' ||
        document.documentElement.classList.contains('beatrix-dark') ||
        !!document.querySelector('input.theme-controller[value="beatrix-dark"]:checked')
      setIsDarkTheme(isDark)
    }

    updateTheme()

    // Observe changes to 'data-theme' on documentElement as well as theme-controller radio inputs
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
      subtree: true,
    })

    const themeRadios = document.querySelectorAll('input.theme-controller')
    themeRadios.forEach((radio) => radio.addEventListener('change', updateTheme))

    return () => {
      observer.disconnect()
      themeRadios.forEach((radio) => radio.removeEventListener('change', updateTheme))
    }
  }, [])

  // Monaco Editor onMount handler to define custom Cyberpunk / Light Monaco themes
  const handleEditorDidMount: OnMount = (_editor, monaco) => {
    // Define Cyberpunk Dark Theme
    monaco.editor.defineTheme('beatrix-dark-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '03D8F3', fontStyle: 'bold' }, // Cyan keys
        { token: 'string.value.json', foreground: 'FCEE0C' }, // Yellow strings
        { token: 'number', foreground: 'FF1493' }, // Pink numbers
        { token: 'keyword.json', foreground: 'B026FF' }, // Purple booleans/nulls
      ],
      colors: {
        'editor.background': '#00060e',
        'editor.foreground': '#f3f4f6',
        'editor.lineHighlightBackground': '#111827',
        'editorCursor.foreground': '#03D8F3',
        'editorWhitespace.foreground': '#374151',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#03D8F3',
      },
    })

    // Define Light Theme
    monaco.editor.defineTheme('beatrix-light-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '9333ea', fontStyle: 'bold' }, // Purple keys
        { token: 'string.value.json', foreground: '0284c7' }, // Blue strings
        { token: 'number', foreground: 'e11d48' }, // Red numbers
        { token: 'keyword.json', foreground: '059669' }, // Green booleans
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2937',
        'editor.lineHighlightBackground': '#f3f4f6',
        'editorCursor.foreground': '#9333ea',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#9333ea',
      },
    })

    monaco.editor.setTheme(isDarkTheme ? 'beatrix-dark-theme' : 'beatrix-light-theme')
  }

  // Parse JSON for tree view
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }, [value])

  return (
    <div className="flex flex-col h-full w-full border border-base-300 rounded-xl overflow-hidden bg-base-100">
      {/* Editor Sub-Header / Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-base-200 border-b border-base-300 text-xs">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-base-300/60 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('code')}
            className={`btn btn-xs gap-1.5 ${
              viewMode === 'code' ? 'btn-primary font-bold shadow-sm' : 'btn-ghost text-base-content/70'
            }`}
          >
            <Code size={13} />
            Code Editor
          </button>
          <button
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
                onClick={() => setCollapsedDepth(1)}
                className="btn btn-ghost btn-xs gap-1"
                title="Collapse all top-level nodes"
              >
                <MinusSquare size={13} />
                Collapse
              </button>
              <button
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
        <div className="text-base-content/60 font-mono hidden sm:block">
          {viewMode === 'code' ? 'Press Ctrl+F to Search / Replace' : 'Interactive JSON Tree'}
        </div>
      </div>

      {/* Editor Main Content Container */}
      <div className="relative flex-1 min-h-[500px] w-full">
        {viewMode === 'code' ? (
          <Editor
            height="500px"
            defaultLanguage="json"
            language="json"
            value={value}
            onChange={(val) => onChange(val ?? '')}
            onMount={handleEditorDidMount}
            theme={isDarkTheme ? 'beatrix-dark-theme' : 'beatrix-light-theme'}
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
          <div className="p-4 h-full min-h-[500px] overflow-auto bg-base-100 font-mono text-sm">
            {parsedJson !== null ? (
              <JsonView
                value={parsedJson}
                style={isDarkTheme ? darkTheme : lightTheme}
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
}
