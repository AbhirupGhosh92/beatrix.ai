// Estimated reading time of a post (design D9): words / 220 rounded up, at least one minute.
// A rich post counts the text nodes of its document; a legacy post counts its Markdown body.
const WORDS_PER_MINUTE = 220

function wordsIn(text: string): number {
  const matches = text.match(/[^\s]+/g)
  return matches ? matches.length : 0
}

function docWords(node: unknown): number {
  if (typeof node !== 'object' || node === null) return 0
  const n = node as { text?: unknown; content?: unknown }
  let total = typeof n.text === 'string' ? wordsIn(n.text) : 0
  if (Array.isArray(n.content)) for (const child of n.content) total += docWords(child)
  return total
}

export function readMinutes(post: { format?: string; body?: string; content?: unknown }): number {
  const words = post.format === 'doc' ? docWords(post.content) : wordsIn(post.body ?? '')
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
