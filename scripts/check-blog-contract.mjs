#!/usr/bin/env node
// Contract check for the blog: runs the REAL compiled `blog` Cloud Function (functions/lib/blog.js)
// against an in-memory fake of Firestore, Storage and Auth, and passes every response through the
// site's unwrap helpers (src/lib/blogResponses.ts, as src/middleware/blogService.ts does), so a
// disagreement between the function's response shapes and what the site expects fails here.
// Build the functions first: npm run functions:build. Run: node --experimental-strip-types scripts/check-blog-contract.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import Module from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'functions', 'package.json'))
process.env.GCLOUD_PROJECT = 'test-project'

// ---- in-memory fakes -------------------------------------------------------------------------
const docs = new Map() // "blog_posts/<id>" -> data
const files = new Map() // "<post>/<image>" -> Buffer
const LONG_NAME = 'N'.repeat(80)
const roles = {
  'admin@x.dev': { role: 'admin' }, // no displayName
  'writer@x.dev': { role: 'user-advanced', displayName: 'Wanda Writer' },
  'other@x.dev': { role: 'user-advanced', displayName: 'other@x.dev' }, // an email as a name must never show
  'long@x.dev': { role: 'user-advanced', displayName: LONG_NAME },
}

class DocSnap {
  constructor(id, data, path) { this.id = id; this.data_ = data; this.exists = data !== undefined; this.ref = new DocRef(path ?? id) }
  data() { return this.data_ === undefined ? undefined : structuredClone(this.data_) }
  get(f) { return this.data_?.[f] }
}
class DocRef {
  constructor(p) { this.path = p; this.id = p.split('/').pop() }
  async get() { return new DocSnap(this.id, docs.get(this.path), this.path) }
  async set(d) { docs.set(this.path, structuredClone(d)) }
  async create(d) { if (docs.has(this.path)) throw new Error('exists'); docs.set(this.path, structuredClone(d)) }
  async update(d) { docs.set(this.path, { ...docs.get(this.path), ...structuredClone(d) }) }
  async delete() { docs.delete(this.path) }
}
class Query {
  constructor(prefix, filters = [], lim = Infinity) { this.prefix = prefix; this.filters = filters; this.lim = lim }
  doc(id) { return new DocRef(this.prefix + '/' + id) }
  where(f, op, v) { return new Query(this.prefix, [...this.filters, [f, op, v]], this.lim) }
  orderBy(f, dir) { const q = new Query(this.prefix, this.filters, this.lim); q.order = [f, dir]; return q }
  limit(n) { const q = new Query(this.prefix, this.filters, n); q.order = this.order; return q }
  select() { return this }
  rows() {
    let rows = [...docs.entries()].filter(([k]) => k.startsWith(this.prefix + '/')).map(([k, v]) => new DocSnap(k.split('/').pop(), v, k))
    for (const [f, op, v] of this.filters) {
      rows = rows.filter((s) => {
        const x = s.data_[f]
        if (op === '==') return x === v
        if (op === '<') return x !== null && x !== undefined && x < v
        if (op === '>') return x !== null && x !== undefined && x > v
        throw new Error('fake: op ' + op)
      })
    }
    if (this.order) rows.sort((a, b) => String(b.data_[this.order[0]]).localeCompare(String(a.data_[this.order[0]])))
    return rows.slice(0, this.lim)
  }
  async get() { return { docs: this.rows() } }
  count() { return { get: async () => ({ data: () => ({ count: this.rows().length }) }) } }
}
const fakeDb = {
  doc: (p) => new DocRef(p),
  collection: (name) => new Query(name),
  getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
  recursiveDelete: async (ref) => { for (const k of [...docs.keys()]) if (k === ref.path || k.startsWith(ref.path + '/')) docs.delete(k) },
  runTransaction: async (fn) => fn({ get: (ref) => ref.get(), create: (ref, d) => ref.create(d), set: (ref, d) => ref.set(d), update: (ref, d) => ref.update(d), delete: (ref) => ref.delete() }),
}
class FakeFile {
  constructor(k) { this.k = k }
  async save(bytes) { files.set(this.k, Buffer.from(bytes)) }
  async download() { return [files.get(this.k)] }
  async delete() { files.delete(this.k) }
}
const fakeBucket = {
  file: (k) => new FakeFile(k),
  deleteFiles: async ({ prefix }) => { for (const k of [...files.keys()]) if (k.startsWith(prefix)) files.delete(k) },
}
const fakes = {
  'firebase-admin/app': { getApps: () => [1], initializeApp: () => {} },
  'firebase-admin/firestore': { getFirestore: () => fakeDb, FieldValue: { increment: (n) => n, serverTimestamp: () => new Date().toISOString() } },
  'firebase-admin/storage': { getStorage: () => ({ bucket: () => fakeBucket }) },
  'firebase-admin/auth': {
    getAuth: () => ({
      // The "cookie" is just the email here.
      verifySessionCookie: async (cookie) => ({ email: cookie, email_verified: true }),
    }),
  },
}
// allowed_emails lookups go through db().doc(); seed them as docs.
for (const [email, d] of Object.entries(roles)) docs.set(`allowed_emails/${email}`, d)

const load = Module._load
Module._load = function (request, ...rest) {
  return fakes[request] ?? load.call(this, request, ...rest)
}

// ---- call the real handler ------------------------------------------------------------------
const { blog } = require(path.join(root, 'functions', 'lib', 'blog.js'))
const { unwrapHeaders, unwrapImage, unwrapPost, unwrapPublicPost } = await import(path.join(root, 'src', 'lib', 'blogResponses.ts'))

const config = { writeRoles: ['admin', 'user-advanced'], maxTitleLength: 120, maxBodyLength: 50000, maxTagsPerPost: 8, maxTagLength: 30, maxImageBytes: 2097152, maxImagesPerPost: 10, maxPostsPerAuthor: 200, excerptLength: 160 }

