'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAiActions } from '../../hooks/useAiActions.ts'
import { reconcileData } from '../../lib/resumeForm.ts'
import { ResumeApiError, resumeApi } from '../../lib/resumeClient.ts'
import { scoreResume } from '../../lib/resume/score.ts'
import { fitView, reorder, shift } from '../../lib/resume/view.ts'
import type { BuilderConfig } from '../../lib/resumeTypes.ts'
import { validateForGenerate, type ResumeData, type ResumeView, type Structure } from '../../lib/resumeValidation.ts'
import { exportResume, saveBlob, type ExportFormat } from '../../lib/resume/export.ts'
import AiPanel from './AiPanel.tsx'
import QuickActions from './QuickActions.tsx'
import SidePanel, { type PanelTab } from './SidePanel.tsx'
import StructureEditor from './StructureEditor.tsx'
import StructureForm from './StructureForm.tsx'
import TemplateGallery from './TemplateGallery.tsx'
import TemplatePreview from './TemplatePreview.tsx'
import WorkspaceHeader, { type SyncState } from './WorkspaceHeader.tsx'

const AUTOSAVE_MS = 1500

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
type Pane = 'edit' | 'preview' | 'actions'

interface Doc {
  title: string
  data: ResumeData
  /** The resume's own structure (advanced users), or null to use the default one. */
  structure: Structure | null
  /** Section order and exported variants; part of the resume, never of the structure. */
  view?: ResumeView
}

interface Props {
  id: string
  config: BuilderConfig
  onClose: () => void
  /** Called after a successful save so the list can refresh its titles and dates. */
  onSaved: () => void
}

const snapshotOf = (doc: Doc) => JSON.stringify(doc)

/** The label of the field an issue path (`section.field` or `section.<index>.field`) points at. */
function fieldName(structure: Structure, path: string): string {
  const parts = path.split('.')
  const section = structure.sections.find((candidate) => candidate.id === parts[0])
  const field = section?.fields.find((candidate) => candidate.id === parts[parts.length - 1])
  return field?.label ?? path
}
const collapsedKey = (id: string) => `resume-collapsed:${id}`

const PANES: { id: Pane; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
  { id: 'actions', label: 'Actions' },
]

