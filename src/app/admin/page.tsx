'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { ThemeToggle } from '../../components/layout/ThemeToggle.tsx'
import { JsonEditor } from '../../components/ui/JsonEditor.tsx'
import { getIdToken } from '../../lib/firebase.ts'

// The browser only talks to this site's own /api/admin/cms route; the server calls the Cloud
// Functions. The Firebase ID token proves who is signed in.
async function cms<T>(init: { method?: string; query?: string; body?: object } = {}): Promise<T> {
  const token = await getIdToken()
  const res = await fetch(`/api/admin/cms${init.query ?? ''}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

interface FileContent extends FileItem {
  content: string
}

interface SaveResult {
  message?: string
}

interface FileItem {
  filename: string
  displayName: string
  exists: boolean
  size: number
  updatedAt: string | null
}

export default function AdminPage() {
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('profile.json')
  const [content, setContent] = useState<string>('')
  const [initialContent, setInitialContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [fetchingList, setFetchingList] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false)

  // In-memory memoisation cache for API calls (file contents)
  const cacheRef = useRef<Map<string, FileContent>>(new Map())

  const showNotification = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }, [])

  // Fetch file list
  const fetchFileList = useCallback(async (bypassCache = false) => {
    setFetchingList(true)
    try {
      const data = await cms<{ files: FileItem[] }>()
      setFileList(data.files || [])
      if (bypassCache) {
        cacheRef.current.clear()
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching files')
    } finally {
      setFetchingList(false)
    }
  }, [showNotification])

  useEffect(() => {
    let ignore = false
    async function initFileList() {
      setFetchingList(true)
      try {
        const data = await cms<{ files: FileItem[] }>()
        if (!ignore) {
          setFileList(data.files || [])
        }
      } catch (err) {
        if (!ignore) {
          showNotification('error', err instanceof Error ? err.message : 'Error fetching files')
        }
      } finally {
        if (!ignore) {
          setFetchingList(false)
        }
      }
    }
    initFileList()
    return () => {
      ignore = true
    }
  }, [showNotification])

  useEffect(() => {
    if (!selectedFile) return
    let ignore = false

    async function loadFile() {
      // Check in-memory cache first for memoised response
      const cached = cacheRef.current.get(selectedFile)
      if (cached) {
        setContent(cached.content)
        setInitialContent(cached.exists ? cached.content : '')
        setLastSaved(cached.updatedAt ? new Date(cached.updatedAt).toLocaleTimeString() : null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const data = await cms<FileContent>({ query: `?file=${encodeURIComponent(selectedFile)}` })

        let rawContent = data.content || ''
        try {
          if (rawContent) {
            const parsed = JSON.parse(rawContent)
            rawContent = JSON.stringify(parsed, null, 2)
          }
        } catch {
          // Keep raw string if parse fails
        }

        const preparedData = { ...data, content: rawContent }

        if (!ignore) {
          // Store in memoisation cache
          cacheRef.current.set(selectedFile, preparedData)

          setContent(rawContent)
          setInitialContent(rawContent)
          setLastSaved(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : null)
        }
      } catch (err) {
        if (!ignore) {
          showNotification('error', err instanceof Error ? err.message : 'Error loading file content')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    loadFile()
    return () => {
      ignore = true
    }
  }, [selectedFile, showNotification])

  // Compute JSON error state derived from content
  const jsonError = useMemo(() => {
    if (!content.trim()) {
      return 'Content cannot be empty'
    }
    try {
      JSON.parse(content)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid JSON format'
    }
  }, [content])

  const handleSave = async () => {
    if (jsonError) {
      showNotification('error', 'Cannot save invalid JSON. Please fix errors first.')
      return
    }

    setSaving(true)
    try {
      const data = await cms<SaveResult>({ method: 'POST', body: { file: selectedFile, content } })

      const nowIso = new Date().toISOString()
      // Update memoisation cache with saved content
      cacheRef.current.set(selectedFile, {
        filename: selectedFile,
        displayName: selectedFile,
        exists: true,
        size: content.length,
        updatedAt: nowIso,
        content,
      })

      setInitialContent(content)
      setLastSaved(new Date().toLocaleTimeString())
      showNotification('success', data.message || `Saved ${selectedFile} successfully!`)
      fetchFileList()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(content)
      const formatted = JSON.stringify(parsed, null, 2)
      setContent(formatted)
      showNotification('success', 'JSON formatted successfully')
    } catch {
      showNotification('error', 'Cannot format invalid JSON')
    }
  }

  const handleReset = () => {
    setContent(initialContent)
    showNotification('success', 'Reverted changes to last saved state')
  }

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return
    let cleanName = newFileName.trim()
    if (!cleanName.endsWith('.json')) {
      cleanName += '.json'
    }

    setSelectedFile(cleanName)
    const initialNewContent = '{\n  "key": "value"\n}'
    setContent(initialNewContent)
    setInitialContent('')
    setShowNewFileModal(false)
    setNewFileName('')
    showNotification('success', `Created preview for ${cleanName}. Edit and click Save to create the file.`)
  }

  const isDirty = content !== initialContent
  const lineCount = content ? content.split('\n').length : 0
  const charCount = content ? content.length : 0

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="button-accent btn-square flex items-center justify-center p-2 rounded-lg"
              aria-label="Back to Main Site"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-xl uppercase tracking-wider font-bold sm:text-2xl text-brand">
                Admin CMS Panel
              </h1>
              <p className="text-xs text-base-content/70">
                Track and edit site content files (profile.json & extensions)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
        {/* Toast Alert */}
        {toast && (
          <div className="toast toast-top toast-center z-50">
            <div
              className={`alert ${
                toast.type === 'success' ? 'alert-success' : 'alert-error'
              } shadow-lg`}
            >
              <span>{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Section Header & File Navigation */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-base-200 border border-base-300 p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <FileCode size={24} className="text-brand-2" />
            <span className="font-semibold text-sm uppercase tracking-wide">Selected File:</span>
            <select
              className="select select-bordered select-sm bg-base-100 font-mono text-sm max-w-xs focus:outline-none"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              {fileList.map((f) => (
                <option key={f.filename} value={f.filename}>
                  {f.displayName} {f.exists ? '' : '(New)'}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchFileList(true)}
              disabled={fetchingList}
              className="btn btn-ghost btn-xs btn-square"
              title="Refresh File List (Bypasses Cache)"
            >
              <RefreshCw size={14} className={fetchingList ? 'animate-spin text-brand' : ''} />
            </button>

            <button
              onClick={() => setShowNewFileModal(true)}
              className="btn btn-outline btn-xs gap-1 border-base-300 hover:border-brand"
            >
              <Plus size={14} />
              Add File
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrettify}
              disabled={loading || !!jsonError}
              className="button-secondary btn-sm flex items-center gap-1 text-xs"
              title="Prettify / Format JSON"
            >
              <Sparkles size={14} />
              Format
            </button>

            <button
              onClick={handleReset}
              disabled={loading || !isDirty}
              className="button-accent btn-sm flex items-center gap-1 text-xs"
              title="Reset changes"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={loading || saving || !!jsonError || !isDirty}
              className="button-primary btn-sm flex items-center gap-1 text-xs font-bold"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tracking Status Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 bg-base-200/60 border border-base-300 p-3 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">JSON Syntax:</span>
            {jsonError ? (
              <span className="badge badge-error badge-sm gap-1 text-error-content font-sans font-semibold">
                <AlertCircle size={12} /> Invalid
              </span>
            ) : (
              <span className="badge badge-success badge-sm gap-1 text-success-content font-sans font-semibold">
                <CheckCircle2 size={12} /> Valid
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base-content/60">Status:</span>
            {isDirty ? (
              <span className="badge badge-warning badge-sm font-sans font-medium">Unsaved Changes</span>
            ) : (
              <span className="badge badge-ghost badge-sm font-sans">Saved</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base-content/60">Metrics:</span>
            <span>
              {lineCount} lines | {(charCount / 1024).toFixed(2)} KB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base-content/60">Last Saved:</span>
            <span>{lastSaved || 'N/A'}</span>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col border border-base-300 rounded-xl bg-base-200 overflow-hidden shadow-md">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between bg-base-300/50 px-4 py-2 text-xs font-mono border-b border-base-300">
            <span className="font-semibold text-brand-2">
              src/data/{selectedFile}
            </span>
            <span className="text-base-content/60 flex items-center gap-2">
              {loading && <Loader2 size={12} className="animate-spin text-brand" />}
              {loading ? 'Loading file...' : 'JSON Content Editor'}
            </span>
          </div>

          {/* Error Details Banner */}
          {jsonError && (
            <div className="bg-error/15 border-b border-error/30 p-3 text-xs text-error font-mono flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Syntax Error: </span>
                {jsonError}
              </div>
            </div>
          )}

          {/* JSON Editor Component */}
          <div className="relative flex-1 min-h-[500px]">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-200/80 z-20 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <span className="text-xs font-mono text-base-content/70 animate-pulse">
                  Fetching file content...
                </span>
              </div>
            ) : (
              <JsonEditor value={content} onChange={setContent} />
            )}
          </div>
        </div>
      </main>

      {/* Create New File Modal */}
      {showNewFileModal && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-200 border border-base-300">
            <h3 className="font-bold text-lg font-display uppercase tracking-wide text-brand">
              Add New Managed File
            </h3>
            <p className="py-2 text-sm text-base-content/70">
              Enter a filename for a new JSON file to create in <code className="font-mono">src/data/</code>:
            </p>
            <input
              type="text"
              placeholder="e.g. settings.json or profile.custom.json"
              className="input input-bordered w-full font-mono text-sm my-3 focus:outline-none"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            <div className="modal-action">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFile}
                disabled={!newFileName.trim()}
                className="button-primary btn-sm"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
