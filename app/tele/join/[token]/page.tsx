import { PrismaClient } from '@prisma/client'
import { TelePatientRoom } from '@/components/tele/patient-room'
import { Video, Shield, Clock, User, Stethoscope } from 'lucide-react'

const globalForTele = globalThis as typeof globalThis & {
  teleJoinPrisma?: PrismaClient
}

function getPrisma(): PrismaClient {
  if (!globalForTele.teleJoinPrisma) {
    globalForTele.teleJoinPrisma = new PrismaClient({ log: ['error'] })
  }
  return globalForTele.teleJoinPrisma
}

interface Props {
  params: { token: string }
}

export default async function TeleJoinPage({ params }: Props) {
  const prisma = getPrisma()
  
  // Buscar consulta pelo token (meetingLink)
  const consultation = await prisma.consultation.findFirst({
    where: { meetingLink: params.token },
    include: {
      patient: {
        select: {
          id: true,
          name: true
        }
      },
      doctor: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!consultation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Link Inválido</h1>
          <p className="text-gray-600 mb-6">
            Este link de teleconsulta não é válido ou já expirou. 
            Por favor, solicite um novo link ao seu médico.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
            <p>Se você acredita que isso é um erro, entre em contato com a clínica.</p>
          </div>
        </div>
      </div>
    )
  }

  if (consultation.status === 'COMPLETED' || consultation.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Consulta Finalizada</h1>
          <p className="text-gray-600 mb-6">
            Esta teleconsulta já foi {consultation.status === 'CANCELLED' ? 'cancelada' : 'encerrada'}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
            <p>Se precisar de outra consulta, entre em contato com a clínica.</p>
          </div>
        </div>
      </div>
    )
  }

  const scheduledDate = consultation.scheduledFor 
    ? new Date(consultation.scheduledFor).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Teleconsulta</h1>
                <p className="text-emerald-100 text-sm font-medium">HealthCare System</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-2 text-emerald-100 text-sm">
                <Stethoscope className="w-4 h-4" />
                <span>Médico(a)</span>
              </div>
              <p className="font-semibold text-lg">Dr(a). {consultation.doctor?.name || 'Médico'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Patient Info Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Paciente</p>
                  <p className="text-lg font-semibold text-gray-800">{consultation.patient?.name}</p>
                </div>
              </div>
              
              {scheduledDate && (
                <div className="flex items-center gap-2 text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{scheduledDate}</span>
                </div>
              )}

              {/* Mobile doctor info */}
              <div className="sm:hidden w-full">
                <div className="flex items-center gap-2 text-gray-600">
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-sm">Dr(a). {consultation.doctor?.name || 'Médico'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Area */}
          <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-white">
            <TelePatientRoom 
              roomId={consultation.id} 
              patientName={consultation.patient?.name || 'Paciente'}
              doctorName={consultation.doctor?.name || undefined}
            />
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-t border-emerald-100">
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
              <Shield className="w-4 h-4" />
              <span>Consulta segura e confidencial - Seus dados estão protegidos</span>
            </div>
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
          <h3 className="font-semibold text-white mb-3">Precisa de ajuda?</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">1.</span>
              <span>Certifique-se de que sua câmera e microfone estão conectados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">2.</span>
              <span>Permita o acesso quando o navegador solicitar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">3.</span>
              <span>Se tiver problemas, tente usar outro navegador (Chrome recomendado)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">4.</span>
              <span>Verifique sua conexão com a internet</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
