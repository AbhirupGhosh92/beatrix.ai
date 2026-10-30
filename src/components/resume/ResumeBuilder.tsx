'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { resumeApi } from '../../lib/resumeClient.ts'
import type { BuilderConfig, ResumeSummary } from '../../lib/resumeTypes.ts'
import ResumeEditor from './ResumeEditor.tsx'
import ResumeList from './ResumeList.tsx'

// The builder page: the user's resumes, and the editor for the one that is open.
export default function ResumeBuilder() {
  const [config, setConfig] = useState<BuilderConfig | null>(null)
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { resumes: list } = await resumeApi.list()
    setResumes(list)
  }, [])

  useEffect(() => {
    let ignore = false
    Promise.all([resumeApi.config(), resumeApi.list()])
      .then(([builderConfig, { resumes: list }]) => {
        if (ignore) return
        setConfig(builderConfig)
        setResumes(list)
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not load the resume builder.')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const create = (title: string) =>
    run(async () => {
      const { resume } = await resumeApi.create(title)
      await refresh()
      setOpenId(resume.id)
    })

  const remove = (id: string) =>
    run(async () => {
      await resumeApi.remove(id)
      await refresh()
    })

  if (loading) {
    return <p className="flex items-center gap-2 text-muted"><Loader2 className="animate-spin" size={18} /> Loading...</p>
  }
  if (!config) {
    return <p role="alert" className="text-error">{error ?? 'The resume builder is unavailable.'}</p>
  }

  if (openId) {
    return (
      <ResumeEditor
        key={openId}
        id={openId}
        config={config}
        onClose={() => setOpenId(null)}
        onSaved={() => void refresh().catch(() => {})}
      />
    )
  }

  return (
    <ResumeList
      resumes={resumes}
      cap={config.cap}
      busy={busy}
      error={error}
      onOpen={setOpenId}
      onCreate={create}
      onDelete={remove}
    />
  )
}
