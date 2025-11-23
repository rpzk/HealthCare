import { getServerSession } from 'next-auth'
import TeleRoom from '@/components/tele/room'
import { authOptions } from '@/lib/auth'
import { SSFConsultationWorkspace } from '@/components/consultations/ssf-consultation-workspace-simple'

interface Props { params: { id: string } }

export default async function TelePage({ params }: Props){
  const session = await getServerSession(authOptions as any).catch(()=>null) as any
  const userId = session?.user?.id as string | undefined
  if (!userId){
    return <div className="p-6 text-sm text-destructive">Você precisa estar autenticado.</div>
  }
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card p-4 border-b border-border flex justify-between items-center">
        <h1 className="text-xl font-semibold text-primary">Teleconsulta</h1>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Área de Vídeo - 4 colunas */}
        <div className="lg:col-span-4 bg-background p-4 flex flex-col gap-4 overflow-y-auto border-r border-border">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg border border-border">
            <TeleRoom roomId={params.id} userId={userId} />
          </div>
          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded border border-border">
            <p className="mb-2 font-medium text-foreground">Instruções:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mantenha a câmera ligada para melhor interação.</li>
              <li>Use o painel ao lado para registrar a consulta.</li>
              <li>A IA pode ser usada simultaneamente para auxiliar no atendimento.</li>
            </ul>
          </div>
        </div>

        {/* Área de Prontuário/IA - 8 colunas */}
        <div className="lg:col-span-8 bg-background overflow-y-auto">
          <div className="p-4">
            <SSFConsultationWorkspace consultationId={params.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
