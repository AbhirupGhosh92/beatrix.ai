import { NextRequest, NextResponse } from 'next/server'
import { can } from '../../../../lib/access.ts'
import type { BuilderConfig } from '../../../../lib/resumeTypes.ts'
import { getResumeConfig } from '../../../../middleware/resumeConfigService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../../middleware/routeHelpers.ts'
import { verifySession } from '../../../../middleware/sessionService.ts'

/** What the builder page needs: the caller's cap, the structure and rules, and the enabled templates. */
export async function GET(request: NextRequest) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    const session = await verifySession(cookie)
    if (!session) return unauthorized('Sign-in required.')
    const config = await getResumeConfig()
    const canCustomize = can(session.role, 'features:advanced')
    const body: BuilderConfig = {
      cap: canCustomize ? null : config.limits.baseMaxResumes,
      canCustomize,
      structureRules: config.structureRules,
      defaultStructure: config.defaultStructure,
      templates: config.templates.filter((template) => template.enabled),
    }
    return NextResponse.json(body, { headers: NO_STORE })
  } catch (err) {
    return failure(err, 'resume config')
  }
}
