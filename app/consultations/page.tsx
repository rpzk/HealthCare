import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ConsultationsList } from '@/components/consultations/consultations-list'

export const metadata: Metadata = {
  title: 'Consultas - Sistema de Prontuário Eletrônico',
  description: 'Gestão de consultas médicas do sistema',
}

export default function ConsultationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestão de Consultas
            </h1>
            <p className="text-gray-600 mt-2">
              Agende, gerencie e acompanhe todas as consultas médicas
            </p>
          </div>
          <ConsultationsList />
        </main>
      </div>
    </div>
  )
}
