// What the drawer menu lists for a user. One place decides it, so the drawer, the menu button and
// the page can never disagree about whether there is a menu at all.
import type { DrawerItem, DropdownItem } from '../data/profile.ts'
import { can, isBlogRoute, requiredPermission, type AccessContext, type Role } from './access.ts'

/** `AccessContext` plus whether the blog is switched on (blog-config.json); an unset flag counts as on. */
export interface DrawerContext extends AccessContext {
  blogEnabled?: boolean
}

/** Whether the role may open a path, and (for the blog) only while the blog is enabled. */
function mayOpen(href: string, role: Role, ctx?: DrawerContext): boolean {
  if (isBlogRoute(href) && ctx?.blogEnabled === false) return false
  return can(role, requiredPermission(href) ?? 'site:view', ctx)
}

/** Entries switched on in the profile that the role may use (the server enforces both again). */
export function visibleDrawerItems(items: readonly DrawerItem[], role: Role | null, ctx?: DrawerContext): DrawerItem[] {
  if (!role) return []
  return items.filter((item) => item.enabled && item.href && mayOpen(item.href, role, ctx))
}

/** Whether the drawer would list anything: a visible entry, or the admin link for cms:write. */
export function hasDrawerContent(items: readonly DrawerItem[], role: Role | null, ctx?: DrawerContext): boolean {
  return role !== null && (can(role, 'cms:write') || visibleDrawerItems(items, role, ctx).length > 0)
}

/** Whether an href is an external http(s) URL (opened in a new tab) rather than a path on this site. */
export const isExternalHref = (href: string) => /^https?:\/\//i.test(href)

/**
 * Account menu entries switched on in the profile that the role may use. A link needs a path on this
 * site the role may open, or an http(s) URL; anything else is dropped (the server enforces routes again).
 */
export function visibleMenuItems(items: readonly DropdownItem[], role: Role | null, ctx?: DrawerContext): DropdownItem[] {
  if (!role) return []
  return items.filter((item) => {
    if (!item.enabled) return false
    if (item.action === 'sign-out') return true
    if (isExternalHref(item.href)) return true
    return item.href.startsWith('/') && mayOpen(item.href, role, ctx)
  })
}
