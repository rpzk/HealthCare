import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ConsultationsPageClient } from '@/components/consultations/consultations-page-client'
import { Suspense } from 'react'

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
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {/* O conteúdo interativo foi movido para um Client Component */}
            <ConsultationsPageClient />
          </div>
        </main>
      </div>
    </div>
  )
}
