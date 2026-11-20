// The single access policy: roles, permissions and which route needs which permission. Pure and
// free of server-only imports, so the proxy, API routes and client UI all read the same rules.
// functions/src/policy.ts mirrors ROLES, PERMISSIONS and resolveRole for the Cloud Functions (a
// separate package); keep the two in sync.

/** Lowest to highest. Every role holds the permissions of the roles below it. */
export const ROLES = ['reader', 'user-base', 'user-advanced', 'admin'] as const
export type Role = (typeof ROLES)[number]

export type Permission = 'site:view' | 'features:basic' | 'features:advanced' | 'cms:write' | 'blog:write'

/**
 * Extra facts `can` needs for permissions that are not part of the role hierarchy. `blog:write` is
 * config-driven (blog-config.json `writeRoles`); the admin always holds it, and without a list (or
 * with an unreadable config) only the admin does. Every other permission ignores the context.
 */
export interface AccessContext {
  blogWriteRoles?: readonly Role[]
}

/** What each role adds on top of the role below it. */
const ROLE_GRANTS: Record<Role, readonly Permission[]> = {
  reader: ['site:view'],
  'user-base': ['features:basic'],
  'user-advanced': ['features:advanced'],
  admin: ['cms:write'],
}

export function permissionsOf(role: Role): ReadonlySet<Permission> {
  const granted = new Set<Permission>()
  for (const candidate of ROLES.slice(0, ROLES.indexOf(role) + 1)) {
    for (const permission of ROLE_GRANTS[candidate]) granted.add(permission)
  }
  return granted
}

/** Whether `role` holds `permission`. No role (anonymous) holds nothing. */
export function can(role: Role | null | undefined, permission: Permission, ctx?: AccessContext): boolean {
  if (!role) return false
  if (permission === 'blog:write') return role === 'admin' || (ctx?.blogWriteRoles ?? []).includes(role)
  return permissionsOf(role).has(permission)
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** The shape of an `allowed_emails/{email}` Firestore document. */
export interface AllowedEmailEntry {
  allowed?: unknown
  role?: unknown
  admin?: unknown
}

/**
 * A user's role from their allow-list entry, or null when they have no access at all (no entry, or
 * `allowed: false`). A valid `role` wins; a legacy `admin: true` entry is an admin; anything else,
 * including an unknown role value, is a reader.
 */
export function resolveRole(entry: AllowedEmailEntry | null | undefined): Role | null {
  if (!entry || entry.allowed === false) return null
  if (isRole(entry.role)) return entry.role
  if (entry.admin === true) return 'admin'
  return 'reader'
}

/** Routes anyone may request without a session: the landing page, the shareable About page and the sign-in endpoints. */
const PUBLIC_PATHS = ['/', '/about', '/api/auth/session', '/api/blog/headers']
/** Framework assets and the files in public/ (an extension from this list). */
const PUBLIC_PREFIXES = ['/_next/']
const PUBLIC_FILE = /\.(?:svg|png|jpe?g|gif|webp|ico|avif|woff2?|ttf|otf|txt|xml|webmanifest|map|css|js)$/i

/** Routes that need more than the default `site:view`; the longest matching prefix wins. */
const ROUTE_PERMISSIONS: readonly (readonly [prefix: string, permission: Permission])[] = [
  ['/admin', 'cms:write'],
  ['/api/admin', 'cms:write'],
  ['/resume-builder', 'features:basic'],
  ['/api/resumes', 'features:basic'],
  ['/api/ai', 'features:basic'],
  ['/job-tracker', 'features:basic'],
  ['/api/applications', 'features:basic'],
  ['/blog', 'blog:write'],
  ['/api/blog', 'blog:write'],
]

/**
 * Routes that belong to a drawer menu item and exist only while that item is enabled in the
 * profile (404 otherwise, for every role). The flag can only close a route; who may open it stays
 * with ROUTE_PERMISSIONS above.
 */
const FEATURE_ROUTES: readonly (readonly [prefix: string, itemId: string])[] = [
  ['/resume-builder', 'resume-builder'],
  ['/api/resumes', 'resume-builder'],
  ['/api/ai', 'resume-builder'],
  ['/job-tracker', 'job-tracker'],
  ['/api/applications', 'job-tracker'],
]

const DEFAULT_PERMISSION: Permission = 'site:view'

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

// Any single safe segment reaches the handler, which answers 404 for an id that is not a published
// post (a malformed id is a 404 like an unknown one, never a redirect).
const POST_ID = '[A-Za-z0-9_-]{1,100}'
/** The published-post page and its image route: exact anchored shapes, nothing else under /posts or /api/posts. */
const PUBLIC_POST_PATHS = [
  new RegExp(`^/posts/${POST_ID}$`),
  new RegExp(`^/api/posts/${POST_ID}/images/[A-Za-z0-9_-]{1,100}$`),
  // Counts and comments are public to read; the handler treats a bad cookie as anonymous. Only GET
  // matters: the writes (like, bookmark, comments) are different paths and stay non-public (site:view).
  new RegExp(`^/api/posts/${POST_ID}/engagement$`),
]

export function isPublicPostPath(pathname: string): boolean {
  return PUBLIC_POST_PATHS.some((pattern) => pattern.test(pathname))
}

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    isPublicPostPath(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE.test(pathname)
  )
}

/**
 * The permission a request path needs, or null when the path is public. Default-deny: every path
 * that is not listed as public needs at least `site:view`, so a forgotten route is protected.
 */
export function requiredPermission(pathname: string): Permission | null {
  if (isPublicPath(pathname)) return null
  let best: { length: number; permission: Permission } | undefined
  for (const [prefix, permission] of ROUTE_PERMISSIONS) {
    if (matchesPrefix(pathname, prefix) && (!best || prefix.length > best.length)) {
      best = { length: prefix.length, permission }
    }
  }
  return best?.permission ?? DEFAULT_PERMISSION
}

/** The signed-in engagement routes (site:view, not blog:write): like, bookmark, comments, bookmarks list. */
const ENGAGEMENT_ROUTES = [
  new RegExp(`^/api/posts/${POST_ID}/(?:like|bookmark|comments)$`),
  new RegExp(`^/api/posts/${POST_ID}/comments/[A-Za-z0-9_-]{1,100}$`),
]

/**
 * Whether a path belongs to the blog feature (authoring page or API, or the signed-in engagement
 * routes and bookmarks page) that blog-config.json can switch off. Public paths (the headers
 * endpoint, the post page and the public engagement read) are excluded: they do their own config check.
 */
export function isBlogRoute(pathname: string): boolean {
  if (isPublicPath(pathname)) return false
  return (
    matchesPrefix(pathname, '/blog') ||
    matchesPrefix(pathname, '/api/blog') ||
    matchesPrefix(pathname, '/bookmarks') ||
    matchesPrefix(pathname, '/api/bookmarks') ||
    ENGAGEMENT_ROUTES.some((pattern) => pattern.test(pathname))
  )
}

/** The menu item id a path is tied to, or null when the path is not a switchable feature. */
export function featureItemId(pathname: string): string | null {
  for (const [prefix, itemId] of FEATURE_ROUTES) {
    if (matchesPrefix(pathname, prefix)) return itemId
  }
  return null
}

/** Whether the menu item `itemId` is present and enabled. A missing item counts as off. */
export function isFeatureEnabled(items: readonly { id: string; enabled: boolean }[], itemId: string): boolean {
  return items.some((item) => item.id === itemId && item.enabled)
}
