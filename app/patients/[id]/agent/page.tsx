import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MedicalAgentPanel } from '@/components/ai/medical-agent-panel'

interface PatientAgentPageProps {
  params: {
    id: string
  }
}

export const metadata: Metadata = {
  title: 'Agente Médico IA - Sistema de Prontuário Eletrônico',
  description: 'Agente inteligente para análise do histórico médico completo',
}

export default function PatientAgentPage({ params }: PatientAgentPageProps) {
  // Em uma implementação real, você buscaria os dados do paciente pelo ID
  const mockPatientData = {
    id: params.id,
    name: 'Maria Santos',
    age: 45,
    diagnosis: 'Hipertensão Arterial',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Agente Médico IA
                </h1>
                <p className="text-gray-600 mt-2">
                  Análise inteligente do histórico médico de <span className="font-semibold">{mockPatientData.name}</span>
                </p>
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  🤖 Google AI Studio (Gemini) Ativo
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Informações Básicas do Paciente */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Informações do Paciente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-lg font-semibold text-gray-900">{mockPatientData.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Idade</label>
                  <p className="text-lg font-semibold text-gray-900">{mockPatientData.age} anos</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Diagnóstico Principal</label>
                  <p className="text-lg font-semibold text-gray-900">{mockPatientData.diagnosis}</p>
                </div>
              </div>
            </div>

            {/* Painel do Agente Médico */}
            <MedicalAgentPanel 
              patientId={params.id}
              patientName={mockPatientData.name}
            />

            {/* Instruções de Uso */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 Como Usar o Agente Médico IA
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">🔍 Analisar Histórico Completo</h4>
                  <p>A IA vasculha todo o histórico médico, consultas, exames, prescrições e sinais vitais para criar um resumo clínico inteligente.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">📋 Gerar Evolução Médica</h4>
                  <p>Baseada no histórico analisado, a IA sugere uma evolução médica estruturada com avaliação, plano e seguimento.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">📈 Análise de Tendências</h4>
                  <p>Identifica padrões e tendências nos sinais vitais ao longo do tempo, alertando para mudanças significativas.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
