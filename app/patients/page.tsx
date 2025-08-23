import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PatientsList } from '@/components/patients/patients-list'

export const metadata: Metadata = {
  title: 'Pacientes - Sistema de Prontuário Eletrônico',
  description: 'Gestão de pacientes do sistema médico',
}

export default function PatientsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestão de Pacientes
            </h1>
            <p className="text-gray-600 mt-2">
              Visualize e gerencie todos os seus pacientes
            </p>
          </div>
          <PatientsList />
        </main>
      </div>
    </div>
  )
}
