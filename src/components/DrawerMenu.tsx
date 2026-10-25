import { profile } from '../data/profile.ts'

export default function DrawerMenu() {
  const { nav } = profile

  return (
    <div className="drawer-side">
      <label htmlFor="nav-drawer" aria-label={nav.closeSidebarLabel} className="drawer-overlay" />
      <ul className="menu bg-base-200 min-h-full w-72 max-w-[85vw] p-4 sm:w-80">
        {nav.drawerItems.map((item) => (
          <li key={item}>
            <a className="hover-subtle">{item}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
