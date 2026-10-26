import type { Metadata, Viewport } from 'next'
import { profile } from '../data/profile.ts'
import '../index.css'

export const metadata: Metadata = {
  title: `${profile.person.name} · ${profile.person.title}`,
  description: profile.person.summary,
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Apply the saved (else system) theme before first paint; ThemeToggle removes
// this attribute on mount. Keep in sync with ThemeToggle.tsx.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='beatrix-dark'&&t!=='beatrix-light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'beatrix-dark':'beatrix-light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Rajdhani:wght@400;500;600;700&family=Fredoka:wght@400;500;600&family=Quicksand:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
