// Shape of the landing page config (cms/home-config.json), kept apart from the bio profile.
// Keep home-config.example.json in step: it supplies every key a stored file lacks.

/** Closed icon vocabulary for the feature cards and steps; `components/ui/landingIcons.ts` maps each to a lucide icon. */
export const HOME_ICONS = [
  'file-text',
  'sparkles',
  'target',
  'kanban',
  'shield',
  'lock',
  'layout-template',
  'download',
  'gauge',
  'users',
] as const

export type HomeIcon = (typeof HOME_ICONS)[number]

export interface FeatureItem {
  id: string
  title: string
  description: string
  icon: HomeIcon
  /** Shows `previewLabel` on the card (a placeholder AI result). */
  preview?: boolean
}

export interface StepItem {
  title: string
  description: string
  icon: HomeIcon
}

/** List limits enforced by `sanitizeHomeConfig`. */
export const HOME_LIMITS = {
  featuresMin: 1,
  featuresMax: 12,
  stepsMin: 1,
  stepsMax: 6,
  titleMax: 80,
  descriptionMax: 280,
  headingMax: 160,
} as const

export interface HomeConfig {
  /** Headline of the landing page. */
  title: string
  /** One line under the headline. */
  tagline: string
  /** Google sign-in button label (anonymous visitors). */
  signInLabel: string
  /** Shown while the sign-in popup is open. */
  signingInLabel: string
  /** Error texts; `{email}` in `restrictedError` is replaced by the account's address. */
  restrictedError: string
  unknownEmail: string
  failedError: string
  /** Signed-in state. */
  signedInTitle: string
  signedInMessage: string
  /** Button that opens the drawer (only shown when the drawer has entries). */
  openMenuLabel: string
  /** Button to the About page. */
  aboutLabel: string
  aboutHref: string
  /** Small label above the headline. */
  eyebrow: string
  /** Badge text on a feature whose result is a placeholder. */
  previewLabel: string
  features: { heading: string; intro: string; items: FeatureItem[] }
  howItWorks: { heading: string; intro: string; steps: StepItem[] }
  /** Closing call to action (reuses the sign-in labels). */
  closing: { title: string; message: string }
}