// The workspace for one resume: header, side panel (Content / AI / Design), live canvas and the
// quick-actions rail. `doc` is the only copy of the resume; the canvas, the score and the AI
// actions are all derived from it.
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
  const [tab, setTab] = useState<PanelTab>('content')
  const [pane, setPane] = useState<Pane>('edit')
  const [templateId, setTemplateId] = useState(config.templates[0]?.id ?? '')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  // Folded sections are a per-browser convenience; this component only mounts after the resume
  // loaded in the browser, so reading storage here cannot disagree with server HTML. Storage may be
  // blocked, so every access is guarded.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(collapsedKey(id)) ?? '[]')
      return new Set(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const ai = useAiActions()

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
          ...(resume.view ? { view: resume.view } : {}),
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

  const toggleSection = useCallback(
    (sectionId: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (!next.delete(sectionId)) next.add(sectionId)
        try {
          window.localStorage.setItem(collapsedKey(id), JSON.stringify([...next]))
        } catch {
          /* not remembered, still works */
        }
        return next
      })
    },
    [id],
  )

  const structure = doc ? (doc.structure ?? config.defaultStructure) : config.defaultStructure
  const dirty = doc !== null && snapshotOf(doc) !== saved

  const issues = useMemo(
    () => (doc ? validateForGenerate(structure, doc.data, config.structureRules, doc.view) : []),
    [doc, structure, config.structureRules],
  )
  const errors = useMemo(() => new Map(issues.map((issue) => [issue.path, issue.message])), [issues])
  const score = useMemo(() => scoreResume(structure, doc?.data ?? {}, doc?.view), [structure, doc])

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
        view: doc.view ?? null,
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

  async function download() {
    if (!doc) return
    setShowAll(true)
    setNotice(null)
    if (issues.length > 0) {
      setNotice(`${issues.length} ${issues.length === 1 ? 'field needs' : 'fields need'} attention before you can download.`)
      return
    }
    if (exporting) return
    setExporting(true)
    try {
      const { blob, filename, warnings } = await exportResume({
        title: doc.title,
        structure,
        data: doc.data,
        view: doc.view,
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

  const edit = (next: Doc) => setDoc(next)
  const sync: SyncState = status === 'saving' ? 'saving' : status === 'error' || status === 'conflict' ? 'error' : dirty ? 'dirty' : 'saved'
  const syncText =
    status === 'saving' ? 'Saving...' : status === 'conflict' ? 'Changed elsewhere' : status === 'error' ? 'Not saved' : dirty ? 'Unsaved changes' : 'All changes saved'
  const template = config.templates.find((candidate) => candidate.id === templateId)

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        title={doc.title}
        onTitleChange={(title) => edit({ ...doc, title })}
        sync={sync}
        syncText={syncText}
        showSave={!autosave}
        onSave={() => void save()}
        format={format}
        onFormatChange={setFormat}
        downloading={exporting}
        downloadDisabled={format !== 'md' && config.templates.length === 0}
        onDownload={() => void download()}
        onLeave={leave}
      />

      {message && (
        <div role="alert" className="alert alert-error flex flex-wrap items-center justify-between gap-2">
          <span>{message}</span>
          {status === 'conflict' && (
            <button type="button" className="btn-sm button-secondary" onClick={() => window.location.reload()}>Reload</button>
          )}
        </div>
      )}
      {notice && <p role="status" className="text-meta">{notice}</p>}

      {/* Below lg the three columns become one pane at a time. */}
      <div role="tablist" aria-label="Workspace view" className="flex gap-2 lg:hidden">
        {PANES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={pane === item.id}
            className={`btn-sm flex-1 ${pane === item.id ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setPane(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)_16rem]">
        <aside className={`${pane === 'edit' ? '' : 'hidden'} min-w-0 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1`}>
          <SidePanel
            tab={tab}
            onTab={setTab}
            content={
              <div className="flex flex-col gap-4">
                <StructureForm
                  structure={structure}
                  data={doc.data}
                  view={doc.view}
                  rules={config.structureRules}
                  errors={errors}
                  touched={touched}
                  showAll={showAll}
                  collapsed={collapsed}
                  onToggle={toggleSection}
                  onChange={(data, view) => edit({ ...doc, data, ...(view ? { view } : {}) })}
                  onViewChange={(view) => edit({ ...doc, view })}
                  onMove={(sectionId, delta) => edit({ ...doc, view: shift(structure, doc.view, sectionId, delta) })}
                  onReorder={(fromId, toId) => edit({ ...doc, view: reorder(structure, doc.view, fromId, toId) })}
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
                        onApply={(next) => {
                          const data = reconcileData(next, doc.data)
                          edit({ ...doc, structure: next, data, view: fitView(next, data, doc.view) })
                        }}
                      />
                    </div>
                  </details>
                )}
              </div>
            }
            ai={<AiPanel ai={ai} structure={structure} data={doc.data} score={score.score} onApply={(data) => edit({ ...doc, data })} />}
            design={
              <div className="flex flex-col gap-3">
                <p className="text-meta">The template styles the preview and the PDF and Word downloads. Markdown has no styling.</p>
                <TemplateGallery templates={config.templates} selected={templateId} onSelect={setTemplateId} />
              </div>
            }
          />
        </aside>

        <section className={`${pane === 'preview' ? '' : 'hidden'} min-w-0 lg:block lg:sticky lg:top-24 lg:self-start`} aria-label="Preview">
          {template ? (
            <TemplatePreview key={template.id} template={template} structure={structure} data={doc.data} view={doc.view} />
          ) : (
            <p className="text-meta">No templates are available, so there is no preview. Markdown download still works.</p>
          )}
          {format === 'md' && template && <p className="text-meta pt-2">The preview shows the template; a Markdown download has no styling.</p>}
        </section>

        <aside className={`${pane === 'actions' ? '' : 'hidden'} flex min-w-0 flex-col gap-4 lg:flex`}>
          <QuickActions score={score} />
          {issues.length > 0 && (
            <section className="surface rounded-box p-4" aria-labelledby="missing-heading">
              <h2 id="missing-heading" className="text-meta-strong font-semibold">
                {issues.length} {issues.length === 1 ? 'field needs' : 'fields need'} attention
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {issues.slice(0, 8).map((issue) => (
                  <li key={issue.path}>{fieldName(structure, issue.path)}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
