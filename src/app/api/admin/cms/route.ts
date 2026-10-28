import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

const DATA_DIR = path.join(process.cwd(), 'src', 'data')

function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null
  const basename = path.basename(filename)
  if (basename !== filename) return null // prevent path traversal
  if (!/^[a-zA-Z0-9_-]+\.json$/.test(filename)) return null // only allow safe .json filenames
  return filename
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetFile = searchParams.get('file')

    // List all available files if no specific file requested
    if (!targetFile) {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
      }

      const filesInDir = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
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
          // Virtual profile.json if not created yet
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

      return NextResponse.json({ files })
    }

    // Handle specific file content request
    const safeFilename = sanitizeFilename(targetFile)
    if (!safeFilename) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = path.join(DATA_DIR, safeFilename)
    const exists = existsSync(filePath)
    let content = ''
    let size = 0
    let updatedAt: string | null = null

    if (exists) {
      content = readFileSync(filePath, 'utf-8')
      const stats = statSync(filePath)
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

    return NextResponse.json({
      filename: safeFilename,
      content,
      exists,
      size,
      updatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Validate JSON syntax
    try {
      JSON.parse(content)
    } catch (jsonErr) {
      const errMsg = jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON syntax'
      return NextResponse.json({ error: `JSON Parse Error: ${errMsg}` }, { status: 400 })
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
