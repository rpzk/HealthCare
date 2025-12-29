import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const ExamRequestDetails = dynamic<{ id: string }>(
  () => import('../../../../components/exams/exam-request-details'),
  { ssr: false }
)

export default function ExamRequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title={`Solicitação de Exame ${id}`}
            description="Detalhes da solicitação de exame"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Exames', href: '/exams' },
              { label: id, href: `/exams/requests/${id}` }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-card">
            <ExamRequestDetails id={id} />
          </div>
        </main>
      </div>
    </div>
  )
}
