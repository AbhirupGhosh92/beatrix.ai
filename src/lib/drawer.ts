// What the drawer menu lists for a user. One place decides it, so the drawer, the menu button and
// the page can never disagree about whether there is a menu at all.
import type { DrawerItem } from '../data/profile.ts'
import { can, requiredPermission, type Role } from './access.ts'

/** Entries switched on in the profile that the role may use (the server enforces both again). */
export function visibleDrawerItems(items: readonly DrawerItem[], role: Role | null): DrawerItem[] {
  if (!role) return []
  return items.filter((item) => item.enabled && item.href && can(role, requiredPermission(item.href) ?? 'site:view'))
}

/** Whether the drawer would list anything: a visible entry, or the admin link for cms:write. */
export function hasDrawerContent(items: readonly DrawerItem[], role: Role | null): boolean {
  return role !== null && (can(role, 'cms:write') || visibleDrawerItems(items, role).length > 0)
}
