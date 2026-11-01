// The Resume Score: a number from 0 to 100 from a few fixed rules over the resume's own content,
// computed in the browser and never sent anywhere. It reads the real data only (no sample text), so
// an empty resume scores 0. The weights below are the whole policy; tune them here.
import {
  activeVariant,
  entriesOf,
  isBlank,
  type ResumeData,
  type ResumeView,
  type SectionData,
  type SectionDef,
  type Structure,
} from '../resumeValidation.ts'

export interface ScoreReason {
  /** Points this rule cost. */
  points: number
  message: string
}

export interface ScoreResult {
  score: number
  reasons: ScoreReason[]
}

const WEIGHTS = { required: 30, sections: 20, prose: 15, bullets: 20, results: 15 } as const
const PROSE_GOOD = 150
const PROSE_MAX = 800
const BULLET_MIN = 30
const BULLET_MAX = 220

/** The entries that count for scoring: all of a plain section, filled entries of a repeatable one, only the active variant. */
function usedEntries(section: SectionDef, data: ResumeData, view: ResumeView | null | undefined): SectionData[] {
  if (!section.repeatable) {
    const value = data[section.id]
    return value && !Array.isArray(value) ? [value] : []
  }
  const entries = entriesOf(section, data[section.id])
  const picked = section.variants ? entries.filter((_, index) => index === activeVariant(section, data, view)) : entries
  return picked.filter((entry) => !isBlank(Object.values(entry)))
}

const lose = (weight: number, ratio: number) => Math.round(weight * (1 - Math.min(Math.max(ratio, 0), 1)) * 10) / 10

export function scoreResume(structure: Structure, data: ResumeData, view?: ResumeView | null): ScoreResult {
  const reasons: ScoreReason[] = []
  const add = (points: number, message: string) => {
    if (points > 0) reasons.push({ points, message })
  }

  let required = 0
  let requiredFilled = 0
  const emptySections: string[] = []
  const prose: number[] = []
  const bullets: string[] = []

  for (const section of structure.sections) {
    const entries = usedEntries(section, data, view)
    if (entries.length === 0 || entries.every((entry) => isBlank(Object.values(entry)))) emptySections.push(section.title)
    // A section with no entries still has its required fields to fill; repeatable ones need only one entry.
    const checked = entries.length > 0 ? entries.slice(0, 1) : [{} as SectionData]
    for (const entry of checked) {
      for (const field of section.fields) {
        if (field.required) {
          required += 1
          if (!isBlank(entry[field.id])) requiredFilled += 1
        }
      }
    }
    for (const entry of entries) {
      for (const field of section.fields) {
        const value = entry[field.id]
        if (field.type === 'textarea' && typeof value === 'string' && value.trim()) prose.push(value.trim().length)
        if (field.type === 'bullets' && Array.isArray(value)) bullets.push(...value.map((item) => item.trim()).filter((item) => item !== ''))
      }
    }
  }

  const missing = required - requiredFilled
  add(lose(WEIGHTS.required, required === 0 ? 1 : requiredFilled / required), `${missing} required ${missing === 1 ? 'field is' : 'fields are'} empty.`)

  const filledSections = structure.sections.length - emptySections.length
  add(
    lose(WEIGHTS.sections, structure.sections.length === 0 ? 1 : filledSections / structure.sections.length),
    `Empty sections: ${emptySections.slice(0, 4).join(', ')}${emptySections.length > 4 ? ', ...' : ''}.`,
  )

  const longest = Math.max(0, ...prose)
  if (longest === 0) add(WEIGHTS.prose, 'Add a short summary of your experience.')
  else if (longest < PROSE_GOOD) add(lose(WEIGHTS.prose, longest / PROSE_GOOD), `Your longest paragraph is short (${longest} characters); aim for ${PROSE_GOOD} or more.`)
  else if (longest > PROSE_MAX) add(WEIGHTS.prose / 2, `Your longest paragraph is long (${longest} characters); keep it under ${PROSE_MAX}.`)

  if (bullets.length === 0) {
    add(WEIGHTS.bullets, 'Describe your work with bullet points.')
    add(WEIGHTS.results, 'Add measurable results (numbers, percentages) to your bullet points.')
  } else {
    const sized = bullets.filter((item) => item.length >= BULLET_MIN && item.length <= BULLET_MAX).length
    add(lose(WEIGHTS.bullets, sized / bullets.length), `${bullets.length - sized} bullet ${bullets.length - sized === 1 ? 'point is' : 'points are'} too short or too long (${BULLET_MIN}-${BULLET_MAX} characters works best).`)
    const measured = bullets.filter((item) => /\d/.test(item)).length
    add(lose(WEIGHTS.results, measured / bullets.length / 0.5), 'Few bullet points show measurable results; add numbers or percentages.')
  }

  const lost = reasons.reduce((sum, reason) => sum + reason.points, 0)
  return { score: Math.max(0, Math.min(100, Math.round(100 - lost))), reasons: reasons.sort((a, b) => b.points - a.points) }
}
