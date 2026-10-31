import ResumeNav from '../../components/layout/ResumeNav.tsx'

export default function JobTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base-100 text-base-content">
      <ResumeNav title="Job tracker" switchTo={{ itemId: 'resume-builder', label: 'Resume builder', href: '/resume-builder' }} />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  )
}
