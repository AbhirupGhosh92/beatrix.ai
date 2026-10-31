import ResumeNav from '../../components/layout/ResumeNav.tsx'

export default function ResumeBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base-100 text-base-content">
      <ResumeNav switchTo={{ itemId: 'job-tracker', label: 'Job tracker', href: '/job-tracker' }} />
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  )
}
