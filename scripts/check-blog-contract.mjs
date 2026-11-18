#!/usr/bin/env node
// Contract check for the blog: runs the REAL compiled `blog` Cloud Function (functions/lib/blog.js)
// against an in-memory fake of Firestore, Storage and Auth, and passes every response through the
// site's unwrap helpers (src/lib/blogResponses.ts, as src/middleware/blogService.ts does), so a
// disagreement between the function's response shapes and what the site expects fails here.
// Build the functions first: npm run functions:build. Run: node --experimental-strip-types scripts/check-blog-contract.mjs
import assert from 'node:assert/strict'
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
const roles = { 'admin@x.dev': { role: 'admin' }, 'writer@x.dev': { role: 'user-advanced' }, 'other@x.dev': { role: 'user-advanced' } }

class DocSnap {
  constructor(id, data) { this.id = id; this.data_ = data; this.exists = data !== undefined }
  data() { return this.data_ === undefined ? undefined : structuredClone(this.data_) }
  get(f) { return this.data_?.[f] }
}
class DocRef {
  constructor(p) { this.path = p; this.id = p.split('/').pop() }
  async get() { return new DocSnap(this.id, docs.get(this.path)) }
  async set(d) { docs.set(this.path, structuredClone(d)) }
  async create(d) { if (docs.has(this.path)) throw new Error('exists'); docs.set(this.path, structuredClone(d)) }
  async update(d) { docs.set(this.path, { ...docs.get(this.path), ...structuredClone(d) }) }
  async delete() { docs.delete(this.path) }
}
class Query {
  constructor(prefix, filters = [], lim = Infinity) { this.prefix = prefix; this.filters = filters; this.lim = lim }
  where(f, op, v) { return new Query(this.prefix, [...this.filters, [f, op, v]], this.lim) }
  orderBy(f, dir) { const q = new Query(this.prefix, this.filters, this.lim); q.order = [f, dir]; return q }
  limit(n) { const q = new Query(this.prefix, this.filters, n); q.order = this.order; return q }
  select() { return this }
  rows() {
    let rows = [...docs.entries()].filter(([k]) => k.startsWith(this.prefix + '/')).map(([k, v]) => new DocSnap(k.split('/').pop(), v))
    for (const [f, op, v] of this.filters) {
      rows = rows.filter((s) => {
        const x = s.data_[f]
        if (op === '==') return x === v
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
  runTransaction: async (fn) => fn({ get: (ref) => ref.get(), set: (ref, d) => ref.set(d), update: (ref, d) => ref.update(d) }),
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
const { unwrapHeaders, unwrapImage, unwrapPost } = await import(path.join(root, 'src', 'lib', 'blogResponses.ts'))

const config = { writeRoles: ['admin', 'user-advanced'], maxTitleLength: 120, maxBodyBytes: 100000, maxTagsPerPost: 8, maxTagLength: 30, maxImageBytes: 2097152, maxImagesPerPost: 10, maxPostsPerAuthor: 200, excerptLength: 160 }

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
assert.deepEqual(Object.keys(pub[0]).sort(), ['excerpt', 'id', 'publishedAt', 'tags', 'title'])
assert.equal(pub[0].title, 'Hello 2')

// ownership: another author gets 404, the admin can edit and the post keeps its author
assert.equal((await call('get', 'other@x.dev', { id: created.id })).status, 404)
assert.equal((await call('get', 'other@x.dev', { id: created.id })).status, 404)
const byAdmin = unwrapPost(await ok('save', 'admin@x.dev', { id: created.id, title: 'Edited by admin', body: 'b', tags: [], status: 'published', version: updated.version }))
assert.equal(byAdmin.authorEmail, 'writer@x.dev')
const own = await ok('list', 'other@x.dev', { scope: 'all' })
assert.equal(own.posts.length, 0, 'a non-admin never gets the all-authors view')
assert.equal((await ok('list', 'admin@x.dev', { scope: 'all' })).posts.length, 2)

// a shape mismatch must throw, not return undefined fields
assert.throws(() => unwrapPost({ id: 'x' }))
assert.throws(() => unwrapHeaders([]))

// delete removes the post and its images
const second = unwrapPost(await ok('save', 'writer@x.dev', { title: 'T', body: 'b', tags: [], status: 'draft' }))
await ok('imageUpload', 'writer@x.dev', { id: second.id, name: 'p.png', dataBase64: PNG.toString('base64') })
await ok('delete', 'writer@x.dev', { id: second.id })
assert.equal((await call('get', 'writer@x.dev', { id: second.id })).status, 404)
assert.equal([...files.keys()].filter((k) => k.startsWith(second.id + '/')).length, 0)

console.log('blog contract: OK')
