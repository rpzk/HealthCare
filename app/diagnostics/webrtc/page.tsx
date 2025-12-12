import { WebRTCDiagnostics } from '@/components/diagnostics/webrtc-diagnostics'

export const metadata = {
  title: 'Diagnóstico WebRTC - HealthCare',
  description: 'Teste de conectividade para teleconsultas'
}

export default function WebRTCDiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-8 py-6">
            <h1 className="text-3xl font-bold">Diagnóstico de Conectividade</h1>
            <p className="text-emerald-100 mt-2">
              Teste se seu dispositivo está pronto para teleconsultas
            </p>
          </div>
          
          <div className="p-8">
            <WebRTCDiagnostics />
          </div>
        </div>
      </div>
    </div>
  )
}
