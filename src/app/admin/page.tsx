'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { ThemeToggle } from '../../ThemeToggle'

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
  const [saving, setSaving] = useState<boolean>(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false)

  const showNotification = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }, [])

  // Fetch file list
  const fetchFileList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms')
      if (!res.ok) throw new Error('Failed to load file list')
      const data = await res.json()
      setFileList(data.files || [])
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching files')
    }
  }, [showNotification])

  useEffect(() => {
    let ignore = false
    async function initFileList() {
      try {
        const res = await fetch('/api/admin/cms')
        if (!res.ok) throw new Error('Failed to load file list')
        const data = await res.json()
        if (!ignore) {
          setFileList(data.files || [])
        }
      } catch (err) {
        if (!ignore) {
          showNotification('error', err instanceof Error ? err.message : 'Error fetching files')
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
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/cms?file=${encodeURIComponent(selectedFile)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load file`)
        const data = await res.json()

        let rawContent = data.content || ''
        try {
          if (rawContent) {
            const parsed = JSON.parse(rawContent)
            rawContent = JSON.stringify(parsed, null, 2)
          }
        } catch {
          // Keep raw string if parse fails
        }

        if (!ignore) {
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
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedFile, content }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save file')
      }

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
    setContent('{\n  "key": "value"\n}')
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
              onClick={() => fetchFileList()}
              className="btn btn-ghost btn-xs btn-square"
              title="Refresh File List"
            >
              <RefreshCw size={14} />
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
              <Save size={14} />
              {saving ? 'Saving...' : 'Save File'}
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
            <span className="text-base-content/60">
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

          {/* Textarea Editor */}
          <div className="relative flex-1 min-h-[500px]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-base-200/80">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : (
              <textarea
                className="w-full h-full min-h-[500px] p-4 bg-base-200 font-mono text-sm leading-relaxed focus:outline-none resize-y border-none text-base-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter JSON file content here..."
                spellCheck={false}
              />
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