async function call(action, cookie, fields = {}) {
  let status = 0
  let payload
  const res = { status(s) { status = s; return this }, json(b) { payload = b } }
  await blog({ method: 'POST', body: { action, ...(cookie ? { cookie } : {}), config, ...fields } }, res)
  return { status, payload }
}
const ok = async (action, cookie, fields) => {
  const r = await call(action, cookie, fields)
  assert.equal(r.status, 200, `${action}: ${JSON.stringify(r.payload)}`)
  return r.payload
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

// create -> flat post
const created = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Hello', body: 'Some **body**', tags: ['A', 'b'], status: 'published' }))
assert.equal(created.version, 1)
assert.deepEqual(created.tags, ['a', 'b'])
assert.equal(created.status, 'published')
assert.ok(created.publishedAt)
assert.deepEqual(created.images, [])

// image upload -> flat image, then reopen shows it
const image = unwrapImage(await ok('imageUpload', 'writer@x.dev', { id: created.id, name: 'p.png', dataBase64: PNG.toString('base64') }))
assert.equal(image.contentType, 'image/png')
const reopened = unwrapPost(await ok('get', 'writer@x.dev', { id: created.id }))
assert.equal(reopened.images.length, 1)
assert.equal(reopened.images[0].id, image.id)
assert.equal(reopened.version, 1, 'an upload does not bump the version')
const bytes = await ok('imageGet', 'writer@x.dev', { id: created.id, imageId: image.id })
assert.equal(bytes.contentType, 'image/png')

// update with the version read, and image removal
const updated = unwrapPost(await ok('save', 'writer@x.dev', { id: created.id, title: 'Hello 2', body: 'b', tags: [], status: 'published', version: reopened.version, removeImageIds: [image.id] }))
assert.equal(updated.version, 2)
assert.equal(updated.images.length, 0)
assert.equal((await call('save', 'writer@x.dev', { id: created.id, title: 'x', body: 'b', tags: [], status: 'draft', version: 1 })).status, 409)

// a draft never reaches the public headers, a published post does (and only public fields)
await ok('save', 'writer@x.dev', { title: 'Secret draft', body: 'hidden', tags: [], status: 'draft' })
const pub = unwrapHeaders(await ok('headers', null))
assert.equal(pub.length, 1)
assert.deepEqual(Object.keys(pub[0]).sort(), ['authorName', 'excerpt', 'id', 'publishedAt', 'tags', 'title'])
assert.equal(pub[0].title, 'Hello 2')

// ownership: another author gets 404, the admin can edit and the post keeps its author
assert.equal((await call('get', 'other@x.dev', { id: created.id })).status, 404)
assert.equal((await call('get', 'other@x.dev', { id: created.id })).status, 404)
const byAdmin = unwrapPost(await ok('save', 'admin@x.dev', { id: created.id, title: 'Edited by admin', body: 'b', tags: [], status: 'published', version: updated.version }))
assert.equal(byAdmin.authorEmail, 'writer@x.dev')
const own = await ok('list', 'other@x.dev', { scope: 'all' })
assert.equal(own.posts.length, 0, 'a non-admin never gets the all-authors view')
assert.equal((await ok('list', 'admin@x.dev', { scope: 'all' })).posts.length, 2)

// the author name is resolved server-side and shown on the headers (D1)
assert.equal(pub[0].authorName, 'Wanda Writer')

// a shape mismatch must throw, not return undefined fields
assert.throws(() => unwrapPost({ id: 'x' }))
assert.throws(() => unwrapHeaders([]))

// delete removes the post and its images
const second = unwrapPost(await ok('save', 'writer@x.dev', { title: 'T', body: 'b', tags: [], status: 'draft' }))
await ok('imageUpload', 'writer@x.dev', { id: second.id, name: 'p.png', dataBase64: PNG.toString('base64') })
await ok('delete', 'writer@x.dev', { id: second.id })
assert.equal((await call('get', 'writer@x.dev', { id: second.id })).status, 404)
assert.equal([...files.keys()].filter((k) => k.startsWith(second.id + '/')).length, 0)

// ---- 1.1 the two copies of the shared document module are identical -----------------------------
assert.equal(
  readFileSync(path.join(root, 'src', 'lib', 'blogDoc.ts'), 'utf-8'),
  readFileSync(path.join(root, 'functions', 'src', 'blogDoc.ts'), 'utf-8'),
  'src/lib/blogDoc.ts and functions/src/blogDoc.ts must be byte-identical',
)

// ---- 1.2 limits in characters (code points), legacy byte key ------------------------------------
const base = { tags: [], status: 'draft' }
const doc = (...content) => ({ type: 'doc', content })
const p = (text, marks) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] })
const refused = async (fields, needle) => {
  const before = docs.size
  const r = await call('save', 'writer@x.dev', fields)
  assert.equal(r.status, 400, JSON.stringify(r.payload))
  if (needle) assert.match(r.payload.error.message, needle)
  assert.equal(docs.size, before, 'a refused save stores nothing')
}
await refused({ ...base, title: 'x'.repeat(121), body: 'b' }, /characters/)
await ok('save', 'writer@x.dev', { ...base, title: '😀'.repeat(120), body: 'b' }) // 120 code points = 480 bytes
await refused({ ...base, title: '😀'.repeat(121), body: 'b' }, /characters/)
await refused({ ...base, title: 'T', body: 'x'.repeat(50001) }, /limit of 50000 characters/)
await ok('save', 'writer@x.dev', { ...base, title: 'T', body: '😀'.repeat(50000) })
await refused({ ...base, title: 'T', body: 'b', tags: ['t'.repeat(31)] }, /30 characters/)
await ok('save', 'writer@x.dev', { ...base, title: 'T', body: 'b', tags: ['😀'.repeat(30)] })
await refused({ ...base, title: 'T', content: doc(p('x'.repeat(50001))) }, /limit of 50000 characters/)
// a config with only the former byte key: the limit in characters is derived from it
const legacyConfig = { ...config }
delete legacyConfig.maxBodyLength
legacyConfig.maxBodyBytes = 20
await refused({ ...base, title: 'T', body: 'x'.repeat(21), config: legacyConfig }, /limit of 20 characters/)
await ok('save', 'writer@x.dev', { ...base, title: 'T', body: 'x'.repeat(20), config: legacyConfig })
const { readBlogConfig, MAX_DOC_BYTES } = require(path.join(root, 'functions', 'lib', 'blogValidation.js'))
assert.equal(MAX_DOC_BYTES, 700000)
assert.equal(readBlogConfig({}).maxBodyLength, 50000)
assert.equal(readBlogConfig({ maxBodyBytes: 30000 }).maxBodyLength, 30000)
assert.equal(readBlogConfig({ maxBodyBytes: 900000 }).maxBodyLength, 200000)
assert.equal(readBlogConfig({ maxBodyBytes: 'x', maxBodyLength: 0 }).maxBodyLength, 50000)
assert.equal(readBlogConfig({ maxBodyBytes: 30000, maxBodyLength: 100 }).maxBodyLength, 100)

// ---- 1.3 rich save, Markdown posts still readable and savable ------------------------------------
const mdPost = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Old', body: '# Old\n\n**md** body', tags: ['x'], status: 'published' }))
assert.equal(mdPost.format, 'markdown')
assert.equal(unwrapPost(await ok('get', 'writer@x.dev', { id: mdPost.id })).body, '# Old\n\n**md** body')
const mdImage = unwrapImage(await ok('imageUpload', 'writer@x.dev', { id: mdPost.id, name: 'p.png', dataBase64: PNG.toString('base64') }))

