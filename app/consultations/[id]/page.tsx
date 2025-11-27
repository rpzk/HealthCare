import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ConsultationWorkspace } from '@/components/consultations'

export const metadata: Metadata = {
  title: 'Consulta - Sistema de Prontuário',
  description: 'Workspace de atendimento integrado',
}

export default function ConsultationPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64">
          <ConsultationWorkspace consultationId={params.id} />
        </main>
      </div>
    </div>
  )
}
