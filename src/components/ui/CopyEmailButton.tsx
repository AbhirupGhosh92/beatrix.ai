'use client'


import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { profile } from '../data/profile.ts'

/** Copies the email from the profile to the clipboard and shows a daisyUI toast. */
export default function CopyEmailButton({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false)
  const { contact, labels } = profile

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
    } catch {
      window.location.href = `mailto:${contact.email}`
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={copy}>
        <Mail size={18} aria-hidden="true" />
        {labels.copyEmail}
      </button>
      {copied && (
        <div className="toast toast-end z-50" role="status">
          <div className="alert alert-success">
            <span>{labels.emailCopied}</span>
          </div>
        </div>
      )}
    </>
  )
}
