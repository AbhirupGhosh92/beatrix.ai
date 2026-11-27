'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { NodeSelection } from '@tiptap/pm/state'
import { AlignCenter, AlignLeft, AlignRight, Crop } from 'lucide-react'
import { IMAGE_ALIGNS, IMAGE_SIZES, MAX_CAPTION_LENGTH } from '../../lib/blogDoc.ts'
import ImageEditor from './ImageEditor.tsx'
import { blobToBase64 } from './imageTransform.ts'
import type { RichEditorHost } from './types.ts'

// The toolbar shown while an image is selected: size, alignment, description (alt), caption and, for an
// uploaded image, "Edit image" (crop, rotate, flip). External images are not editable: their pixels cannot
// be read into a canvas and they are not ours to store again.

interface Props {
  editor: Editor
  images: RichEditorHost['images']
  /** New image id -> the first (root) image id of its edit chain. Cleared by the editor after a save. */
  edits: Map<string, string>
  onError: (message: string) => void
}

const SIZE_LABEL: Record<(typeof IMAGE_SIZES)[number], string> = { small: 'Small', medium: 'Medium', full: 'Full width' }
const ALIGN_ICON = { left: AlignLeft, center: AlignCenter, right: AlignRight }
const ALIGN_LABEL: Record<(typeof IMAGE_ALIGNS)[number], string> = { left: 'Align left', center: 'Align center', right: 'Align right' }

interface Selected {
  pos: number
  imageId: string
  alt: string
  size: string
  align: string
  /** null: never set (the reader shows the description as the caption). */
  caption: string | null
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  return `${Math.floor(bytes / 1024)} KB`
}

export default function ImageToolbar({ editor, images, edits, onError }: Props) {
  // The position of the image being edited, while its dialog is open.
  const [editing, setEditing] = useState<{ pos: number; imageId: string } | null>(null)

  const selected = useEditorState({
    editor,
    selector: ({ editor: e }): Selected | null => {
      const sel = e.state.selection
      if (!(sel instanceof NodeSelection) || sel.node.type.name !== 'image') return null
      const a = sel.node.attrs
      return {
        pos: sel.from,
        imageId: typeof a.imageId === 'string' ? a.imageId : '',
        alt: typeof a.alt === 'string' ? a.alt : '',
        size: typeof a.size === 'string' ? a.size : '',
        align: typeof a.align === 'string' ? a.align : '',
        caption: typeof a.caption === 'string' ? a.caption : null,
      }
    },
  })

  /** Changes attributes of the selected image. The first change also writes `caption: ""`, so the description does not suddenly show as a caption. */
  const change = (partial: Record<string, string | null>) => {
    if (!selected) return
    const attrs = selected.caption === null && !('caption' in partial) ? { ...partial, caption: '' } : partial
    editor.commands.updateAttributes('image', attrs)
  }

  const swapTo = (pos: number, expectedId: string, newId: string) => {
    const node = editor.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'image' || node.attrs.imageId !== expectedId) {
      throw new Error('The image changed while it was being edited.')
    }
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, imageId: newId }))
  }

  /** Stores the edited picture as a new image and swaps it in, keeping size, alignment, description and caption. */
  const applyEdit = async (blob: Blob, extension: string) => {
    if (!editing) return
    if (images.limits.remaining() <= 0) {
      throw new Error(`${images.messages?.limitReached ?? 'No more images can be added.'} Remove an image or save first.`)
    }
    if (blob.size > images.limits.maxBytes) {
      throw new Error(`The edited image is over the ${formatBytes(images.limits.maxBytes)} limit.`)
    }
    const dataBase64 = await blobToBase64(blob)
    const stored = await images.upload({ name: `edited.${extension}`, dataBase64, uploadId: `edit-${Date.now()}` })
    const root = edits.get(editing.imageId) ?? editing.imageId
    swapTo(editing.pos, editing.imageId, stored.id)
    edits.set(stored.id, root)
    images.onReplaced?.(editing.imageId)
  }

  const resetEdit = () => {
    if (!editing) return
    const root = edits.get(editing.imageId)
    if (!root) return
    try {
      swapTo(editing.pos, editing.imageId, root)
      images.onReplaced?.(editing.imageId)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'The image could not be reset.')
    }
  }

  const stay = (event: { preventDefault: () => void }) => event.preventDefault()

  return (
    <>
      <BubbleMenu
        editor={editor}
        pluginKey="imageToolbar"
        className="editor-bubble"
        options={{ placement: 'bottom', offset: 8, flip: true, shift: { padding: 8 } }}
        shouldShow={({ state, element }) =>
          state.selection instanceof NodeSelection &&
          state.selection.node.type.name === 'image' &&
          editor.isEditable &&
          (editor.view.hasFocus() || element.contains(document.activeElement))
        }
      >
        {selected && (
          <div className="image-toolbar" role="toolbar" aria-label="Image" data-image-toolbar="">
            <div className="editor-toolbar-group" role="group" aria-label="Size">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="image-toolbar-choice"
                  aria-pressed={selected.size === size}
                  onMouseDown={stay}
                  onClick={() => change({ size: selected.size === size ? null : size })}
                >
                  {SIZE_LABEL[size]}
                </button>
              ))}
            </div>
            <div className="editor-toolbar-group" role="group" aria-label="Alignment">
              {IMAGE_ALIGNS.map((align) => {
                const Icon = ALIGN_ICON[align]
                return (
                  <button
                    key={align}
                    type="button"
                    className="editor-tool"
                    aria-label={ALIGN_LABEL[align]}
                    title={ALIGN_LABEL[align]}
                    aria-pressed={selected.align === align}
                    onMouseDown={stay}
                    onClick={() => change({ align: selected.align === align ? null : align })}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            <div className="image-toolbar-fields">
              <label className="image-toolbar-field">
                <span>Description (alt text)</span>
                <input
                  className="input input-bordered"
                  value={selected.alt}
                  maxLength={500}
                  onChange={(event) => change({ alt: event.target.value })}
                />
              </label>
              <label className="image-toolbar-field">
                <span>Caption</span>
                <input
                  className="input input-bordered"
                  value={selected.caption ?? ''}
                  maxLength={MAX_CAPTION_LENGTH}
                  placeholder="No caption"
                  onChange={(event) => change({ caption: event.target.value })}
                />
              </label>
            </div>
            {selected.imageId && (
              <button
                type="button"
                className="button-secondary flex items-center gap-2"
                onMouseDown={stay}
                onClick={() => setEditing({ pos: selected.pos, imageId: selected.imageId })}
              >
                <Crop size={16} aria-hidden="true" /> Edit image
              </button>
            )}
          </div>
        )}
      </BubbleMenu>
      {editing && (
        <ImageEditor
          url={images.imageUrl(editing.imageId)}
          canReset={edits.has(editing.imageId)}
          onReset={resetEdit}
          onApply={applyEdit}
          onClose={() => {
            setEditing(null)
            editor.commands.focus()
          }}
        />
      )}
    </>
  )
}
