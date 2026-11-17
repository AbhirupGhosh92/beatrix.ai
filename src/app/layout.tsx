import type { Metadata, Viewport } from 'next'
import FirebaseInit from '../components/layout/FirebaseInit.tsx'
import { HomeConfigProvider } from '../components/layout/HomeConfigProvider.tsx'
import { ProfileProvider } from '../components/layout/ProfileProvider.tsx'
import RouteProgress from '../components/layout/RouteProgress.tsx'
import ReleaseNotes from '../components/layout/ReleaseNotes.tsx'
import StoreProvider from '../components/layout/StoreProvider.tsx'
import SnackbarHost from '../components/ui/SnackbarHost.tsx'
import { getHomeConfig } from '../middleware/homeConfigService.ts'
import { getProfile } from '../middleware/profileService.ts'
import { getLatestRelease } from '../middleware/releaseService.ts'
import '../index.css'

// The profile is read from Cloud Storage per request, so nothing here can be prerendered.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile()
  return {
    title: `${profile.person.name} · ${profile.person.title}`,
    description: profile.person.summary,
    icons: { icon: '/favicon.svg' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Apply the saved (else system) theme before first paint; ThemeToggle removes
// this attribute on mount. Keep in sync with ThemeToggle.tsx.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='beatrix-dark'&&t!=='beatrix-light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'beatrix-dark':'beatrix-light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [profile, homeConfig, release] = await Promise.all([getProfile(), getHomeConfig(), getLatestRelease()])

  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <FirebaseInit />
        <RouteProgress />
        <StoreProvider>
          <ProfileProvider profile={profile}>
            <HomeConfigProvider config={homeConfig}>{children}</HomeConfigProvider>
          </ProfileProvider>
          <ReleaseNotes release={release} />
          <SnackbarHost />
        </StoreProvider>
      </body>
    </html>
  )
}
