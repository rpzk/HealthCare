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
  Activity,
  Sparkles
} from 'lucide-react'

export default function AImedicalPage() {
  const [activeTab, setActiveTab] = useState<'symptoms' | 'interactions' | 'overview' | 'integrative'>('overview')

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
      className={`flex items-center gap-2 ${isActive ? '' : 'text-muted-foreground'}`}
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
            <TabButton
              id="integrative"
              label="Medicina Integrativa"
              icon={<Sparkles className="w-4 h-4" />}
              isActive={activeTab === 'integrative'}
              onClick={() => setActiveTab('integrative')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <OverviewCard
                  title="Análise de Sintomas"
                  description="Descreva os sintomas do paciente para receber sugestões de diagnóstico baseadas em IA."
                  icon={<Stethoscope className="w-6 h-6 text-blue-600" />}
                  onClick={() => setActiveTab('symptoms')}
                />
                <OverviewCard
                  title="Interações Medicamentosas"
                  description="Verifique a segurança da combinação de medicamentos prescritos."
                  icon={<Pill className="w-6 h-6 text-blue-600" />}
                  onClick={() => setActiveTab('interactions')}
                />
                <OverviewCard
                  title="Medicina Integrativa"
                  description="Ferramentas de Astrologia Médica, Homeopatia e Acupuntura."
                  icon={<Sparkles className="w-6 h-6 text-purple-600" />}
                  onClick={() => setActiveTab('integrative')}
                  bgColor="bg-purple-50 dark:bg-purple-900/20"
                />
              </div>
            </div>
          )}

          {activeTab === 'symptoms' && <SymptomAnalyzer />}
          {activeTab === 'interactions' && <DrugInteractionChecker />}
          {activeTab === 'integrative' && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Módulo de Medicina Integrativa & Suporte Holístico</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Este módulo avançado integra práticas de saúde holística (MTC, Homeopatia) com a medicina convencional, apoiado por inteligência artificial para uma visão 360° do paciente.
                <br/><br/>
                <strong>Acesso Antecipado:</strong> Em fase de homologação clínica. Disponível em breve para usuários Beta.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
