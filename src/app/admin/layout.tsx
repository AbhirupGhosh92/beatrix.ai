import AdminNav from '../../components/layout/AdminNav.tsx'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base-100 text-base-content">
      <AdminNav />
      {children}
    </div>
  )
}
