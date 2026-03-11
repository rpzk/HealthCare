import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function MedicalRecordsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          {children}
        </main>
      </div>
    </div>
  )
}