const richDoc = doc(
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
  p('Hello <script>alert(1)</script> world', [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com/a' } }]),
  { type: 'bulletList', content: [{ type: 'listItem', content: [p('item')] }] },
  { type: 'image', attrs: { imageId: mdImage.id, alt: 'pic' } },
)
const rich = unwrapPost(await ok('save', 'writer@x.dev', { id: mdPost.id, title: 'Old', content: richDoc, tags: ['x'], status: 'published', version: mdPost.version }))
assert.equal(rich.format, 'doc')
assert.equal(rich.body, '# Old\n\n**md** body', 'the original Markdown is kept on a rich save')
assert.equal(rich.excerpt, 'Heading Hello <script>alert(1)</script> world item')
assert.equal(rich.version, 2)
const reread = unwrapPost(await ok('get', 'writer@x.dev', { id: mdPost.id }))
assert.equal(reread.format, 'doc')
assert.equal(reread.content.content[0].attrs.level, 2)
assert.equal(reread.content.content[3].attrs.imageId, mdImage.id)
// the legacy `body` save is refused for a post already saved as a document (never overwrites it)
assert.equal((await call('save', 'writer@x.dev', { id: mdPost.id, title: 'Old', body: 'b', tags: [], status: 'published', version: 2 })).status, 409)
// a brand new rich post stores no Markdown
const fresh = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Fresh', content: doc(p('just rich')), tags: [], status: 'draft' }))
assert.equal(fresh.format, 'doc')
assert.equal(fresh.body, '')

// hostile or malformed documents are refused and store nothing
const bad = (n) => ({ ...base, title: 'T', content: n })
await refused(bad(doc({ type: 'script', content: [] })), /not valid/)
await refused(bad(doc({ type: 'paragraph', attrs: { onclick: 'x' } })), /unknown attribute/)
await refused(bad(doc({ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] })), /http, https or mailto/)
await refused(bad(doc({ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'https://x.dev', onclick: 'y' } }] }] })), /not valid/)
await refused(bad(doc({ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'font' }] }] })), /unknown mark/)
await refused(bad(doc({ type: 'heading', attrs: { level: 4 }, content: [] })), /level 1, 2 or 3/)
await refused(bad(doc({ type: 'image', attrs: { imageId: 'https://evil.dev/x.png' } })), /not valid/)
await refused(bad(doc({ type: 'image', attrs: { imageId: 'a', src: 'https://evil.dev/x.png' } })), /either an uploaded image or an address/)
await refused(bad(doc({ type: 'paragraph', content: [{ type: 'image', attrs: { imageId: 'a' } }] })), /not valid/)
await refused(bad({ type: 'paragraph' }), /not valid/)
await refused(bad('<p>html</p>'), /not valid/)
let deep = p('x')
for (let i = 0; i < 13; i++) deep = { type: 'blockquote', content: [deep] }
await refused(bad(doc(deep)), /nested too deeply/)
await refused(bad(doc(...Array.from({ length: 20001 }, () => ({ type: 'horizontalRule' })))), /too many/)
// alignment, list styles and https URL images (blog-editor-and-reader-options 1.1)
{
  const { validateDoc, isHttpsImageUrl, ALIGN_VALUES, BULLET_STYLES, ORDERED_STYLES } = await import(path.join(root, 'src', 'lib', 'blogDoc.ts'))
  const li = { type: 'listItem', content: [p('i')] }
  for (const v of ALIGN_VALUES) {
    assert.equal(validateDoc(doc({ ...p('a'), attrs: { textAlign: v } })).content[0].attrs.textAlign, v)
    assert.equal(validateDoc(doc({ type: 'heading', attrs: { level: 1, textAlign: v } })).content[0].attrs.textAlign, v)
  }
  for (const v of BULLET_STYLES) assert.equal(validateDoc(doc({ type: 'bulletList', attrs: { listStyle: v }, content: [li] })).content[0].attrs.listStyle, v)
  for (const v of ORDERED_STYLES) assert.equal(validateDoc(doc({ type: 'orderedList', attrs: { start: 1, listStyle: v }, content: [li] })).content[0].attrs.listStyle, v)
  assert.throws(() => validateDoc(doc({ ...p('a'), attrs: { textAlign: 'start' } })), /textAlign "start" is not allowed/)
  assert.throws(() => validateDoc(doc({ type: 'bulletList', attrs: { listStyle: 'decimal' }, content: [li] })), /listStyle "decimal" is not allowed/)
  assert.throws(() => validateDoc(doc({ type: 'orderedList', attrs: { listStyle: 'disc' }, content: [li] })), /not allowed/)
  assert.throws(() => validateDoc(doc({ type: 'blockquote', attrs: { textAlign: 'left' }, content: [] })), /unknown attribute/)
  for (const hostile of ['<script>alert(1)</script>', 'x;}</style><style>a{}', 'a\u0000b'.repeat(20)]) {
    let msg = ''
    try { validateDoc(doc({ ...p('a'), attrs: { textAlign: hostile } })) } catch (e) { msg = e.message }
    assert.match(msg, /not allowed/)
    assert.ok(Array.from(msg.match(/textAlign "(.*)" is/s)[1]).length <= 20 && !/[\u0000-\u001f]/.test(msg), 'echoed value is bounded and clean')
  }
  await refused(bad(doc({ ...p('a'), attrs: { textAlign: '<style>' } })), /textAlign "<style>" is not allowed/)
  const img = (attrs) => doc({ type: 'image', attrs })
  assert.equal(validateDoc(img({ src: 'https://example.com/a.png?x=1', alt: 'pic' })).content[0].attrs.src, 'https://example.com/a.png?x=1')
  assert.equal(validateDoc(img({ src: 'https://example.com/a.png' })).content[0].attrs.alt, null)
  for (const src of ['http://example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'blob:https://x.dev/1', '/a.png', '//example.com/a.png', 'a.png', 'https://u:p@example.com/a.png', 'https://exa mple.com/a.png', 'https://example.com/a\n.png', '']) {
    assert.equal(isHttpsImageUrl(src), false, JSON.stringify(src))
    assert.throws(() => validateDoc(img({ src })), /https:\/\//, JSON.stringify(src))
  }
  const longUrl = 'https://example.com/' + 'a'.repeat(1980)
  assert.equal(longUrl.length, 2000)
  validateDoc(img({ src: longUrl }))
  assert.throws(() => validateDoc(img({ src: longUrl + 'a' })), /limit 2000 characters/)
  assert.throws(() => validateDoc(img({ src: 'https://example.com/abcdef' }), { maxImageUrlLength: 20 }), /limit 20 characters/)
  validateDoc(img({ src: 'https://example.com/abcdef' }), { maxImageUrlLength: 40 })
  assert.throws(() => validateDoc(img({ imageId: 'a', src: 'https://example.com/a.png' })), /either an uploaded image or an address/)
  assert.throws(() => validateDoc(img({ alt: 'x' })), /either an uploaded image or an address/)
  assert.throws(() => validateDoc(img({ src: 'https://example.com/a.png', extra: 1 })), /unknown attribute/)
  // old documents validate exactly as before
  const old = doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] }, p('x'), { type: 'bulletList', content: [li] }, { type: 'orderedList', attrs: { start: 3 }, content: [li] }, { type: 'image', attrs: { imageId: 'abc_1', alt: 'pic' } })
  assert.deepEqual(validateDoc(old), old)
}
// full toolbox (blog-editor-full-toolbox 1.2): tables, task lists, colors, sub/superscript, image options
{
  const { validateDoc, isHexColor, IMAGE_SIZES, IMAGE_ALIGNS } = await import(path.join(root, 'src', 'lib', 'blogDoc.ts'))
  const cell = (text, attrs, type = 'tableCell') => ({ type, ...(attrs ? { attrs } : {}), content: [p(text ?? 'c')] })
  const row = (...cells) => ({ type: 'tableRow', content: cells })
  const table = (...rows) => doc({ type: 'table', content: rows })
  const t = (text, marks) => ({ type: 'text', text, marks })
  const invalid = (d, re, label) => assert.throws(() => validateDoc(d), re, label)
  // colors: accepted, rebuilt lowercase, read back
  const marked = (marks) => validateDoc(doc({ type: 'paragraph', content: [t('x', marks)] })).content[0].content[0].marks
  assert.deepEqual(marked([{ type: 'textColor', attrs: { color: '#AbCdEf' } }]), [{ type: 'textColor', attrs: { color: '#abcdef' } }])
  assert.deepEqual(marked([{ type: 'highlight', attrs: { color: '#ffee00' } }, { type: 'textColor', attrs: { color: '#000000' } }]).map((m) => m.type), ['highlight', 'textColor'])
  assert.deepEqual(marked([{ type: 'subscript' }]), [{ type: 'subscript' }])
  assert.deepEqual(marked([{ type: 'superscript' }, { type: 'bold' }]), [{ type: 'superscript' }, { type: 'bold' }])
  assert.equal(isHexColor('#12345f'), true)
  for (const color of ['#abc', 'red', 'rgb(0,0,0)', '#12345g', '#12345678', '#ff000080', 'abcdef', '#abcdef ', undefined, 5]) {
    assert.equal(isHexColor(color), false, String(color))
    for (const type of ['textColor', 'highlight']) {
      invalid(doc({ type: 'paragraph', content: [t('x', [{ type, attrs: { color } }])] }), /color ".*" is not allowed/, `${type} ${color}`)
    }
  }
  invalid(doc({ type: 'paragraph', content: [t('x', [{ type: 'textColor', attrs: { color: '#abcdef', style: 'x' } }])] }), /unknown attribute "style"/)
  invalid(doc({ type: 'paragraph', content: [t('x', [{ type: 'subscript' }, { type: 'superscript' }])] }), /subscript and superscript/)
  invalid(doc({ type: 'paragraph', content: [t('x', [{ type: 'superscript', attrs: { a: 1 } }])] }), /unknown attribute/)
  // task list
  const tl = validateDoc(doc({ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [p('a')] }, { type: 'taskItem', content: [p('b')] }] }))
  assert.deepEqual(tl.content[0].content.map((i) => i.attrs.checked), [true, false])
  invalid(doc({ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: 'yes' }, content: [p('a')] }] }), /checked "yes" is not allowed/)
  invalid(doc({ type: 'taskList', content: [{ type: 'taskItem', content: [{ type: 'taskList', content: [] }] }] }), /unexpected "taskList"/)
  invalid(doc({ type: 'taskList', content: [{ type: 'taskItem', content: [p('a'), p('b')] }] }), /not valid/)
  // tables: valid shapes are read back unchanged (spans stored only when above 1)
  const simple = table(row(cell('h', null, 'tableHeader'), cell('h', null, 'tableHeader')), row(cell(), cell()))
  assert.deepEqual(validateDoc(simple), simple)
  const colspan = table(row(cell('a', { colspan: 2 })), row(cell(), cell()))
  assert.deepEqual(validateDoc(colspan), colspan)
  const rowspan = table(row(cell('a', { rowspan: 2 }), cell()), row(cell()))
  assert.deepEqual(validateDoc(rowspan), rowspan)
  const both = table(row(cell('a', { colspan: 2, rowspan: 2 }), cell()), row(cell()), row(cell(), cell(), cell()))
  assert.deepEqual(validateDoc(both), both)
  assert.deepEqual(validateDoc(table(row(cell('a', { colspan: 1, rowspan: 1, colwidth: null }))), undefined).content[0].content[0].content[0], cell('a'))
  assert.deepEqual(validateDoc(doc({ type: 'blockquote', content: [simple.content[0]] })).content[0].content[0].type, 'table')
  const cells12 = Array.from({ length: 12 }, () => cell())
  validateDoc(table(row(...cells12)))
  validateDoc(table(...Array.from({ length: 100 }, () => row(cell()))))
  // tables: refused
  const sum = /table cells do not add up/
  invalid(table(row(cell(), cell()), row(cell())), sum, 'ragged short row')
  invalid(table(row(cell()), row(cell(), cell())), sum, 'ragged long row')
  invalid(table(row(cell('a', { rowspan: 2 }), cell()), row(cell(), cell())), sum, 'overlap by rowspan')
  invalid(table(row(cell('a', { colspan: 2 }), cell('b', { colspan: 2 })), row(cell('c', { colspan: 3 }), cell('d', { colspan: 2 }))), sum, 'overhang')
  invalid(table(row(cell('a', { rowspan: 2 })), row(cell())), sum, 'rowspan covers the second row so it overlaps')
  invalid(table(row(cell('a', { rowspan: 3 }), cell()), row(cell())), sum, 'rowspan past the last row')
  invalid(table(row(...Array.from({ length: 13 }, () => cell()))), sum, '13 columns')
  invalid(table(...Array.from({ length: 101 }, () => row(cell()))), sum, '101 rows')
  invalid(table(), sum, 'no rows')
  invalid(table(row()), sum, 'empty row')
  invalid(table(row(cell('a', { colspan: 13 }))), /colspan "13" is not allowed/)
  invalid(table(row(cell('a', { colspan: 0 }))), /colspan "0" is not allowed/)
  invalid(table(row(cell('a', { rowspan: 101 }))), /rowspan "101" is not allowed/)
  invalid(table(row(cell('a', { colspan: 1.5 }))), /colspan "1.5" is not allowed/)
  invalid(table(row(cell('a', { colspan: '2' }))), /colspan "2" is not allowed/)
  invalid(table(row(cell('a', { colwidth: [100] }))), /colwidth/)
  invalid(table(row(cell('a', { style: 'x' }))), /unknown attribute "style"/)
  invalid(table(row({ type: 'tableCell', content: [p('a'), p('b')] })), /not valid/)
  invalid(table(row({ type: 'tableCell', content: [] })), /not valid/)
  invalid(table(row({ type: 'tableCell', content: [{ type: 'table', content: [row(cell())] }] })), /unexpected "table"/)
  invalid(table(row({ type: 'tableCell', content: [{ type: 'bulletList', content: [] }] })), /unexpected "bulletList"/)
  invalid(table({ type: 'paragraph' }), /unexpected "paragraph"/)
  // images: size, align, caption
  const img = (attrs) => doc({ type: 'image', attrs: { imageId: 'abc', ...attrs } })
  for (const v of IMAGE_SIZES) assert.equal(validateDoc(img({ size: v })).content[0].attrs.size, v)
  for (const v of IMAGE_ALIGNS) assert.equal(validateDoc(img({ align: v })).content[0].attrs.align, v)
  assert.deepEqual(validateDoc(img({ size: 'small', align: 'right', caption: 'Cap' })).content[0].attrs, { imageId: 'abc', alt: null, size: 'small', align: 'right', caption: 'Cap' })
  assert.equal(validateDoc(img({ caption: '' })).content[0].attrs.caption, '')
  assert.equal('caption' in validateDoc(img({ caption: null })).content[0].attrs, false)
  assert.equal(validateDoc(img({ caption: '😀'.repeat(500) })).content[0].attrs.caption, '😀'.repeat(500))
  assert.deepEqual(validateDoc(doc({ type: 'image', attrs: { src: 'https://example.com/a.png', size: 'full', align: 'center' } })).content[0].attrs, { src: 'https://example.com/a.png', alt: null, size: 'full', align: 'center' })
  invalid(img({ size: 'huge' }), /size "huge" is not allowed/)
  invalid(img({ align: 'justify' }), /align "justify" is not allowed/)
  invalid(img({ align: '<x>' }), /align "<x>" is not allowed/)
  invalid(img({ caption: 'a'.repeat(501) }), /image caption/)
  invalid(img({ caption: 5 }), /image caption/)
  invalid(img({ width: 100 }), /unknown attribute "width"/)
  // captions count as visible text
  const { docText } = await import(path.join(root, 'src', 'lib', 'blogDoc.ts'))
  assert.equal(docText(validateDoc(doc(p('a'), { type: 'image', attrs: { imageId: 'abc', caption: 'Cap' } }, table(row(cell('x'), cell('y'))).content[0]))), 'a\nCap\nx\ny')
}
// the storage backstop: well inside the character limit but over MAX_DOC_BYTES
{
  const huge = { ...config, maxBodyLength: 200000 }
  const big = doc(...Array.from({ length: 6 }, () => p('😀'.repeat(30000))))
  await refused({ ...base, title: 'T', content: big, config: huge }, /too large to store/)
}

