import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const NewExamRequestForm = dynamic(() => import('@/components/exams/new-exam-request-form'), { ssr: false })

export default function NewExamPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Novo Exame"
            description="Cadastro de solicitações de exame (em desenvolvimento)"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Exames', href: '/exams' },
              { label: 'Novo', href: '/exams/new' }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-white">
            <NewExamRequestForm />
          </div>
        </main>
      </div>
    </div>
  )
}
