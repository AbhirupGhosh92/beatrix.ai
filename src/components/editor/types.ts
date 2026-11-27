import type { JSONContent } from '@tiptap/react'

// The contract between the rich-text editor and the screen that hosts it. The editor imports nothing
// from a host (no store, no blog types); a host passes what it needs through this object.

export type EditorInitial = { kind: 'empty' } | { kind: 'doc'; doc: JSONContent } | { kind: 'markdown'; markdown: string }

export interface RichEditorHost {
  initial: EditorInitial
  /** The aria-label of the textbox. */
  label: string
  images: {
    /** Where a stored image is displayed and edited from (an empty string while it has no address yet). */
    imageUrl(id: string): string
    /** Stores one image; rejects when it could not be stored (the host has already told the user why). */
    upload(file: { name: string; dataBase64: string; uploadId: string }): Promise<{ id: string; name: string }>
    limits: { maxBytes: number; remaining(): number; maxUrlLength: number }
    /** false stops the upload (a never-saved document the host could not save). */
    ensureSaved?(): Promise<boolean>
    /** true while the document has never been saved (ensureSaved then runs before the first upload); absent: ensureSaved always runs. */
    needsSave?(): boolean
    /** Wording the host wants for these two notices (the editor has neutral defaults). */
    messages?: { limitReached?: string; pickerRefused?: string }
    /** An edit replaced an image (the host removes the old one on save). */
    onReplaced?(oldId: string): void
    /** Markdown image scheme to import, e.g. `blog-image:`. */
    legacyScheme?: string
  }
  /** Every change, as the editor's document JSON (validated by the host before saving). */
  onDoc(doc: JSONContent): void
  onError(message: string): void
  /** An image upload is running or queued (true) or all are done (false); the host may hold its own save meanwhile. */
  onUploadingChange?(active: boolean): void
}
