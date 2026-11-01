import { NextRequest, NextResponse } from 'next/server'
import { can } from '../../../../lib/access.ts'
import { AiServiceError, callAi, isAction } from '../../../../middleware/aiService.ts'
import { NO_STORE, failure, featureOff, sessionCookie, unauthorized } from '../../../../middleware/routeHelpers.ts'
import { verifySession } from '../../../../middleware/sessionService.ts'

type Context = { params: Promise<{ action: string }> }

const MAX_BODY_BYTES = 300_000
const MAX_JOB_CHARS = 20_000

const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE })

// Tailor for Job and Skill Match. The caller comes from the verified session only; the body supplies
// the resume content and job description and nothing that identifies a user.
export async function POST(request: NextRequest, { params }: Context) {
  const off = await featureOff('resume-builder')
  if (off) return off
  const cookie = sessionCookie(request)
  if (!cookie) return unauthorized('Sign-in required.')
  try {
    const session = await verifySession(cookie)
    if (!session) return unauthorized('Sign-in required.')
    if (!can(session.role, 'features:basic')) return reply('Not allowed.', 403)

    const { action } = await params
    if (!isAction(action)) return reply('Not found.', 404)

    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return reply('The request is too large.', 413)
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return reply('The request is not valid JSON.', 400)
    }
    const { data, jobDescription } = (body ?? {}) as { data?: unknown; jobDescription?: unknown }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return reply('Resume data is required.', 400)
    if (jobDescription !== undefined && typeof jobDescription !== 'string') return reply('The job description must be text.', 400)
    if ((jobDescription ?? '').length > MAX_JOB_CHARS) return reply('The job description is too long.', 400)

    const result = await callAi(action, { data: data as Record<string, unknown>, jobDescription: jobDescription ?? '' })
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    if (err instanceof AiServiceError) return reply(err.message, err.status)
    return failure(err, 'ai action')
  }
}
