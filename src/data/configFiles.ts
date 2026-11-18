// The names of the config files the site reads through the single `getConfig` function. Mirrored by
// CONFIG_FILES in functions/src/cms.ts (a separate package); edit both together.

/** The bio page content. */
export const PROFILE_FILE = 'profile.json'
/** The resume builder config. */
export const RESUME_CONFIG_FILE = 'resume-config.json'
/** The landing page config. */
export const HOME_CONFIG_FILE = 'home-config.json'
/** The blog config. */
export const BLOG_CONFIG_FILE = 'blog-config.json'

export const CONFIG_FILES = [PROFILE_FILE, RESUME_CONFIG_FILE, HOME_CONFIG_FILE, BLOG_CONFIG_FILE] as const
export type ConfigFile = (typeof CONFIG_FILES)[number]
