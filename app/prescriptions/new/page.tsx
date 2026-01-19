import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const NewPrescriptionForm = dynamic(() => import('@/components/prescriptions/new-prescription-form'), { ssr: false })

export default function NewPrescriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
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

          <div className="mt-6 p-6 border rounded-lg bg-white">
            <NewPrescriptionForm />
          </div>
        </main>
      </div>
    </div>
  )
}
