// Role and permission rules for the Cloud Functions. Mirrors src/lib/access.ts in the Next.js app
// (a separate package that cannot import it); keep the two in sync.

/** Lowest to highest. Every role holds the permissions of the roles below it. */
export const ROLES = ["reader", "user-base", "user-advanced", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type Permission = "site:view" | "features:basic" | "features:advanced" | "cms:write" | "blog:write";

const ROLE_GRANTS: Record<Role, readonly Permission[]> = {
  reader: ["site:view"],
  "user-base": ["features:basic"],
  "user-advanced": ["features:advanced"],
  admin: ["cms:write"],
};

/** Context for permissions that depend on config. */
export interface PolicyContext {
  /** Roles that hold `blog:write` besides admin (blog-config.json `writeRoles`); default admin only. */
  blogWriteRoles?: readonly Role[];
}

/** `blog:write` is not in ROLE_GRANTS: admin always holds it, others only when listed in the config. */
export function can(role: Role | null | undefined, permission: Permission, ctx?: PolicyContext): boolean {
  if (!role) return false;
  if (permission === "blog:write") return role === "admin" || (ctx?.blogWriteRoles ?? ["admin"]).includes(role);
  return ROLES.slice(0, ROLES.indexOf(role) + 1).some((r) => ROLE_GRANTS[r].includes(permission));
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Role from an `allowed_emails/{email}` document, or null when the user has no access (no entry,
 * or `allowed: false`). A valid `role` wins; a legacy `admin: true` entry is an admin; anything
 * else, including an unknown role value, is a reader.
 */
export function resolveRole(entry: Record<string, unknown> | null | undefined): Role | null {
  if (!entry || entry.allowed === false) return null;
  if (isRole(entry.role)) return entry.role;
  if (entry.admin === true) return "admin";
  return "reader";
}
