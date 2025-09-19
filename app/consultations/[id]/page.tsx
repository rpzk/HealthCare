import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { SSFConsultationWorkspace } from '../../../components/consultations/ssf-consultation-workspace-simple'

export const metadata: Metadata = {
  title: 'Consulta SSF - Workspace Integrado',
  description: 'Atenda a consulta em uma única tela com prescrições, exames e encaminhamentos no estilo SSF',
}

export default function ConsultationWorkspacePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="ssf-header">
            <h1>Sistema de Saúde da Família - Consulta Integrada</h1>
          </div>
          <SSFConsultationWorkspace consultationId={params.id} />
        </main>
      </div>
    </div>
  )
}
