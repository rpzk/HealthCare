import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const NewConsultationContainer = dynamic(() => import('@/components/consultations/new-consultation-container'), { ssr: false })

export default function NewConsultationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Nova Consulta"
            description="Agendamento de consulta (em desenvolvimento)"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Consultas', href: '/consultations' },
              { label: 'Nova', href: '/consultations/new' }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-white">
            <NewConsultationContainer />
          </div>
        </main>
      </div>
    </div>
  )
}
