import type { NextConfig } from 'next'

// Firebase App Hosting provides the backend's web app config as FIREBASE_WEBAPP_CONFIG at build
// time; expose it under the NEXT_PUBLIC_FIREBASE_* names src/lib/firebase.ts reads, so every
// environment builds with its own project without per-environment files. Values already set
// (e.g. from .env.local) win.
const webAppConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || '{}') as Record<string, string | undefined>
const firebaseEnv: Record<string, string> = {}
for (const [name, value] of Object.entries({
  NEXT_PUBLIC_FIREBASE_API_KEY: webAppConfig.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: webAppConfig.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: webAppConfig.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: webAppConfig.storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: webAppConfig.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: webAppConfig.appId,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: webAppConfig.measurementId,
})) {
  if (value && !process.env[name]) firebaseEnv[name] = value
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  env: firebaseEnv,
}

export default nextConfig
