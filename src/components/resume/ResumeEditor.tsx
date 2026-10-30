'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { reconcileData } from '../../lib/resumeForm.ts'
import { ResumeApiError, resumeApi } from '../../lib/resumeClient.ts'
import type { BuilderConfig } from '../../lib/resumeTypes.ts'
import { validateForGenerate, type ResumeData, type Structure } from '../../lib/resumeValidation.ts'
import { exportResume, saveBlob, type ExportFormat } from '../../lib/resume/export.ts'
import ExportPanel from './ExportPanel.tsx'
import StructureEditor from './StructureEditor.tsx'
import StructureForm from './StructureForm.tsx'

const AUTOSAVE_MS = 1500

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

interface Doc {
  title: string
  data: ResumeData
  /** The resume's own structure (advanced users), or null to use the default one. */
  structure: Structure | null
}

interface Props {
  id: string
  config: BuilderConfig
  onClose: () => void
  /** Called after a successful save so the list can refresh its titles and dates. */
  onSaved: () => void
}

const snapshotOf = (doc: Doc) => JSON.stringify(doc)

export default function ResumeEditor({ id, config, onClose, onSaved }: Props) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [generation, setGeneration] = useState('')
  const [saved, setSaved] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const autosave = config.canCustomize

  useEffect(() => {
    let ignore = false
    resumeApi
      .get(id)
      .then(({ resume, generation: version }) => {
        if (ignore) return
        const structure = resume.structure
        const loaded: Doc = {
          title: resume.title,
          structure,
          data: reconcileData(structure ?? config.defaultStructure, resume.data),
        }
        setDoc(loaded)
        setSaved(snapshotOf(loaded))
        setGeneration(version)
      })
      .catch((err: unknown) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'Could not load this resume.')
      })
    return () => {
      ignore = true
    }
  }, [id, config.defaultStructure])

  const structure = doc ? (doc.structure ?? config.defaultStructure) : config.defaultStructure
  const dirty = doc !== null && snapshotOf(doc) !== saved

  const issues = useMemo(() => (doc ? validateForGenerate(structure, doc.data, config.structureRules) : []), [doc, structure, config.structureRules])
  const errors = useMemo(() => new Map(issues.map((issue) => [issue.path, issue.message])), [issues])

  const save = useCallback(async () => {
    if (!doc || status === 'saving') return
    setStatus('saving')
    setMessage(null)
    try {
      const result = await resumeApi.save(id, {
        title: doc.title,
        data: doc.data,
        // Only roles that may customize send a structure; base users never do.
        ...(config.canCustomize && doc.structure ? { structure: doc.structure } : {}),
        generation,
      })
      setGeneration(result.generation)
      setSaved(snapshotOf(doc))
      setStatus('saved')
      onSaved()
    } catch (err) {
      if (err instanceof ResumeApiError && err.status === 409) {
        setStatus('conflict')
        setMessage(err.message)
      } else {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Saving failed.')
      }
    }
  }, [doc, status, id, config.canCustomize, generation, onSaved])

  // Advanced users: save a moment after the last edit. Each edit changes `save`, which restarts the timer.
  useEffect(() => {
    if (!autosave || !dirty || status === 'saving' || status === 'conflict') return
    const timer = setTimeout(() => void save(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [autosave, dirty, status, save])

  // Unsaved edits are lost on leaving the page, so ask first.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = '' // older browsers only show the prompt when this is set
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function leave() {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    onClose()
  }

  async function generate(templateId: string, format: ExportFormat) {
    if (!doc) return
    setShowAll(true)
    if (issues.length > 0 || exporting) return
    setExporting(true)
    setNotice(null)
    try {
      const { blob, filename, warnings } = await exportResume({
        title: doc.title,
        structure,
        data: doc.data,
        format,
        template: config.templates.find((template) => template.id === templateId),
      })
      saveBlob(blob, filename)
      setNotice([`Downloaded ${filename}.`, ...warnings].join(' '))
    } catch (err) {
      setNotice(`Could not generate the file: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-error">{loadError}</p>
        <button type="button" className="button-secondary self-start" onClick={onClose}>Back to my resumes</button>
      </div>
    )
  }
  if (!doc) {
    return (
      <p className="flex items-center gap-2 text-muted"><Loader2 className="animate-spin" size={18} /> Loading resume...</p>
    )
  }

  const statusText =
    status === 'saving' ? 'Saving...' : status === 'conflict' ? 'Changed elsewhere' : status === 'error' ? 'Not saved' : dirty ? 'Unsaved changes' : 'All changes saved'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-secondary" onClick={leave}>
          <ArrowLeft size={16} /> My resumes
        </button>
        <div className="flex items-center gap-3">
          <span className="text-meta" role="status">{statusText}</span>
          {!autosave && (
            <button type="button" className="button-primary" disabled={!dirty || status === 'saving'} onClick={() => void save()}>
              {status === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
            </button>
          )}
        </div>
      </div>

      {message && (
        <div role="alert" className="alert alert-error flex flex-wrap items-center justify-between gap-2">
          <span>{message}</span>
          {status === 'conflict' && (
            <button type="button" className="btn-sm button-secondary" onClick={() => window.location.reload()}>Reload</button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-1">
            <span className="text-meta-strong font-semibold">Resume name</span>
            <input
              className="input input-bordered w-full"
              maxLength={80}
              value={doc.title}
              onChange={(event) => setDoc({ ...doc, title: event.target.value })}
            />
          </label>

          <StructureForm
            structure={structure}
            data={doc.data}
            rules={config.structureRules}
            errors={errors}
            touched={touched}
            showAll={showAll}
            onChange={(data) => setDoc({ ...doc, data })}
            onTouch={(path) => setTouched((prev) => new Set(prev).add(path))}
          />

          {config.canCustomize && (
            <details className="surface rounded-box p-4">
              <summary className="heading-display cursor-pointer font-bold text-brand">Edit structure</summary>
              <div className="pt-4">
                <StructureEditor
                  key={JSON.stringify(structure)}
                  structure={structure}
                  rules={config.structureRules}
                  onApply={(next) => setDoc({ ...doc, structure: next, data: reconcileData(next, doc.data) })}
                />
              </div>
            </details>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
          <section className="surface rounded-box flex flex-col gap-3 p-4" aria-labelledby="generate-heading">
            <h2 id="generate-heading" className="heading-display text-lg font-bold text-brand">Generate</h2>
            <ExportPanel templates={config.templates} structure={structure} valid={issues.length === 0} busy={exporting} onGenerate={(templateId, format) => void generate(templateId, format)} />
            {notice && <p role="status" className="text-meta">{notice}</p>}
          </section>
          {issues.length > 0 && (
            <section className="surface rounded-box p-4" aria-labelledby="missing-heading">
              <h2 id="missing-heading" className="text-meta-strong font-semibold">
                {issues.length} {issues.length === 1 ? 'field needs' : 'fields need'} attention
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {issues.slice(0, 8).map((issue) => (
                  <li key={issue.path}>{issue.message}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
