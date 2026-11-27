// Pure color helpers for the blog reader. A color here has already passed `isHexColor` (#rrggbb).

function channel(hex: string, start: number): number {
  const v = parseInt(hex.slice(start, start + 2), 16) / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a #rrggbb color. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
}

/** The text color (#000000 or #ffffff) that reads best on the given #rrggbb background. */
export function readableInk(hex: string): '#000000' | '#ffffff' {
  // Black wins when its contrast (L + 0.05) / 0.05 beats white's 1.05 / (L + 0.05), i.e. L > about 0.179.
  return luminance(hex) > 0.179 ? '#000000' : '#ffffff'
}
