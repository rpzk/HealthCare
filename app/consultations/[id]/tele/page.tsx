import { getServerSession } from 'next-auth'
import TeleRoom from '@/components/tele/room'
import { authOptions } from '@/lib/auth'
import { SSFConsultationWorkspace } from '@/components/consultations/ssf-consultation-workspace-simple'

interface Props { params: { id: string } }

export default async function TelePage({ params }: Props){
  const session = await getServerSession(authOptions as any).catch(()=>null) as any
  const userId = session?.user?.id as string | undefined
  if (!userId){
    return <div className="p-6 text-sm text-red-400">Você precisa estar autenticado.</div>
  }
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-[#40e0d0]">Teleconsulta</h1>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Área de Vídeo - 4 colunas */}
        <div className="lg:col-span-4 bg-black p-4 flex flex-col gap-4 overflow-y-auto border-r border-slate-800">
          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-lg border border-slate-700">
            <TeleRoom roomId={params.id} userId={userId} />
          </div>
          <div className="text-sm text-gray-400 p-4 bg-slate-900/50 rounded border border-slate-800">
            <p className="mb-2 font-medium text-white">Instruções:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mantenha a câmera ligada para melhor interação.</li>
              <li>Use o painel ao lado para registrar a consulta.</li>
              <li>A IA pode ser usada simultaneamente para auxiliar no atendimento.</li>
            </ul>
          </div>
        </div>

        {/* Área de Prontuário/IA - 8 colunas */}
        <div className="lg:col-span-8 bg-slate-950 overflow-y-auto">
          <div className="p-4">
            <SSFConsultationWorkspace consultationId={params.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
