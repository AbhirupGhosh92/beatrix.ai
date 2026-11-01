// Pure helpers for a resume's view: the section order and which variant of a variants section is
// exported. They never touch the structure, which is why base users can use them. The first
// section of a structure is the header (name and contact line) and always stays on top.
import {
  entriesOf,
  type ResumeData,
  type ResumeView,
  type SectionDef,
  type Structure,
} from '../resumeValidation.ts'

/** `sections` in the view's order; sections the order does not name keep their place after the named ones. */
export function orderSections<T extends { id: string }>(sections: readonly T[], view: ResumeView | null | undefined): T[] {
  const order = view?.sectionOrder
  if (!order) return [...sections]
  const rank = (section: T) => {
    const at = order.indexOf(section.id)
    return at === -1 ? order.length : at
  }
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => rank(a.section) - rank(b.section) || a.index - b.index)
    .map((item) => item.section)
}

/** The sections as they are shown and exported: the header first, then the rest in the view's order. */
export function displaySections(structure: Structure, view: ResumeView | null | undefined): SectionDef[] {
  const [first, ...rest] = structure.sections
  return first ? [first, ...orderSections(rest, view)] : []
}

/** A complete order (every section id once, header first) for the structure and view. */
export function fullOrder(structure: Structure, view: ResumeView | null | undefined): string[] {
  return displaySections(structure, view).map((section) => section.id)
}

/** Moves a section to where another one is. The header cannot move or be displaced. */
export function reorder(structure: Structure, view: ResumeView | undefined, fromId: string, toId: string): ResumeView {
  const header = structure.sections[0]?.id
  const order = fullOrder(structure, view)
  const from = order.indexOf(fromId)
  const to = order.indexOf(toId)
  if (from <= 0 || to <= 0 || from === to || fromId === header) return { ...view, sectionOrder: order }
  order.splice(to, 0, order.splice(from, 1)[0])
  return { ...view, sectionOrder: order }
}

/** Moves a section one place up (-1) or down (1) among the movable sections. */
export function shift(structure: Structure, view: ResumeView | undefined, id: string, delta: -1 | 1): ResumeView {
  const order = fullOrder(structure, view)
  const target = order[order.indexOf(id) + delta]
  return target ? reorder(structure, view, id, target) : { ...view, sectionOrder: order }
}

export function setActiveVariant(view: ResumeView | undefined, sectionId: string, index: number): ResumeView {
  return { ...view, activeVariants: { ...view?.activeVariants, [sectionId]: index } }
}

/** Keeps the active variant on the same entry after entry `removed` was deleted from a variants section. */
export function afterVariantRemoved(view: ResumeView | undefined, sectionId: string, removed: number): ResumeView | undefined {
  const active = view?.activeVariants?.[sectionId]
  if (view === undefined || active === undefined) return view
  const next = removed < active ? active - 1 : removed === active ? 0 : active
  return setActiveVariant(view, sectionId, next)
}

/**
 * Fits a view to a structure and its data after either changed: the order keeps surviving
 * sections and appends new ones, and active variants that no longer point at an entry are dropped.
 * Undefined stays undefined (no view stored, the structure's own order applies).
 */
export function fitView(structure: Structure, data: ResumeData, view: ResumeView | undefined): ResumeView | undefined {
  if (view === undefined) return undefined
  const out: ResumeView = {}
  if (view.sectionOrder) out.sectionOrder = fullOrder(structure, view)
  if (view.activeVariants) {
    const kept: Record<string, number> = {}
    for (const section of structure.sections) {
      const index = view.activeVariants[section.id]
      if (section.variants && index !== undefined && index < entriesOf(section, data[section.id]).length) kept[section.id] = index
    }
    if (Object.keys(kept).length > 0) out.activeVariants = kept
  }
  return out
}
