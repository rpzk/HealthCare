import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'
import dynamic from 'next/dynamic'

const NewRecordForm = dynamic(() => import('@/components/records/new-record-form'), { ssr: false })

export default function NewRecordPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Novo Prontuário"
            description="Cadastro de prontuário (em desenvolvimento)"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Prontuários', href: '/records' },
              { label: 'Novo', href: '/records/new' }
            ]}
            actions={<RefreshButton />}
          />

          <div className="mt-6 p-6 border rounded-lg bg-white">
            <NewRecordForm />
          </div>
        </main>
      </div>
    </div>
  )
}
 
