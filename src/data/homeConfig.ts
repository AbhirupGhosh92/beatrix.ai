// Shape of the landing page config (cms/home-config.json), kept apart from the bio profile.
// Keep home-config.example.json in step: it supplies every key a stored file lacks.

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
}
