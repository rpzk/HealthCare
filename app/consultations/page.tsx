import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ConsultationsList } from '@/components/consultations/consultations-list'
import { PageHeader } from '@/components/navigation/page-header'

export const metadata: Metadata = {
  title: 'Consultas - Sistema de Prontuário Eletrônico',
  description: 'Gestão de consultas médicas do sistema',
}

export default function ConsultationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-24">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Gestão de Consultas"
            description="Agende, gerencie e acompanhe todas as consultas médicas"
            breadcrumbs={[
              { label: 'Consultas' }
            ]}
            showBackButton={false}
            showHomeButton={true}
          />
          <ConsultationsList />
        </main>
      </div>
    </div>
  )
}
