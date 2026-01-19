import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const EditPrescriptionForm = dynamic<{ id: string }>(
  () => import('../../../../components/prescriptions/prescription-edit-form'),
  { ssr: false }
)

export default function EditPrescriptionPage({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title={`Editar Prescrição ${id}`}
            description="Edição de prescrição em desenvolvimento"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Prescrições', href: '/prescriptions' },
              { label: id, href: `/prescriptions/${id}` },
              { label: 'Editar', href: `/prescriptions/${id}/edit` }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-white">
            <EditPrescriptionForm id={id} />
          </div>
        </main>
      </div>
    </div>
  )
}
