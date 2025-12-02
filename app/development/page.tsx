'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StratumAssessment } from '@/components/hr/stratum-assessment'
import { StrengthsAssessment } from '@/components/hr/strengths-assessment'
import { DevelopmentPlanComponent } from '@/components/hr/development-plan'
import { DevelopmentDashboard } from '@/components/hr/development-dashboard'
import { IntegralProfile } from '@/components/hr/integral-profile'
import { 
  Brain, 
  Gem,
  Target,
  TrendingUp,
  BookOpen,
  Sparkles,
  Heart,
  BarChart3
} from 'lucide-react'

export default function DevelopmentPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Desenvolvimento Humano
            </h1>
            <p className="text-gray-500">
              Descubra seu potencial e desenvolva suas forças
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="stratum" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Horizonte</span>
          </TabsTrigger>
          <TabsTrigger value="strengths" className="flex items-center gap-2">
            <Gem className="h-4 w-4" />
            <span className="hidden sm:inline">Forças</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Plano</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6">
            {/* Introdução */}
            <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Bem-vindo ao seu Espaço de Desenvolvimento
                </CardTitle>
                <CardDescription className="text-base">
                  Aqui você pode descobrir e desenvolver seu potencial único
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Este módulo combina a ciência da capacidade humana (Elliott Jaques) com a 
                  psicologia positiva (Martin Seligman) para ajudá-lo a entender seu potencial 
                  e criar um caminho de desenvolvimento personalizado.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setActiveTab('stratum')}
                    className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-left border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Brain className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Horizonte Temporal</h3>
                        <Badge variant="outline" className="text-xs">~10 min</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Descubra sua capacidade natural de planejar e visualizar o futuro. 
                      Baseado na teoria de Elliott Jaques.
                    </p>
                  </button>

                  <button 
                    onClick={() => setActiveTab('strengths')}
                    className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-left border-l-4 border-purple-500"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Gem className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Forças de Caráter</h3>
                        <Badge variant="outline" className="text-xs">~8 min</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Identifique suas gemas brutas - forças naturais que você pode 
                      usar para melhorar sua vida e saúde.
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Por que isso importa */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Autoconhecimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Entenda como você naturalmente processa informações e toma decisões.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-600" />
                    Saúde Integral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Use suas forças para criar motivação intrínseca para mudanças de hábito.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Crescimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Desenvolva um plano personalizado de evolução baseado em ciência.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Citação inspiradora */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <blockquote className="text-center">
                  <p className="text-lg italic text-gray-700 mb-2">
                    "A boa vida é usar suas forças características todos os dias 
                    para produzir felicidade autêntica e gratificação abundante."
                  </p>
                  <footer className="text-sm text-gray-500">
                    — Martin Seligman, Psicologia Positiva
                  </footer>
                </blockquote>
              </CardContent>
            </Card>

            {/* Dashboard de Progresso */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Seu Progresso</h2>
              </div>
              <DevelopmentDashboard />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <IntegralProfile />
        </TabsContent>

        <TabsContent value="stratum" className="mt-6">
          <StratumAssessment />
        </TabsContent>

        <TabsContent value="strengths" className="mt-6">
          <StrengthsAssessment />
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <DevelopmentPlanComponent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
