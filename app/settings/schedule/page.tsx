import { Metadata } from 'next'
import { ScheduleConfig } from '@/components/schedule/schedule-config'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export const metadata: Metadata = {
  title: 'Minha Agenda | HealthCare',
  description: 'Configure seus horários de atendimento',
}

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Configuração de Agenda</h1>
            <ScheduleConfig />
          </div>
        </main>
      </div>
    </div>
  )
}
