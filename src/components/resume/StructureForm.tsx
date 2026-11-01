'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { addEntry, fieldPath, removeEntry, setFieldValue } from '../../lib/resumeForm.ts'
import { afterVariantRemoved, displaySections, setActiveVariant } from '../../lib/resume/view.ts'
import {
  activeVariant,
  entriesOf,
  type ResumeData,
  type ResumeView,
  type SectionData,
  type SectionDef,
  type Structure,
  type StructureRules,
} from '../../lib/resumeValidation.ts'
import FieldInput from './FieldInput.tsx'

interface Props {
  structure: Structure
  data: ResumeData
  view: ResumeView | undefined
  rules: StructureRules
  /** field path -> message, from validateForGenerate */
  errors: ReadonlyMap<string, string>
  /** Fields the user has left, so errors are not shown on a form they have not touched yet. */
  touched: ReadonlySet<string>
  /** Show every error (after the user tried to generate). */
  showAll: boolean
  /** Sections the user folded away; browser-only state, not stored with the resume. */
  collapsed: ReadonlySet<string>
  onToggle: (sectionId: string) => void
  /** `view` changes in the same edit (a removed variant). */
  onChange: (data: ResumeData, view?: ResumeView) => void
  onViewChange: (view: ResumeView) => void
  onMove: (sectionId: string, delta: -1 | 1) => void
  onReorder: (fromId: string, toId: string) => void
  onTouch: (path: string) => void
}

export default function StructureForm({
  structure,
  data,
  view,
  rules,
  errors,
  touched,
  showAll,
  collapsed,
  onToggle,
  onChange,
  onViewChange,
  onMove,
  onReorder,
  onTouch,
}: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [justMoved, setJustMoved] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const sections = displaySections(structure, view)
  const headerId = structure.sections[0]?.id

  // Feedback while reordering: after the order changes, every section slides from where it was to
  // where it is now (FLIP). Positions are offsets inside the list, so scrolling cannot fake a move.
  const items = useRef(new Map<string, HTMLElement>())
  const offsets = useRef(new Map<string, number>())
  const lastOrder = useRef('')
  const orderKey = sections.map((section) => section.id).join(',')
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reordered = lastOrder.current !== '' && lastOrder.current !== orderKey
    for (const [id, element] of items.current) {
      const before = offsets.current.get(id)
      if (reordered && !reduced && before !== undefined && before !== element.offsetTop) {
        element.animate(
          [{ transform: `translateY(${before - element.offsetTop}px)` }, { transform: 'translateY(0)' }],
          { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        )
      }
      offsets.current.set(id, element.offsetTop)
    }
    lastOrder.current = orderKey
  })

  // A short highlight on the section that was just moved, so the new position is easy to find.
  function flash(sectionId: string) {
    setJustMoved(sectionId)
    window.setTimeout(() => setJustMoved((current) => (current === sectionId ? null : current)), 700)
  }

  function move(section: SectionDef, delta: -1 | 1) {
    const at = sections.findIndex((candidate) => candidate.id === section.id)
    const to = Math.min(Math.max(at + delta, 1), sections.length - 1)
    if (to === at) return
    onMove(section.id, delta)
    flash(section.id)
    setAnnouncement(`${section.title} moved to position ${to + 1} of ${sections.length}.`)
  }

  return (
    <div className="relative flex flex-col gap-4">
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {sections.map((section) => {
        const isOpen = !collapsed.has(section.id)
        const movable = section.id !== headerId
        const entries: SectionData[] = section.repeatable
          ? entriesOf(section, data[section.id])
          : [Array.isArray(data[section.id]) || !data[section.id] ? {} : (data[section.id] as SectionData)]
        const active = section.variants ? activeVariant(section, data, view) : -1

        return (
          <fieldset
            key={section.id}
            ref={(element) => {
              if (element) items.current.set(section.id, element)
              else items.current.delete(section.id)
            }}
            className={`surface rounded-box flex flex-col gap-4 p-3 transition-[opacity,transform,box-shadow] duration-200 sm:p-4 ${
              dragging === section.id ? 'scale-[0.98] opacity-60 shadow-xl' : ''
            } ${over === section.id && dragging && dragging !== section.id ? 'outline outline-2 outline-offset-4 outline-primary' : ''} ${
              justMoved === section.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''
            }`}
            onDragEnter={() => {
              if (dragging && movable) setOver(section.id)
            }}
            onDragOver={(event) => {
              if (dragging && movable) {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragging && movable && dragging !== section.id) {
                onReorder(dragging, section.id)
                flash(dragging)
                setAnnouncement(`${structure.sections.find((s) => s.id === dragging)?.title ?? 'Section'} moved.`)
              }
              setDragging(null)
              setOver(null)
            }}
          >
            <legend className="flex items-center gap-1 px-2">
              <button
                type="button"
                className={`btn-sm button-secondary ${movable ? 'cursor-grab' : ''}`}
                aria-expanded={isOpen}
                title={movable ? 'Drag to reorder, or press Alt and the up or down arrow key.' : undefined}
                draggable={movable}
                onClick={() => onToggle(section.id)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', section.id)
                  setDragging(section.id)
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(null)
                }}
                onKeyDown={(event) => {
                  if (movable && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                    event.preventDefault()
                    move(section, event.key === 'ArrowUp' ? -1 : 1)
                  }
                }}
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="heading-display font-bold text-brand">{section.title}</span>
              </button>
            </legend>

            {isOpen &&
              entries.map((entry, index) => (
                <div key={index} className={section.repeatable ? 'flex flex-col gap-3 rounded-lg border border-base-300 p-3' : 'flex flex-col gap-3'}>
                  {section.repeatable && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-meta-strong font-semibold">
                        {section.title} #{index + 1}
                        {section.variants && index === active && <span className="badge badge-primary ml-2">Used in resume</span>}
                      </span>
                      <span className="flex gap-2">
                        {section.variants && index !== active && (
                          <button type="button" className="btn-sm button-accent" onClick={() => onViewChange(setActiveVariant(view, section.id, index))}>
                            Use this one
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-sm button-secondary"
                          onClick={() => {
                            onChange(removeEntry(data, section, index), section.variants ? afterVariantRemoved(view, section.id, index) : undefined)
                          }}
                          aria-label={`Remove ${section.title} entry ${index + 1}`}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </span>
                    </div>
                  )}
                  {section.fields.map((field) => {
                    const path = fieldPath(section, index, field.id)
                    const shown = showAll || touched.has(path)
                    return (
                      <FieldInput
                        key={field.id}
                        id={`f-${path.replace(/\./g, '-')}`}
                        field={field}
                        rules={rules}
                        value={entry[field.id]}
                        error={shown ? (errors.get(path) ?? null) : null}
                        onChange={(value) => onChange(setFieldValue(data, section, index, field.id, value))}
                        onBlur={() => onTouch(path)}
                      />
                    )
                  })}
                </div>
              ))}

            {isOpen && section.repeatable && (
              <button
                type="button"
                className="btn-sm button-accent self-start"
                disabled={entries.length >= rules.maxEntries}
                onClick={() => onChange(addEntry(data, section))}
              >
                <Plus size={14} /> Add {section.variants ? `${section.title.toLowerCase()} variant` : `${section.title.toLowerCase()} entry`}
              </button>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
