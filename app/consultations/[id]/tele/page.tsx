import { getServerSession, type Session } from 'next-auth'
import TeleRoomCompact from '@/components/tele/room-compact'
import { authOptions } from '@/lib/auth'
import { TeleWorkspace } from '@/components/consultations/tele-workspace'
import { TeleInviteButton } from '@/components/tele/invite-button'
import { prisma } from '@/lib/prisma'
import { Video, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function TelePage({ params }: Props){
  const session = await getServerSession(authOptions).catch(() => null) as Session | null
  const userId = session?.user?.id as string | undefined
  
  if (!userId){
    return <div className="p-6 text-sm text-destructive">Você precisa estar autenticado.</div>
  }

  // Get consultation with patient info
  const consultation = await prisma.consultation.findUnique({
    where: { id: params.id },
    include: {
      patient: {
        select: { name: true }
      }
    }
  }).catch(() => null)

  const patientName = consultation?.patient?.name || 'Paciente'

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header Compacto */}
      <header className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href={`/consultations/${params.id}`}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Voltar para consulta"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              <div>
                <h1 className="text-lg font-bold leading-tight">Teleconsulta</h1>
                <p className="text-xs text-teal-100">{patientName}</p>
              </div>
            </div>
          </div>
          <TeleInviteButton consultationId={params.id} />
        </div>
      </header>
      
      {/* Main Content - SOAP focado, vídeo flutua */}
      <div className="flex-1 relative overflow-hidden">
        {/* Área de Prontuário SOAP - Tela inteira, focado */}
        <div className="h-full overflow-y-auto">
          <TeleWorkspace consultationId={params.id} />
        </div>

        {/* Área de Vídeo - Flutuante no canto */}
        <div className="absolute top-4 right-4 z-50">
          <TeleRoomCompact 
            roomId={params.id} 
            userId={userId} 
            patientName={patientName}
          />
        </div>
      </div>
    </div>
  )
}
