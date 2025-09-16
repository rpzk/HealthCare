'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { SymptomAnalyzer } from '@/components/ai/symptom-analyzer'
import { DrugInteractionChecker } from '@/components/ai/drug-interaction-checker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Brain, 
  Pill, 
  Stethoscope, 
  TrendingUp,
  Shield,
  Activity
} from 'lucide-react'

export default function AImedicalPage() {
  const [activeTab, setActiveTab] = useState<'symptoms' | 'interactions' | 'overview'>('overview')

  const TabButton = ({ 
    id, 
    label, 
    icon, 
    isActive, 
    onClick 
  }: { 
    id: string
    label: string
    icon: React.ReactNode
    isActive: boolean
    onClick: () => void 
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      className={`flex items-center gap-2 ${isActive ? '' : 'text-gray-600'}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )

  const OverviewCard = ({ 
    title, 
    description, 
    icon, 
    onClick,
    bgColor = "bg-white"
  }: {
    title: string
    description: string
    icon: React.ReactNode
    onClick: () => void
    bgColor?: string
  }) => (
    <Card 
      className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${bgColor}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="IA Médica Avançada"
            description="Sistema inteligente de apoio ao diagnóstico e análise médica"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'IA Médica', href: '/ai-medical' }
            ]}
            actions={(
              <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 border px-3 py-2 rounded-md text-sm">
                Atualizar
              </button>
            )}
          />

          {/* Navegação por Tabs */}
          <div className="flex gap-4 border-b border-gray-200 pb-4 mb-6">
            <TabButton
              id="overview"
              label="Visão Geral"
              icon={<Activity className="w-4 h-4" />}
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              id="symptoms"
              label="Análise de Sintomas"
              icon={<Stethoscope className="w-4 h-4" />}
              isActive={activeTab === 'symptoms'}
              onClick={() => setActiveTab('symptoms')}
            />
            <TabButton
              id="interactions"
              label="Interações Medicamentosas"
              icon={<Pill className="w-4 h-4" />}
              isActive={activeTab === 'interactions'}
              onClick={() => setActiveTab('interactions')}
            />
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Estatísticas Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">95%</h3>
                  <p className="text-gray-600">Precisão Diagnóstica</p>
                </Card>
                
                <Card className="p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Shield className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">1000+</h3>
                  <p className="text-gray-600">Medicamentos na Base</p>
                </Card>
                
                <Card className="p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Brain className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">24/7</h3>
                  <p className="text-gray-600">Disponibilidade</p>
                </Card>
              </div>

              {/* Funcionalidades Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <OverviewCard
                  title="Análise de Sintomas"
                  description="Sistema avançado de IA para análise de sintomas e sugestão de diagnósticos baseado em dados clínicos e histórico médico."
                  icon={<Stethoscope className="w-6 h-6 text-blue-600" />}
                  onClick={() => setActiveTab('symptoms')}
                />
                
                <OverviewCard
                  title="Verificação de Interações"
                  description="Detector inteligente de interações medicamentosas com base em conhecimento farmacológico atualizado."
                  icon={<Pill className="w-6 h-6 text-orange-600" />}
                  onClick={() => setActiveTab('interactions')}
                />
              </div>

              {/* Recursos Adicionais */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recursos Disponíveis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Análise de sinais vitais</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sugestões de exames complementares</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Identificação de sinais de alerta</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Recomendações de tratamento</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Contraindicações medicamentosas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <span>Resumos médicos automatizados</span>
                  </div>
                </div>
              </Card>

              {/* Aviso Legal */}
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Aviso Importante</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Este sistema é uma ferramenta de apoio ao diagnóstico médico. 
                      Não substitui a avaliação clínica de um profissional de saúde qualificado. 
                      Sempre consulte um médico para diagnósticos definitivos e decisões terapêuticas.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'symptoms' && <SymptomAnalyzer />}
          {activeTab === 'interactions' && <DrugInteractionChecker />}
        </main>
      </div>
    </div>
  )
}
