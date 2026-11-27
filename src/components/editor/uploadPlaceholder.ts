import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// One decoration widget per running image upload. The widgets live in plugin state (not in the
// document), are mapped through every transaction, and so keep their place while the author types:
// the position where the image will be inserted never moves under the cursor. A finished upload
// replaces its widget with the image node, a failed one just removes the widget.

interface WidgetSpec {
  uploadId: string
}

type PlaceholderMeta = { add: { uploadId: string; pos: number; name: string; order: number } } | { remove: string }

export const uploadPlaceholderKey = new PluginKey<DecorationSet>('uploadPlaceholder')

function widgetDom(name: string): HTMLElement {
  const el = document.createElement('span')
  el.className = 'upload-placeholder'
  el.setAttribute('contenteditable', 'false')
  el.textContent = `Uploading ${name}...`
  return el
}

/** The pure state transition, exported so the position mapping can be tested without a browser. */
export function applyPlaceholderMeta(
  set: DecorationSet,
  tr: Pick<Transaction, 'doc' | 'mapping' | 'getMeta'>,
  makeDom: (name: string) => HTMLElement = widgetDom,
): DecorationSet {
  let next = set.map(tr.mapping, tr.doc)
  const meta = tr.getMeta(uploadPlaceholderKey) as PlaceholderMeta | undefined
  if (!meta) return next
  if ('add' in meta) {
    const { uploadId, pos, name, order } = meta.add
    // `side` grows with the order, so several files for one position keep their order.
    next = next.add(tr.doc, [
      Decoration.widget(Math.min(pos, tr.doc.content.size), () => makeDom(name), { side: order, uploadId } satisfies WidgetSpec & { side: number }),
    ])
  } else {
    next = next.remove(next.find(undefined, undefined, (spec: WidgetSpec) => spec.uploadId === meta.remove))
  }
  return next
}

/** Where the widget of this upload is now, or null when the text around it was deleted. */
export function placeholderPos(state: EditorState, uploadId: string): number | null {
  const set = uploadPlaceholderKey.getState(state)
  const found = set?.find(undefined, undefined, (spec: WidgetSpec) => spec.uploadId === uploadId)[0]
  return found ? found.from : null
}

export const UploadPlaceholder = Extension.create({
  name: 'uploadPlaceholder',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: uploadPlaceholderKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => applyPlaceholderMeta(set, tr),
        },
        props: {
          decorations: (state) => uploadPlaceholderKey.getState(state),
        },
      }),
    ]
  },
})
