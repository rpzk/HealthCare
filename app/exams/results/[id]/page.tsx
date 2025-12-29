import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const ExamResultDetails = dynamic<{ id: string }>(
  () => import('../../../../components/exams/exam-result-details'),
  { ssr: false }
)

export default function ExamResultDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title={`Resultado de Exame ${id}`}
            description="Detalhes do resultado do exame"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Exames', href: '/exams' },
              { label: id, href: `/exams/results/${id}` }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-card">
            <ExamResultDetails id={id} />
          </div>
        </main>
      </div>
    </div>
  )
}
