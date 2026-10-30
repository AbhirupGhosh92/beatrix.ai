// Merges a stored JSON file over its committed example so keys added later still have a value.

export type Json = Record<string, unknown>

export const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** `value` wins; keys it lacks (e.g. a file saved before a field was added) come from `base`. */
export function withDefaults(base: Json, value: Json): Json {
  const out: Json = { ...base }
  for (const [key, v] of Object.entries(value)) {
    const b = base[key]
    out[key] = isObject(b) && isObject(v) ? withDefaults(b, v) : v
  }
  return out
}
