import { existsSync } from 'node:fs'
import type { NextConfig } from 'next'

// profile.json is private and git-ignored; fall back to the committed example.
const profileFile = existsSync('./src/data/profile.json')
  ? './src/data/profile.json'
  : './src/data/profile.example.json'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    resolveAlias: { 'profile-data': profileFile },
  },
  webpack(config) {
    config.resolve.alias['profile-data'] = new URL(profileFile, `file://${process.cwd()}/`).pathname
    return config
  },
}

export default nextConfig
