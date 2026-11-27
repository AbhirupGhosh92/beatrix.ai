// Client-side image editing for the editor: rotate by 90 degrees, flip, crop, encode as the source
// type. Everything is plain canvas code (no library). The geometry (rectangles in fractions of the
// image, pixel rounding, orientation) is pure so it can be tested without a browser.

/** Largest side, in pixels, of an image the editor reads or produces. */
export const MAX_EDIT_SIDE = 8000
/** Quality used when the source is a JPEG. */
export const JPEG_QUALITY = 0.92

export type EditOp = 'rotate-left' | 'rotate-right' | 'flip-h' | 'flip-v'

/** A rectangle in fractions (0..1) of the image as it is displayed (after the operations so far). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const FULL_RECT: Rect = { x: 0, y: 0, w: 1, h: 1 }

/** The smallest crop side, as a fraction of the image. */
export const MIN_FRACTION = 0.02

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The crop rectangle after one operation, so the box follows the picture it frames. */
export function rectAfter(rect: Rect, op: EditOp): Rect {
  switch (op) {
    case 'rotate-right':
      return { x: 1 - rect.y - rect.h, y: rect.x, w: rect.h, h: rect.w }
    case 'rotate-left':
      return { x: rect.y, y: 1 - rect.x - rect.w, w: rect.h, h: rect.w }
    case 'flip-h':
      return { ...rect, x: 1 - rect.x - rect.w }
    case 'flip-v':
      return { ...rect, y: 1 - rect.y - rect.h }
  }
}

/** The size of the picture after the operations (a quarter turn swaps width and height). */
export function orientedSize(width: number, height: number, ops: readonly EditOp[]): { width: number; height: number } {
  const turned = ops.filter((op) => op === 'rotate-left' || op === 'rotate-right').length % 2 === 1
  return turned ? { width: height, height: width } : { width, height }
}

/** The crop in whole pixels of a picture of this size; always at least 1 x 1 and inside it. */
export function cropPixels(rect: Rect, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const x = clamp(Math.round(rect.x * width), 0, width - 1)
  const y = clamp(Math.round(rect.y * height), 0, height - 1)
  return {
    x,
    y,
    width: clamp(Math.round(rect.w * width), 1, width - x),
    height: clamp(Math.round(rect.h * height), 1, height - y),
  }
}

/** Moves a rectangle by a fraction offset, keeping it inside the image. */
export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.w), y: clamp(rect.y + dy, 0, 1 - rect.h) }
}

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

/** Drags a handle by a fraction offset: only the edges the handle touches move, the others stay. */
export function resizeRect(rect: Rect, handle: Handle, dx: number, dy: number): Rect {
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.w
  let bottom = rect.y + rect.h
  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN_FRACTION)
  if (handle.includes('e')) right = clamp(right + dx, left + MIN_FRACTION, 1)
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN_FRACTION)
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN_FRACTION, 1)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

/** Grows (positive) or shrinks the box by fractions of the image, keeping its top left corner. */
export function sizeRect(rect: Rect, dw: number, dh: number): Rect {
  return {
    ...rect,
    w: clamp(rect.w + dw, MIN_FRACTION, 1 - rect.x),
    h: clamp(rect.h + dh, MIN_FRACTION, 1 - rect.y),
  }
}

export const isFullRect = (rect: Rect) => rect.x <= 0 && rect.y <= 0 && rect.w >= 1 && rect.h >= 1

/** Types the editor can re-encode. GIF is read-only here: re-encoding would drop its animation. */
const ENCODABLE = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function canEditType(type: string): boolean {
  return ENCODABLE.has(type)
}

export function extensionFor(type: string): string {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'
}

// ---- canvas helpers (browser only) ----

function newCanvas(width: number, height: number): HTMLCanvasElement {
  if (width < 1 || height < 1 || width > MAX_EDIT_SIDE || height > MAX_EDIT_SIDE) {
    throw new Error(`The image is too large to edit (at most ${MAX_EDIT_SIDE} pixels on a side).`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot edit images.')
  return ctx
}

/** A copy of the source scaled so its larger side is at most `maxSide` (the source itself when smaller). */
export function toCanvas(source: CanvasImageSource & { width: number; height: number }, maxSide?: number): HTMLCanvasElement {
  const scale = maxSide ? Math.min(1, maxSide / Math.max(source.width, source.height)) : 1
  const canvas = newCanvas(Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)))
  context(canvas).drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

function applyOp(canvas: HTMLCanvasElement, op: EditOp): HTMLCanvasElement {
  const turn = op === 'rotate-left' || op === 'rotate-right'
  const out = newCanvas(turn ? canvas.height : canvas.width, turn ? canvas.width : canvas.height)
  const ctx = context(out)
  if (op === 'rotate-right') {
    ctx.translate(out.width, 0)
    ctx.rotate(Math.PI / 2)
  } else if (op === 'rotate-left') {
    ctx.translate(0, out.height)
    ctx.rotate(-Math.PI / 2)
  } else if (op === 'flip-h') {
    ctx.translate(out.width, 0)
    ctx.scale(-1, 1)
  } else {
    ctx.translate(0, out.height)
    ctx.scale(1, -1)
  }
  ctx.drawImage(canvas, 0, 0)
  return out
}

/** The picture after the operations, in order (each one acts on what the author sees). */
export function orient(base: HTMLCanvasElement, ops: readonly EditOp[]): HTMLCanvasElement {
  return ops.reduce(applyOp, base)
}

/** The final picture: operations, then the crop, from the current image at full size. */
export function renderEdit(source: CanvasImageSource & { width: number; height: number }, ops: readonly EditOp[], crop: Rect): HTMLCanvasElement {
  const oriented = orient(toCanvas(source), ops)
  const box = cropPixels(crop, oriented.width, oriented.height)
  if (box.width === oriented.width && box.height === oriented.height) return oriented
  const out = newCanvas(box.width, box.height)
  context(out).drawImage(oriented, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)
  return out
}

/** Encodes as the source type (PNG, JPEG at 0.92, WebP); rejects when the browser cannot. */
export function encodeCanvas(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob && blob.type === type ? resolve(blob) : reject(new Error('This browser could not save the edited image.'))),
      type,
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    )
  })
}

export interface LoadedImage {
  image: HTMLImageElement
  type: string
}

/** Reads a same-origin image (so the canvas is never tainted) together with its type. */
export async function loadImage(url: string): Promise<LoadedImage> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error('The image could not be loaded.')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    if (Math.max(image.naturalWidth, image.naturalHeight) > MAX_EDIT_SIDE) {
      throw new Error(`The image is too large to edit (at most ${MAX_EDIT_SIDE} pixels on a side).`)
    }
    return { image, type: blob.type }
  } finally {
    // The decoded bitmap stays usable after the URL is released.
    URL.revokeObjectURL(objectUrl)
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read.'))
    reader.readAsDataURL(blob)
  })
}
