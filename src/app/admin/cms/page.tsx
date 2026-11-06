'use client'

import { useMemo, useState } from 'react'
import {
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
import { JsonEditor } from '../../../components/ui/JsonEditor.tsx'
import { ErrorState, SkeletonText } from '../../../components/ui/Skeleton.tsx'
import resumeConfigExample from '../../../data/resume-config.example.json'
import { RESUME_CONFIG_FILE } from '../../../data/resumeConfig.ts'
import { api, useCmsSaveMutation, useGetCmsFileQuery, useListCmsFilesQuery } from '../../../store/api.ts'
import { useAppDispatch } from '../../../store/hooks.ts'
import { notify } from '../../../store/notifications.ts'

// What an admin starts from when creating the resume builder config (opened unsaved until saved once).
const DEFAULT_RESUME_CONFIG = JSON.stringify(resumeConfigExample, null, 2)

// The browser only talks to this site's own /api/admin/cms route (through the store's data layer);
// the server calls the Cloud Functions. The Firebase ID token proves who is signed in.

/** A saved file is shown pretty-printed; a resume config that was never saved opens as the default, unsaved. */
function prepareContent(file: string, data: { exists: boolean; content: string }): { text: string; isNewResumeConfig: boolean } {
  const isNewResumeConfig = !data.exists && file === RESUME_CONFIG_FILE
  let text = isNewResumeConfig ? DEFAULT_RESUME_CONFIG : data.content || ''
  try {
    if (text) text = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    // Keep raw string if parse fails
  }
  return { text, isNewResumeConfig }
}

export default function AdminPage() {
  const dispatch = useAppDispatch()
  const [selectedFile, setSelectedFile] = useState<string>('profile.json')
  // The editor's working text: null until edited, so the loaded file is shown until then. A file created
  // in this page that does not exist on the server yet is local only ('draftFile' with its starting text).
  const [edit, setEdit] = useState<{ file: string; text: string } | null>(null)
  const [localFile, setLocalFile] = useState<{ file: string; text: string } | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false)

  const list = useListCmsFilesQuery()
  const fileList = list.data?.files ?? []
  const fetchingList = list.isFetching
  const isLocal = localFile?.file === selectedFile && !fileList.some((f) => f.filename === selectedFile)
  const fileQuery = useGetCmsFileQuery(selectedFile, { skip: isLocal })
  const [saveFile, { isLoading: saving }] = useCmsSaveMutation()

  const loading = !isLocal && fileQuery.isLoading
  const prepared = useMemo(
    () => (fileQuery.data ? prepareContent(selectedFile, fileQuery.data) : null),
    [fileQuery.data, selectedFile],
  )
  // The text the file holds now (the editor starts from it, and Reset returns to it).
  const initialContent = isLocal ? '' : prepared?.isNewResumeConfig ? '' : (prepared?.text ?? '')
  const startContent = isLocal ? localFile.text : (prepared?.text ?? '')
  const content = edit?.file === selectedFile ? edit.text : startContent
  const setContent = (text: string) => setEdit({ file: selectedFile, text })
  const updatedAt = isLocal ? null : (fileQuery.data?.updatedAt ?? null)
  const lastSaved = updatedAt ? new Date(updatedAt).toLocaleTimeString() : null

  const showNotification = (type: 'success' | 'error', msg: string) => dispatch(notify(type, msg))

  // Refresh drops every cached file so the next view reads the server again.
  const refreshFiles = () => {
    dispatch(api.util.invalidateTags(['CmsFile']))
    void list.refetch()
  }

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

    try {
      await saveFile({ file: selectedFile, content }).unwrap()
      // The file now exists on the server; the refreshed file and list replace the local copy. The edit
      // stays so the editor never flashes the previous text while the refreshed file loads.
      setLocalFile(null)
    } catch {
      // Already reported by the error snackbar.
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
    setEdit(null)
    showNotification('success', 'Reverted changes to last saved state')
  }

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return
    let cleanName = newFileName.trim()
    if (!cleanName.endsWith('.json')) {
      cleanName += '.json'
    }

    const initialNewContent = cleanName === RESUME_CONFIG_FILE ? DEFAULT_RESUME_CONFIG : '{\n  "key": "value"\n}'
    setLocalFile({ file: cleanName, text: initialNewContent })
    setEdit(null)
    setSelectedFile(cleanName)
    setShowNewFileModal(false)
    setNewFileName('')
    showNotification('success', `Created preview for ${cleanName}. Edit and click Save to create the file.`)
  }

  const isDirty = content !== initialContent
  const lineCount = content ? content.split('\n').length : 0
  const charCount = content ? content.length : 0

  return (
    <>
      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
        {/* Section Header & File Navigation */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between surface p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <FileCode size={24} className="text-brand-2" />
            <span className="font-semibold text-sm uppercase tracking-wide">Selected File:</span>
            <select
              className="select select-bordered select-sm bg-base-100 font-mono text-sm max-w-xs focus:outline-none"
              value={selectedFile}
              onChange={(e) => {
                setEdit(null)
                setSelectedFile(e.target.value)
              }}
            >
              {fileList.map((f) => (
                <option key={f.filename} value={f.filename}>
                  {f.displayName} {f.exists ? '' : '(New)'}
                </option>
              ))}
            </select>

            <button
              onClick={refreshFiles}
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
            <span className="text-muted">JSON Syntax:</span>
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
            <span className="text-muted">Status:</span>
            {isDirty ? (
              <span className="badge badge-warning badge-sm font-sans font-medium">Unsaved Changes</span>
            ) : (
              <span className="badge badge-ghost badge-sm font-sans">Saved</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted">Metrics:</span>
            <span>
              {lineCount} lines | {(charCount / 1024).toFixed(2)} KB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted">Last Saved:</span>
            <span>{lastSaved || 'N/A'}</span>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col border border-base-300 rounded-xl bg-base-200 overflow-hidden shadow-md">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between bg-base-300/50 px-4 py-2 text-xs font-mono edge-b">
            <span className="font-semibold text-brand-2">
              src/data/{selectedFile}
            </span>
            <span className="text-muted flex items-center gap-2">
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
            {fileQuery.isError && !fileQuery.data && !isLocal ? (
              <div className="p-4">
                <ErrorState
                  message={fileQuery.error && 'message' in fileQuery.error && fileQuery.error.message ? fileQuery.error.message : 'Could not load this file.'}
                  onRetry={() => void fileQuery.refetch()}
                />
              </div>
            ) : loading ? (
              <div role="status" aria-busy="true" className="absolute inset-0 z-20 bg-base-200 p-4">
                <span className="sr-only">Loading file</span>
                <SkeletonText lines={14} />
              </div>
            ) : (
              <JsonEditor value={content} onChange={setContent} defaultView="tree" />
            )}
          </div>
        </div>
      </main>

      {/* Create New File Modal */}
      {showNewFileModal && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-200 border border-base-300">
            <h3 className="font-bold text-lg heading-display text-brand">
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
    </>
  )
}
