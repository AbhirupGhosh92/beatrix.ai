import type { LucideIcon } from 'lucide-react'
import {
  Download,
  FileText,
  Gauge,
  Kanban,
  LayoutTemplate,
  Lock,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import type { HomeIcon } from '../../data/homeConfig.ts'

/** Lucide component for each icon name in the home config's closed vocabulary. */
export const LANDING_ICONS: Record<HomeIcon, LucideIcon> = {
  'file-text': FileText,
  sparkles: Sparkles,
  target: Target,
  kanban: Kanban,
  shield: Shield,
  lock: Lock,
  'layout-template': LayoutTemplate,
  download: Download,
  gauge: Gauge,
  users: Users,
}
