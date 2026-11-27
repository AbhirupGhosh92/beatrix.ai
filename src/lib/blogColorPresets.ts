// The text color presets offered by the editor. The stored value of a preset is always its hex
// (exactly #rrggbb, like any free color). A preset is recognised again by that hex and drawn with a
// fixed class `blog-cp-<id>` whose shade is tuned per theme in src/styles/components/blog-content.css
// (no single color reaches 4.5:1 on white, the dark theme and paper at once), so presets stay readable
// in the site and reader themes while a free color is shown exactly as chosen. No imports on purpose.

export const TEXT_PRESETS: ReadonlyArray<{ id: string; name: string; hex: string }> = [
  { id: 'red', name: 'Red', hex: '#c0392b' },
  { id: 'orange', name: 'Orange', hex: '#d35400' },
  { id: 'amber', name: 'Amber', hex: '#b7791f' },
  { id: 'green', name: 'Green', hex: '#2f855a' },
  { id: 'teal', name: 'Teal', hex: '#0f766e' },
  { id: 'blue', name: 'Blue', hex: '#2b6cb0' },
  { id: 'violet', name: 'Violet', hex: '#6b46c1' },
  { id: 'pink', name: 'Pink', hex: '#b83280' },
  { id: 'gray', name: 'Gray', hex: '#718096' },
]

// Lookup: the class comes from this table built from the constants above, never from stored text.
const PRESET_CLASS = new Map<string, string>(TEXT_PRESETS.map((p) => [p.hex, `blog-cp-${p.id}`]))

/** The fixed class of a preset text color (lowercase #rrggbb), or null for a free color. */
export function presetClass(hex: string): string | null {
  return PRESET_CLASS.get(hex) ?? null
}
