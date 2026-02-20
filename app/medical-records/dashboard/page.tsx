import { Suspense } from 'react'
import { MedicalRecordsDashboard } from '@/components/medical-records/medical-records-dashboard'

export const metadata = {
  title: 'Dashboard de Prontuários | HealthCare',
  description: 'Estatísticas e visão geral dos prontuários médicos'
}

export default function MedicalRecordsDashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <MedicalRecordsDashboard />
      </Suspense>
    </div>
  )
}
