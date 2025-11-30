'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StratumAssessment } from '@/components/hr/stratum-assessment'
import { 
  Brain, 
  Users, 
  BarChart3, 
  Settings,
  BookOpen,
  Target
} from 'lucide-react'

export default function StratumPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('assessment')

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Capacidade para o Trabalho
            </h1>
            <p className="text-gray-500">
              Sistema de avaliação baseado na teoria de Elliott Jaques
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="assessment" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Avaliação</span>
          </TabsTrigger>
          <TabsTrigger value="theory" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Teoria</span>
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="assessment" className="mt-6">
          <StratumAssessment />
        </TabsContent>

        <TabsContent value="theory" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Teoria dos Estratos de Elliott Jaques</CardTitle>
                <CardDescription>
                  Entenda como funciona a medição de capacidade para o trabalho
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <h4>O que é Time Span of Discretion?</h4>
                <p>
                  Time Span of Discretion (TSD) é o período mais longo que uma pessoa 
                  consegue trabalhar autonomamente em uma tarefa sem supervisão, mantendo 
                  qualidade e direção. É uma medida objetiva da capacidade de planejamento 
                  e execução de uma pessoa.
                </p>

                <h4>Os 8 Estratos Organizacionais</h4>
                <div className="grid gap-3 not-prose">
                  {[
                    { level: 'S1', name: 'Operacional', time: '1 dia - 3 meses', desc: 'Tarefas concretas, procedimentos definidos' },
                    { level: 'S2', name: 'Supervisor', time: '3 meses - 1 ano', desc: 'Gerencia fluxos e pequenas equipes' },
                    { level: 'S3', name: 'Gerente', time: '1 - 2 anos', desc: 'Coordena projetos e desenvolve sistemas' },
                    { level: 'S4', name: 'Diretor', time: '2 - 5 anos', desc: 'Estratégia de médio prazo, integração' },
                    { level: 'S5', name: 'Vice-Presidente', time: '5 - 10 anos', desc: 'Visão estratégica, posicionamento' },
                    { level: 'S6', name: 'CEO', time: '10 - 20 anos', desc: 'Transformação, legado organizacional' },
                    { level: 'S7', name: 'Estadista', time: '20 - 50 anos', desc: 'Impacto civilizatório, instituições' },
                    { level: 'S8', name: 'Visionário', time: '50+ anos', desc: 'Impacto histórico permanente (raro)' }
                  ].map((stratum) => (
                    <div key={stratum.level} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <Badge variant="outline" className="font-mono">{stratum.level}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{stratum.name}</p>
                        <p className="text-sm text-gray-500">{stratum.desc}</p>
                      </div>
                      <span className="text-sm text-blue-600 font-medium">{stratum.time}</span>
                    </div>
                  ))}
                </div>

                <h4 className="mt-6">Por que isso importa?</h4>
                <ul>
                  <li><strong>Fit Pessoa-Cargo:</strong> Quando há alinhamento entre a capacidade da pessoa e as demandas do cargo, há maior satisfação e desempenho.</li>
                  <li><strong>Desenvolvimento:</strong> A capacidade aumenta naturalmente com a maturação (cerca de 1 estrato a cada 15-20 anos).</li>
                  <li><strong>Gestão:</strong> Gerentes devem estar 1 estrato acima de seus subordinados diretos.</li>
                  <li><strong>Recrutamento:</strong> Contratar pessoas no estrato certo evita frustração e turnover.</li>
                </ul>

                <h4>Referências</h4>
                <ul>
                  <li>Jaques, E. (1989). Requisite Organization</li>
                  <li>Jaques, E. & Cason, K. (1994). Human Capability</li>
                  <li><a href="https://www.youtube.com/@FosterLearning" target="_blank" rel="noopener noreferrer">Foster Learning - Time Span 101</a></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics de Capacidade</CardTitle>
                <CardDescription>
                  Visão geral das avaliações da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics em desenvolvimento</p>
                  <p className="text-sm mt-2">
                    Aqui você verá distribuição de estratos, fit pessoa-cargo e insights organizacionais.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Gerenciar questões e perfis de cargo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configurações em desenvolvimento</p>
                  <p className="text-sm mt-2">
                    Aqui você poderá adicionar questões, definir perfis de cargo e mapear CBO.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
