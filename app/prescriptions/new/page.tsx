import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const NewPrescriptionForm = dynamic(() => import('@/components/prescriptions/new-prescription-form'), { ssr: false })

interface NewPrescriptionPageProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function NewPrescriptionPage({ searchParams }: NewPrescriptionPageProps) {
  const patientId = typeof searchParams?.patientId === 'string' ? searchParams?.patientId : undefined
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden sidebar-content">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <PageHeader
            title="Nova Prescrição"
            description="Tela de criação de prescrição em desenvolvimento"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Prescrições', href: '/prescriptions' },
              { label: 'Nova', href: '/prescriptions/new' }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-card">
            <NewPrescriptionForm initialPatientId={patientId} />
          </div>
        </main>
      </div>
    </div>
  )
}