// ---- 1.3 public actions --------------------------------------------------------------------------
const publicOnly = (r) => {
  const text = JSON.stringify(r)
  assert.ok(!text.includes('authorEmail'), 'no authorEmail in a public response')
  assert.ok(!text.includes('@'), 'no "@" in a public response')
}
const pubPost = await ok('publicGet', null, { id: mdPost.id })
publicOnly(pubPost)
const pp = unwrapPublicPost(pubPost)
assert.equal(pp.authorName, 'Wanda Writer')
assert.equal(pp.format, 'doc')
assert.deepEqual(Object.keys(pubPost.post).sort(), ['authorName', 'content', 'excerpt', 'format', 'id', 'images', 'publishedAt', 'tags', 'title'])
assert.deepEqual(pp.images, [{ id: mdImage.id, name: 'p.png', contentType: 'image/png' }])
assert.equal(pp.content.content[0].type, 'heading')
// a Markdown post that was never converted is still public, as Markdown
const mdOnly = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Plain md', body: 'plain **md**', tags: [], status: 'published' }))
const mdPub = await ok('publicGet', null, { id: mdOnly.id })
publicOnly(mdPub)
assert.equal(mdPub.post.format, 'markdown')
assert.equal(mdPub.post.body, 'plain **md**')
assert.equal('content' in mdPub.post, false)
// names: an email-like or empty name falls back, a long name is cut at 60 characters
const asOther = unwrapPost(await ok('save', 'other@x.dev', { title: 'By other', body: 'b', tags: [], status: 'published' }))
assert.equal(unwrapPublicPost(await ok('publicGet', null, { id: asOther.id })).authorName, 'Author')
const asLong = unwrapPost(await ok('save', 'admin@x.dev', { title: 'By admin', body: 'b', tags: [], status: 'published' }))
assert.equal(unwrapPublicPost(await ok('publicGet', null, { id: asLong.id })).authorName, 'Author', 'no displayName')
docs.set('allowed_emails/long@x.dev', { role: 'user-advanced', displayName: LONG_NAME })
const byLong = unwrapPost(await ok('save', 'long@x.dev', { title: 'By long', body: 'b', tags: [], status: 'published' }))
assert.equal(unwrapPublicPost(await ok('publicGet', null, { id: byLong.id })).authorName, 'N'.repeat(60))
// headers: names for every author, never an email
const allHeaders = await ok('headers', null)
publicOnly(allHeaders)
const names = Object.fromEntries(unwrapHeaders(allHeaders).map((h) => [h.title, h.authorName]))
assert.equal(names['Plain md'], 'Wanda Writer')
assert.equal(names['By other'], 'Author')
assert.equal(names['By long'], 'N'.repeat(60))
assert.ok(unwrapHeaders(allHeaders).every((h) => h.title !== 'Secret draft' && h.title !== 'Fresh'), 'drafts never in headers')
// draft, deleted, unknown and malformed ids are all the same 404 with no content
const draftNotFound = await call('publicGet', null, { id: fresh.id })
assert.equal(draftNotFound.status, 404)
assert.deepEqual(draftNotFound.payload, (await call('publicGet', null, { id: '00000000-0000-4000-8000-000000000000' })).payload)
assert.equal((await call('publicGet', null, { id: 'not-an-id' })).status, 404)
assert.equal((await call('publicGet', null, {})).status, 404)
assert.equal((await call('publicGet', null, { id: { $ne: 1 } })).status, 404)
// public images: published and owned only
const pubImage = await ok('publicImageGet', null, { id: mdPost.id, imageId: mdImage.id })
assert.equal(pubImage.contentType, 'image/png')
assert.equal((await call('publicImageGet', null, { id: mdPost.id, imageId: 'nope' })).status, 404)
assert.equal((await call('publicImageGet', null, { id: mdOnly.id, imageId: mdImage.id })).status, 404, 'an image of another post')
assert.equal((await call('publicImageGet', null, { id: 'not-an-id', imageId: mdImage.id })).status, 404)
const draftWithImage = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Draft img', body: 'b', tags: [], status: 'draft' }))
const draftImg = unwrapImage(await ok('imageUpload', 'writer@x.dev', { id: draftWithImage.id, name: 'd.png', dataBase64: PNG.toString('base64') }))
assert.equal((await call('publicImageGet', null, { id: draftWithImage.id, imageId: draftImg.id })).status, 404, 'a draft image')
// unpublish and delete take the post (and its images) out of the public actions
await ok('save', 'writer@x.dev', { id: mdOnly.id, title: 'Plain md', body: 'x', tags: [], status: 'draft', version: mdOnly.version })
assert.equal((await call('publicGet', null, { id: mdOnly.id })).status, 404)
await ok('delete', 'writer@x.dev', { id: mdPost.id })
assert.equal((await call('publicGet', null, { id: mdPost.id })).status, 404, 'deleted')
assert.equal((await call('publicImageGet', null, { id: mdPost.id, imageId: mdImage.id })).status, 404, 'deleted')
// the private actions still need a session
assert.equal((await call('get', null, { id: fresh.id })).status, 401)
// the site's unwrap helper rejects a malformed public response
assert.throws(() => unwrapPublicPost({ post: { id: 'x' } }))
assert.throws(() => unwrapPublicPost({}))

