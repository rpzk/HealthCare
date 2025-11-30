import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { StaffManagement } from '@/components/admin/staff-management'

export const metadata: Metadata = {
  title: 'Gestão de Pessoal - HealthCare',
  description: 'Gerenciamento de profissionais do sistema',
}

export default function StaffPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <StaffManagement />
        </main>
      </div>
    </div>
  )
}
