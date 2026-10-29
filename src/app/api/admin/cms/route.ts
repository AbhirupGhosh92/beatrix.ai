import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/admin-auth.ts'
import { isGcsConfigured, readStoredProfile, writeStoredProfile } from '../../../../lib/profile-store.ts'

const DATA_DIR = path.join(process.cwd(), 'src', 'data')
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit for CMS editing

function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null
  const basename = path.basename(filename)
  if (basename !== filename) return null // prevent path traversal
  if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) return null // strict whitelist: only safe .json filenames

  // Explicit path containment check
  const resolved = path.resolve(DATA_DIR, filename)
  const normalizedDataDir = path.resolve(DATA_DIR)
  if (!resolved.startsWith(normalizedDataDir + path.sep) && resolved !== normalizedDataDir) {
    return null
  }

  return filename
}

const UNAUTHORIZED = () =>
  NextResponse.json({ error: 'Admin sign-in required' }, { status: 401 })

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return UNAUTHORIZED()
  try {
    const { searchParams } = new URL(request.url)
    const targetFile = searchParams.get('file')

    // With Cloud Storage configured, profile.json is the only editable file.
    if (isGcsConfigured()) {
      if (targetFile && targetFile !== 'profile.json') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      const stored = await readStoredProfile(true)
      const noStore = { 'Cache-Control': 'no-store, max-age=0' }
      if (!targetFile) {
        return NextResponse.json(
          {
            files: [
              {
                filename: 'profile.json',
                displayName: 'profile.json (Active Profile)',
                exists: true,
                size: stored.size,
                updatedAt: stored.updatedAt,
              },
            ],
          },
          { headers: noStore },
        )
      }
      return NextResponse.json(
        {
          filename: 'profile.json',
          content: stored.content,
          exists: true,
          size: stored.size,
          updatedAt: stored.updatedAt,
        },
        { headers: noStore },
      )
    }

    // List all available files if no specific file requested
    if (!targetFile) {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
      }

      const filesInDir = readdirSync(DATA_DIR).filter(
        (f) => f.endsWith('.json') && !f.startsWith('.') && sanitizeFilename(f) !== null
      )
      const fileList = Array.from(new Set(['profile.json', 'profile.example.json', ...filesInDir]))

      const files = fileList.map((filename) => {
        const filePath = path.join(DATA_DIR, filename)
        const exists = existsSync(filePath)
        let size = 0
        let updatedAt: string | null = null

        if (exists) {
          const stats = statSync(filePath)
          size = stats.size
          updatedAt = stats.mtime.toISOString()
        } else if (filename === 'profile.json' && existsSync(path.join(DATA_DIR, 'profile.example.json'))) {
          // Virtual profile.json fallback if not created yet
          const stats = statSync(path.join(DATA_DIR, 'profile.example.json'))
          size = stats.size
        }

        return {
          filename,
          displayName: filename === 'profile.json' ? 'profile.json (Active Profile)' : filename,
          exists,
          size,
          updatedAt,
        }
      })

      return NextResponse.json(
        { files },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // Handle specific file content request
    const safeFilename = sanitizeFilename(targetFile)
    if (!safeFilename) {
      return NextResponse.json({ error: 'Invalid or unauthorized filename' }, { status: 400 })
    }

    const filePath = path.join(DATA_DIR, safeFilename)
    const exists = existsSync(filePath)
    let content = ''
    let size = 0
    let updatedAt: string | null = null

    if (exists) {
      const stats = statSync(filePath)
      if (stats.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File exceeds maximum supported size' }, { status: 413 })
      }
      content = readFileSync(filePath, 'utf-8')
      size = stats.size
      updatedAt = stats.mtime.toISOString()
    } else if (safeFilename === 'profile.json') {
      // Fallback to example if profile.json doesn't exist yet
      const examplePath = path.join(DATA_DIR, 'profile.example.json')
      if (existsSync(examplePath)) {
        content = readFileSync(examplePath, 'utf-8')
        size = content.length
      }
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        filename: safeFilename,
        content,
        exists,
        size,
        updatedAt,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return UNAUTHORIZED()
  try {
    const body = await request.json()
    const { file, content } = body

    const safeFilename = sanitizeFilename(file)
    if (!safeFilename) {
      return NextResponse.json({ error: 'Invalid or unsafe filename' }, { status: 400 })
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 })
    }

    if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Payload exceeds maximum allowed size (5MB)' }, { status: 413 })
    }

    // Validate JSON syntax
    try {
      JSON.parse(content)
    } catch (jsonErr) {
      const errMsg = jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON syntax'
      return NextResponse.json({ error: `JSON Parse Error: ${errMsg}` }, { status: 400 })
    }

    if (isGcsConfigured() && safeFilename !== 'profile.json') {
      return NextResponse.json({ error: 'Only profile.json is editable' }, { status: 400 })
    }

    if (safeFilename === 'profile.json') {
      const saved = await writeStoredProfile(content)
      return NextResponse.json({
        success: true,
        message: isGcsConfigured()
          ? 'Saved profile.json to Cloud Storage (live within ~30 seconds)'
          : 'Successfully saved profile.json',
        filename: safeFilename,
        size: saved.size,
        updatedAt: saved.updatedAt,
      })
    }

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }

    const filePath = path.join(DATA_DIR, safeFilename)
    writeFileSync(filePath, content, 'utf-8')

    const stats = statSync(filePath)

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${safeFilename}`,
      filename: safeFilename,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
