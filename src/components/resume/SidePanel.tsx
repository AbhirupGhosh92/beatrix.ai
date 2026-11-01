'use client'

import type { ReactNode } from 'react'
import { LayoutList, Palette, Sparkles } from 'lucide-react'

export type PanelTab = 'content' | 'ai' | 'design'

const TABS = [
  { id: 'content', label: 'Content', icon: LayoutList },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'design', label: 'Design', icon: Palette },
] as const

interface Props {
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  content: ReactNode
  ai: ReactNode
  design: ReactNode
}

// The left panel: Content / AI / Design tabs. Panels not shown are not mounted, so the form's own
// state lives in the editor, never here.
export default function SidePanel({ tab, onTab, content, ai, design }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Editor panels" className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={`btn-sm ${tab === id ? 'button-primary' : 'button-secondary'}`}
            onClick={() => onTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'content' ? content : tab === 'ai' ? ai : design}
      </div>
    </div>
  )
}