// ---- 1.4 registerIfAbsent fills only an empty displayName ---------------------------------------
const { registerIfAbsent } = require(path.join(root, 'functions', 'lib', 'users.js'))
docs.set('allowed_emails/empty@x.dev', { role: 'user-base', allowed: true, displayName: '' })
docs.set('allowed_emails/named@x.dev', { role: 'user-base', allowed: true, displayName: 'Keep Me' })
docs.set('allowed_emails/revoked@x.dev', { role: 'admin', allowed: false })
await registerIfAbsent('empty@x.dev', 'Filled Name')
await registerIfAbsent('named@x.dev', 'Other Name')
await registerIfAbsent('revoked@x.dev', 'Revoked Name')
await registerIfAbsent('blank@x.dev', '')
assert.equal(docs.get('allowed_emails/empty@x.dev').displayName, 'Filled Name')
assert.equal(docs.get('allowed_emails/empty@x.dev').role, 'user-base')
assert.equal(docs.get('allowed_emails/empty@x.dev').allowed, true)
assert.equal(docs.get('allowed_emails/named@x.dev').displayName, 'Keep Me')
assert.equal(docs.get('allowed_emails/revoked@x.dev').allowed, false, 'allowed is never changed')
assert.equal(docs.get('allowed_emails/revoked@x.dev').role, 'admin')
assert.equal(docs.get('allowed_emails/blank@x.dev').role, 'reader', 'a new user is still a reader')

