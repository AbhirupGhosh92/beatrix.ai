// Pure helpers behind the JSON tree editor: every function takes a document and returns a new one
// (or a refusal), so the component keeps no second copy of the JSON. Key order is preserved.

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type JsonKind = 'string' | 'number' | 'boolean' | 'null' | 'map' | 'array'
export type JsonPath = (string | number)[]

export const JSON_KINDS: JsonKind[] = ['string', 'number', 'boolean', 'null', 'map', 'array']

export function kindOf(value: JsonValue): JsonKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'map'
  return typeof value as 'string' | 'number' | 'boolean'
}

export function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null
}

/** Parse text for the tree; `ok` is false for a syntax error (a valid `null` document is still ok). */
export function parseDocument(text: string): { ok: true; value: JsonValue } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as JsonValue }
  } catch {
    return { ok: false }
  }
}

export function stringify(value: JsonValue): string {
  return JSON.stringify(value, null, 2)
}

export function getAt(root: JsonValue, path: JsonPath): JsonValue | undefined {
  let node: JsonValue | undefined = root
  for (const step of path) {
    if (node === undefined || !isContainer(node)) return undefined
    node = (node as Record<string | number, JsonValue>)[step]
  }
  return node
}

/** Replace the value at `path`, copying only the containers on the way down. */
export function setAt(root: JsonValue, path: JsonPath, value: JsonValue): JsonValue {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(root)) {
    const next = root.slice()
    next[head as number] = setAt(root[head as number], rest, value)
    return next
  }
  if (isContainer(root)) {
    return { ...root, [head]: setAt((root as Record<string, JsonValue>)[head as string], rest, value) }
  }
  return root
}

/** Remove the entry at `path` (the root cannot be removed). */
export function removeAt(root: JsonValue, path: JsonPath): JsonValue {
  if (path.length === 0) return root
  const parentPath = path.slice(0, -1)
  const last = path[path.length - 1]
  const parent = getAt(root, parentPath)
  if (parent === undefined) return root
  if (Array.isArray(parent)) {
    return setAt(root, parentPath, parent.filter((_, i) => i !== last))
  }
  if (isContainer(parent)) {
    const copy = { ...(parent as Record<string, JsonValue>) }
    delete copy[last as string]
    return setAt(root, parentPath, copy)
  }
  return root
}

/** A key not yet used in `map`, starting from `base` ("key", "key2", ...). */
export function uniqueKey(map: { [key: string]: JsonValue }, base = 'key'): string {
  if (!(base in map)) return base
  let n = 2
  while (`${base}${n}` in map) n++
  return `${base}${n}`
}

/** Append an empty string entry to the map or array at `path`. */
export function addChild(root: JsonValue, path: JsonPath): JsonValue {
  const target = getAt(root, path)
  if (Array.isArray(target)) return setAt(root, path, [...target, ''])
  if (target !== undefined && isContainer(target)) {
    const map = target as { [key: string]: JsonValue }
    return setAt(root, path, { ...map, [uniqueKey(map)]: '' })
  }
  return root
}

export type RenameResult = { ok: true; root: JsonValue } | { ok: false; error: string }

/** Rename a map key in place (order kept); refuses an empty key or one already in the same map. */
export function renameKey(root: JsonValue, path: JsonPath, newKey: string): RenameResult {
  const parentPath = path.slice(0, -1)
  const oldKey = path[path.length - 1]
  const parent = getAt(root, parentPath)
  if (parent === undefined || !isContainer(parent) || Array.isArray(parent) || typeof oldKey !== 'string') {
    return { ok: false, error: 'This entry has no key.' }
  }
  if (newKey === oldKey) return { ok: true, root }
  if (newKey === '') return { ok: false, error: 'A key cannot be empty.' }
  if (Object.prototype.hasOwnProperty.call(parent, newKey)) return { ok: false, error: `The key "${newKey}" already exists.` }
  const renamed: { [key: string]: JsonValue } = {}
  for (const [k, v] of Object.entries(parent as { [key: string]: JsonValue })) renamed[k === oldKey ? newKey : k] = v
  return { ok: true, root: setAt(root, parentPath, renamed) }
}

/** Move an array item up (-1) or down (+1); out of range changes nothing. */
export function moveItem(root: JsonValue, path: JsonPath, delta: -1 | 1): JsonValue {
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  const parent = getAt(root, parentPath)
  if (!Array.isArray(parent) || typeof index !== 'number') return root
  const target = index + delta
  if (target < 0 || target >= parent.length) return root
  const next = parent.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return setAt(root, parentPath, next)
}

/** Text -> number for a number field; null while the text is not a finite number. */
export function parseNumber(text: string): number | null {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** A value of another type, converted without inventing data: maps and arrays start empty. */
export function convert(value: JsonValue, kind: JsonKind): JsonValue {
  if (kindOf(value) === kind) return value
  switch (kind) {
    case 'string':
      return value === null || isContainer(value) ? '' : String(value)
    case 'number':
      return typeof value === 'string' ? (parseNumber(value) ?? 0) : typeof value === 'boolean' ? Number(value) : 0
    case 'boolean':
      return typeof value === 'string' ? value.trim().toLowerCase() === 'true' : typeof value === 'number' ? value !== 0 : false
    case 'null':
      return null
    case 'map':
      return {}
    case 'array':
      return []
  }
}

/** Whether this node, its key or any descendant contains the search text (case-insensitive). */
export function matchesSearch(value: JsonValue, key: string | number | null, term: string): boolean {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  if (key !== null && String(key).toLowerCase().includes(needle)) return true
  if (Array.isArray(value)) return value.some((item, i) => matchesSearch(item, i, needle))
  if (isContainer(value)) {
    return Object.entries(value as { [key: string]: JsonValue }).some(([k, v]) => matchesSearch(v, k, needle))
  }
  return String(value).toLowerCase().includes(needle)
}
