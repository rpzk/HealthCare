import { Suspense } from 'react'
import { Metadata } from 'next'
import AutoPatientRegistration from '@/components/admin/auto-patient-registration'

export const metadata: Metadata = {
  title: 'Cadastro Automático de Pacientes - HealthCare AI',
  description: 'Sistema inteligente de cadastro automático de pacientes através de documentos'
}

export default function AutoRegistrationPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Cadastro Automático de Pacientes</h1>
        <p className="text-gray-600">
          Processe documentos cadastrais automaticamente para criar ou atualizar pacientes no sistema
        </p>
      </div>

      <Suspense fallback={<div>Carregando sistema de cadastro automático...</div>}>
        <AutoPatientRegistration />
      </Suspense>
    </div>
  )
}