// ---- public path policy (src/lib/access.ts) ------------------------------------------------------
{
  const { isPublicPostPath, requiredPermission } = await import(path.join(root, 'src', 'lib', 'access.ts'))
  const uuid = '11111111-1111-4111-8111-111111111111'
  for (const p of ['/posts/nonexistent-id', `/posts/${uuid}`, '/api/posts/nonexistent-id/images/abc_1', `/api/posts/${uuid}/images/x`]) {
    assert.ok(isPublicPostPath(p) && requiredPermission(p) === null, `${p} must reach the handler without a session`)
  }
  for (const p of ['/posts', '/posts/', '/posts/a/b', '/api/posts/x', '/api/posts/x/images', '/api/posts/x/images/a/b', '/blog', '/api/blog/x', '/api/blog/x/images/y']) {
    assert.ok(!isPublicPostPath(p), `${p} must not be public`)
  }
  assert.equal(requiredPermission('/blog'), 'blog:write')
  assert.equal(requiredPermission('/api/blog/x'), 'blog:write')
}


// ---- engagement (likes, bookmarks, comments) -----------------------------------------------------
{
  const { createHash } = await import('node:crypto')
  const eng = require(path.join(root, 'functions', 'lib', 'blogEngagement.js'))
  const { readBlogConfig } = require(path.join(root, 'functions', 'lib', 'blogValidation.js'))
  const key = (e) => createHash('sha256').update(e).digest('hex')
  const EMAIL_LIKE = /@/
  const FORBIDDEN = ['authorEmail', 'email', 'userKey']
  const noPrivate = (value, what) => {
    const walk = (v) => {
      if (Array.isArray(v)) return v.forEach(walk)
      if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) { assert.ok(!FORBIDDEN.includes(k), `${what}: key ${k}`); walk(x) }
      } else if (typeof v === 'string') assert.ok(!EMAIL_LIKE.test(v), `${what}: value ${v}`)
    }
    walk(value)
  }

  // 1.3 rate-limit window math (pure)
  const T = Date.UTC(2026, 0, 1, 12, 0, 10)
  let st
  for (let i = 0; i < 30; i++) st = eng.nextRate(st, T + i, false)
  assert.equal(st.n, 30, 'at the limit the 30th write passes')
  assert.throws(() => eng.nextRate(st, T + 100, false), (e) => e.status === 429 && /Too many actions/.test(e.message), 'over the limit -> 429')
  const next = eng.nextRate(st, T + 60_000, false)
  assert.equal(next.n, 1, 'a new window starts again')
  let cs
  for (let i = 0; i < 5; i++) cs = eng.nextRate(cs, T + i * 1000, true)
  assert.equal(cs.cn, 5)
  assert.throws(() => eng.nextRate(cs, T + 6000, true), (e) => e.status === 429, 'sixth comment in 10 minutes')
  assert.equal(eng.nextRate(cs, T + 6000, false).cn, 5, 'non-comment writes do not count as comments')
  assert.equal(eng.nextRate(cs, T + 600_000, true).cn, 1, 'the comment window resets after 10 minutes')

  // 1.5 comment sanitising and length in code points
  assert.throws(() => eng.cleanComment('', 1000), (e) => e.status === 400 && /Write a comment first/.test(e.message))
  assert.throws(() => eng.cleanComment(' \n\t \u0007 ', 1000), (e) => e.status === 400)
  assert.throws(() => eng.cleanComment(null, 1000), (e) => e.status === 400)
  assert.equal(eng.cleanComment('  hi\u0000 th\u0007ere\r\n\r\n\r\n\r\nok\ttab  ', 1000), 'hi there\n\noktab')
  assert.equal(eng.cleanComment('é', 1000), 'é', 'NFC normalised')
  assert.equal(eng.cleanComment('😀'.repeat(50), 50), '😀'.repeat(50), '50 emoji = 50 characters (100 UTF-16 units)')
  assert.throws(() => eng.cleanComment('😀'.repeat(51), 50), (e) => e.status === 400 && /50 characters/.test(e.message))

  // 1.1 config fallback
  const defaults = readBlogConfig({})
  assert.equal(defaults.maxCommentLength, 1000)
  assert.equal(defaults.maxCommentsShown, 50)
  assert.equal(defaults.maxCommentsPerUserPerPost, 20)
  assert.equal(defaults.maxCommentsPerPost, 1000)
  assert.equal(defaults.maxBookmarksPerUser, 200)
  for (const [k, bad] of [['maxCommentLength', 49], ['maxCommentLength', 5001], ['maxCommentLength', 'x'], ['maxCommentsShown', 0], ['maxCommentsPerUserPerPost', 1.5], ['maxCommentsPerPost', -1], ['maxBookmarksPerUser', null]]) {
    assert.equal(readBlogConfig({ [k]: bad })[k], defaults[k], `${k}=${bad} falls back`)
  }
  assert.equal(readBlogConfig({ maxCommentLength: 50 }).maxCommentLength, 50)
  assert.equal(readBlogConfig({ maxCommentLength: 5000 }).maxCommentLength, 5000)
  {
    const { sanitizeBlogConfig, publicBlogConfig } = await import(path.join(root, 'src', 'lib', 'blogConfigSanitize.ts'))
    const example = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'blog-config.example.json'), 'utf-8'))
    assert.equal(sanitizeBlogConfig({ maxCommentLength: 10 }, example).maxCommentLength, example.maxCommentLength)
    assert.equal(sanitizeBlogConfig({ maxCommentLength: 300 }, example).maxCommentLength, 300)
    assert.equal(sanitizeBlogConfig({ maxBookmarksPerUser: 'x' }, example).maxBookmarksPerUser, 200)
    assert.equal(publicBlogConfig(example).maxCommentLength, 1000)
    assert.ok(!('maxCommentsShown' in publicBlogConfig(example)))
  }

  // public shapers carry no private data even for email-like input
  const viewer = { email: 'other@x.dev', role: 'user-advanced', postAuthor: 'writer@x.dev' }
  const shaped = eng.commentView('c1', { authorEmail: 'other@x.dev', text: 'hi', createdAt: 't', userKey: 'k', extra: 'x@y.z' }, 'Author', viewer)
  assert.deepEqual(Object.keys(shaped).sort(), ['authorName', 'canRemove', 'createdAt', 'id', 'mine', 'text'])
  noPrivate(shaped, 'commentView')
  const entry = eng.bookmarkEntry('p1', { title: 'T', excerpt: 'e', tags: ['a', 3], publishedAt: 't', authorEmail: 'writer@x.dev' }, 'Wanda', 'saved')
  assert.deepEqual(Object.keys(entry).sort(), ['authorName', 'excerpt', 'id', 'publishedAt', 'savedAt', 'tags', 'title'])
  assert.deepEqual(entry.tags, ['a'])
  noPrivate(entry, 'bookmarkEntry')
  assert.equal(eng.commentView('c', { authorEmail: 'a@x.dev' }, 'A', null).canRemove, false)
  assert.equal(eng.commentView('c', { authorEmail: 'a@x.dev' }, 'A', { email: 'writer@x.dev', role: 'user-advanced', postAuthor: 'writer@x.dev' }).canRemove, true, 'the post author may remove')
  assert.equal(eng.commentView('c', { authorEmail: 'a@x.dev' }, 'A', { email: 'admin@x.dev', role: 'admin', postAuthor: 'writer@x.dev' }).canRemove, true, 'the admin may remove')

  // 1.2 actions through the real handler
  const post = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Engage', body: 'b', tags: [], status: 'published' }))
  const draft = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Draft', body: 'b', tags: [], status: 'draft' }))
  const anon = await ok('engagementGet', null, { id: post.id })
  assert.deepEqual(anon, { likeCount: 0, commentCount: 0, comments: [], hasMore: false, viewer: null })
  assert.equal((await ok('engagementGet', 'nobody@x.dev', { id: post.id })).viewer, null, 'a cookie for an unknown account is anonymous')
  for (const [a, f] of [['engagementGet', {}], ['likeToggle', {}], ['bookmarkToggle', {}], ['commentAdd', { text: 'hi' }]]) {
    const who = a === 'engagementGet' ? null : 'other@x.dev'
    assert.equal((await call(a, who, { id: draft.id, ...f })).status, 404, `${a} on a draft`)
    assert.equal((await call(a, who, { id: 'nope', ...f })).status, 404, `${a} on a malformed id`)
  }
  assert.equal((await call('likeToggle', null, { id: post.id })).status, 401, 'anonymous cannot write')
  assert.equal((await call('commentAdd', null, { id: post.id, text: 'x' })).status, 401)
  assert.equal((await call('bookmarksList', null, {})).status, 401)

  // any signed-in role (not blog:write) may like
  docs.set('allowed_emails/reader@x.dev', { role: 'reader', allowed: true, displayName: 'Rita Reader' })
  const l1 = await ok('likeToggle', 'reader@x.dev', { id: post.id })
  assert.deepEqual(l1, { liked: true, likeCount: 1 })
  assert.deepEqual(await ok('likeToggle', 'other@x.dev', { id: post.id }), { liked: true, likeCount: 2 })
  assert.deepEqual(await ok('likeToggle', 'reader@x.dev', { id: post.id }), { liked: false, likeCount: 1 })
  assert.ok(![...docs.keys()].some((k) => k.includes('reader@x.dev') && k.startsWith('blog_')), 'no engagement document id is an email')
  assert.ok(docs.has(`blog_engagement/${post.id}/likes/${key('other@x.dev')}`))
  assert.equal(docs.get(`blog_posts/${post.id}`).version, 1, 'engagement never bumps the post version')

  // comments
  const c1 = await ok('commentAdd', 'reader@x.dev', { id: post.id, text: '  Nice\u0000 post\n\n\n\nthanks  ' })
  assert.equal(c1.commentCount, 1)
  assert.equal(c1.comment.text, 'Nice post\n\nthanks')
  assert.equal(c1.comment.authorName, 'Rita Reader')
  assert.deepEqual([c1.comment.mine, c1.comment.canRemove], [true, true])
  noPrivate(c1, 'commentAdd')
  assert.equal((await call('commentAdd', 'reader@x.dev', { id: post.id, text: '   ' })).status, 400)
  assert.equal((await call('commentAdd', 'reader@x.dev', { id: post.id, text: 'x'.repeat(1001) })).status, 400)
  assert.equal(docs.get(`blog_engagement/${post.id}`).commentCount, 1, 'a refused comment stores nothing')
  await new Promise((r) => setTimeout(r, 5))
  const c2 = await ok('commentAdd', 'other@x.dev', { id: post.id, text: 'second' })
  assert.equal(c2.comment.authorName, 'Author', 'an email as display name never shows')
  const pubView = await ok('engagementGet', null, { id: post.id })
  assert.equal(pubView.commentCount, 2)
  assert.deepEqual(pubView.comments.map((c) => c.text), ['second', 'Nice post\n\nthanks'], 'newest first')
  assert.ok(pubView.comments.every((c) => !c.mine && !c.canRemove))
  noPrivate(pubView, 'engagementGet anonymous')
  const readerView = await ok('engagementGet', 'reader@x.dev', { id: post.id })
  assert.deepEqual(readerView.viewer, { liked: false, bookmarked: false })
  assert.deepEqual(readerView.comments.map((c) => [c.mine, c.canRemove]), [[false, false], [true, true]])
  noPrivate(readerView, 'engagementGet signed in')
  const authorView = await ok('engagementGet', 'writer@x.dev', { id: post.id })
  assert.ok(authorView.comments.every((c) => c.canRemove && !c.mine), 'the post author may remove every comment')
  const paged = await ok('engagementGet', null, { id: post.id, before: c2.comment.createdAt })
  assert.deepEqual(paged.comments.map((c) => c.text), ['Nice post\n\nthanks'])

  // removal: only the writer, the post author or the admin
  assert.equal((await call('commentRemove', 'long@x.dev', { id: post.id, commentId: c1.comment.id })).status, 403)
  assert.equal((await call('commentRemove', 'long@x.dev', { id: post.id, commentId: 'missing' })).status, 404)
  assert.deepEqual(await ok('commentRemove', 'reader@x.dev', { id: post.id, commentId: c1.comment.id }), { commentCount: 1 })
  assert.deepEqual(await ok('commentRemove', 'writer@x.dev', { id: post.id, commentId: c2.comment.id }), { commentCount: 0 })
  assert.equal((await ok('engagementGet', null, { id: post.id })).comments.length, 0)

  // per-user and per-post comment limits (config forwarded as the site does)
  const limited = { ...config, maxCommentsPerUserPerPost: 2, maxCommentsPerPost: 3 }
  const callWith = (cfg) => async (action, cookie, fields) => {
    let status = 0, payload
    await blog({ method: 'POST', body: { action, cookie, config: cfg, ...fields } }, { status(s) { status = s; return this }, json(b) { payload = b } })
    return { status, payload }
  }
  const lim = callWith(limited)
  docs.delete(`blog_rate/${key('long@x.dev')}`)
  assert.equal((await lim('commentAdd', 'long@x.dev', { id: post.id, text: 'a' })).status, 200)
  assert.equal((await lim('commentAdd', 'long@x.dev', { id: post.id, text: 'b' })).status, 200)
  assert.equal((await lim('commentAdd', 'long@x.dev', { id: post.id, text: 'c' })).status, 409, 'per user per post')
  assert.equal((await lim('commentAdd', 'other@x.dev', { id: post.id, text: 'd' })).status, 200)
  assert.equal((await lim('commentAdd', 'reader@x.dev', { id: post.id, text: 'e' })).status, 409, 'per post')

  // bookmarks
  assert.deepEqual(await ok('bookmarkToggle', 'reader@x.dev', { id: post.id }), { bookmarked: true })
  assert.equal((await ok('engagementGet', 'reader@x.dev', { id: post.id })).viewer.bookmarked, true)
  const list = await ok('bookmarksList', 'reader@x.dev', {})
  assert.equal(list.posts.length, 1)
  assert.equal(list.posts[0].id, post.id)
  assert.equal(list.posts[0].authorName, 'Wanda Writer')
  noPrivate(list, 'bookmarksList')
  assert.equal((await ok('bookmarksList', 'other@x.dev', {})).posts.length, 0, 'bookmarks are per user')
  const tiny = callWith({ ...config, maxBookmarksPerUser: 1 })
  const second2 = unwrapPost(await ok('save', 'writer@x.dev', { title: 'Second', body: 'b', tags: [], status: 'published' }))
  const over = await tiny('bookmarkToggle', 'reader@x.dev', { id: second2.id })
  assert.equal(over.status, 409)
  assert.match(over.payload.error.message, /Bookmark limit reached/)
  assert.deepEqual((await tiny('bookmarkToggle', 'reader@x.dev', { id: post.id })).payload, { bookmarked: false }, 'removing always works')
  await ok('bookmarkToggle', 'reader@x.dev', { id: post.id })
  // unpublished: every action 404s, the bookmark list drops it and cleans up, data is kept
  const cur = unwrapPost(await ok('get', 'writer@x.dev', { id: post.id }))
  await ok('save', 'writer@x.dev', { id: post.id, title: 'Engage', body: 'b', tags: [], status: 'draft', version: cur.version })
  assert.equal((await call('engagementGet', null, { id: post.id })).status, 404)
  assert.equal((await call('likeToggle', 'reader@x.dev', { id: post.id })).status, 404)
  assert.equal((await ok('bookmarksList', 'reader@x.dev', {})).posts.length, 0)
  assert.ok(!docs.has(`blog_bookmarks/${key('reader@x.dev')}/posts/${post.id}`), 'stale bookmark cleaned lazily')
  assert.ok(docs.has(`blog_engagement/${post.id}`), 'unpublish keeps the data')

  // the 429 through the handler: a full window refuses and stores nothing
  const now = Date.now()
  docs.set(`blog_rate/${key('reader@x.dev')}`, { w: Math.floor(now / 60000) * 60000, n: 30, cw: 0, cn: 0 })
  const before = docs.get(`blog_engagement/${second2.id}`)
  const limitedCall = await call('likeToggle', 'reader@x.dev', { id: second2.id })
  assert.equal(limitedCall.status, 429)
  assert.equal(limitedCall.payload.error.message, 'Too many actions. Try again in a minute.')
  assert.equal(docs.get(`blog_engagement/${second2.id}`), before)

  // deleting the post removes its engagement data
  await ok('delete', 'writer@x.dev', { id: post.id })
  assert.equal([...docs.keys()].filter((k) => k.startsWith(`blog_engagement/${post.id}`)).length, 0)
}

console.log('blog contract: OK')
