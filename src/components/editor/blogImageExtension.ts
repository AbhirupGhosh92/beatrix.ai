import { nodeInputRule } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { IMAGE_ALIGNS, IMAGE_SIZES, MAX_CAPTION_LENGTH, isHttpsImageUrl } from '../../lib/blogDoc.ts'

// The editor's image node. It stores exactly what src/lib/blogDoc.ts allows: an uploaded image (`imageId`)
// or an external one (`src`), the description (`alt`), and the optional `size`, `align` and `caption`.
// Invalid values parse to null; defaults are never written, so an old image stays as it was saved.

const IMAGE_ID = /^[A-Za-z0-9_-]{1,100}$/

// The classes are the reader's (BlogContent.tsx), chosen from lookup tables so stored text never reaches `class`.
const SIZE_CLASS = new Map<string, string>(IMAGE_SIZES.map((v) => [v, `blog-img-size-${v}`]))
const ALIGN_CLASS = new Map<string, string>(IMAGE_ALIGNS.map((v) => [v, `blog-img-align-${v}`]))

const choice = (allowed: readonly string[], value: unknown): string | null => allowed.find((v) => v === value) ?? null

const captionOf = (value: unknown): string | null =>
  typeof value === 'string' && Array.from(value).length <= MAX_CAPTION_LENGTH ? value : null

interface ImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, unknown>
  resize: false
  /** The address of a stored image as the host gives it now (read when rendered, never frozen at mount). */
  imageUrl: (id: string) => string
}

// `![alt](https://...)` typed in the editor; any other source is not turned into an image.
const IMAGE_INPUT = /(?:^|\s)(!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\))$/

/** `legacyScheme`: the Markdown image scheme to import (none: Markdown images are dropped). */
export const createImage = (legacyScheme: string | null) =>
  Image.extend<ImageOptions>({
    addOptions() {
      return {
        inline: false,
        allowBase64: false,
        HTMLAttributes: {},
        resize: false,
        imageUrl: () => '',
      }
    },
    addAttributes() {
      return {
        imageId: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('data-image-id'),
        },
        src: {
          default: null,
          parseHTML: (el: HTMLElement) => {
            if (el.hasAttribute('data-image-id')) return null
            const src = el.getAttribute('src')
            return isHttpsImageUrl(src) ? src : null
          },
        },
        alt: { default: null },
        size: { default: null, parseHTML: (el: HTMLElement) => choice(IMAGE_SIZES, el.getAttribute('data-size')) },
        align: { default: null, parseHTML: (el: HTMLElement) => choice(IMAGE_ALIGNS, el.getAttribute('data-align')) },
        caption: { default: null, parseHTML: (el: HTMLElement) => captionOf(el.getAttribute('data-caption')) },
      }
    },
    parseHTML() {
      // The figcaption text is the caption attribute, not a paragraph after the image.
      return [{ tag: 'img[data-image-id]' }, { tag: 'img[src^="https://"]' }, { tag: 'figcaption', ignore: true }]
    },
    renderHTML({ node }) {
      const alt = String(node.attrs.alt ?? '')
      const size = choice(IMAGE_SIZES, node.attrs.size)
      const align = choice(IMAGE_ALIGNS, node.attrs.align)
      const caption = captionOf(node.attrs.caption)
      const extra: Record<string, string> = {
        ...(size ? { 'data-size': size } : {}),
        ...(align ? { 'data-align': align } : {}),
        ...(caption !== null ? { 'data-caption': caption } : {}),
      }
      let img: [string, Record<string, string>]
      if (node.attrs.imageId) {
        const imageId = String(node.attrs.imageId)
        const url = this.options.imageUrl(imageId)
        img = ['img', { ...(url ? { src: url } : {}), alt, 'data-image-id': imageId, loading: 'lazy', decoding: 'async', ...extra }]
      } else {
        const src = node.attrs.src
        img = [
          'img',
          {
            ...(isHttpsImageUrl(src) ? { src } : {}),
            alt,
            referrerPolicy: 'no-referrer',
            loading: 'lazy',
            decoding: 'async',
            ...extra,
          },
        ]
      }
      // An image with none of the new attributes renders exactly as before.
      if (!size && !align && caption === null) return img
      const className = [size ? SIZE_CLASS.get(size) : '', align ? ALIGN_CLASS.get(align) : ''].filter(Boolean).join(' ')
      return ['figure', className ? { class: className } : {}, img, ...(caption ? [['figcaption', caption]] : [])]
    },
    addInputRules() {
      return [
        nodeInputRule({
          find: IMAGE_INPUT,
          type: this.type,
          getAttributes: (match) => (isHttpsImageUrl(match[3]) ? { src: match[3], alt: match[2] || null } : false),
        }),
      ]
    },
    // Legacy Markdown: `![name](<scheme><id>)` becomes an image node; any other source is dropped.
    parseMarkdown: (token, helpers) => {
      const href = String(token.href ?? '')
      const id = legacyScheme && href.startsWith(legacyScheme) ? href.slice(legacyScheme.length) : ''
      if (!IMAGE_ID.test(id)) return []
      return helpers.createNode('image', {
        imageId: id,
        alt: token.text ? String(token.text) : null,
      })
    },
  })
