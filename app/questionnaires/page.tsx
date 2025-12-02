"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Search, 
  FileText, 
  Send, 
  BarChart3,
  Leaf,
  Flower2,
  Circle,
  Sun,
  Clock,
  Users,
  ChevronRight,
  Loader2,
  Sparkles,
  User,
  ArrowRight
} from 'lucide-react'

interface QuestionnaireTemplate {
  id: string
  name: string
  description: string
  therapeuticSystem: string
  estimatedMinutes: number
  iconEmoji: string
  themeColor: string
  isBuiltIn: boolean
  isPublic: boolean
  questionCount: number
  _count: {
    sentQuestionnaires: number
  }
  categories: Array<{
    id: string
    name: string
    questions: Array<{ id: string }>
  }>
}

const SYSTEM_ICONS: Record<string, any> = {
  AYURVEDA: Leaf,
  HOMEOPATHY: Flower2,
  TCM: Circle,
  ANTHROPOSOPHY: Sun,
  GENERAL: FileText
}

const SYSTEM_LABELS: Record<string, string> = {
  AYURVEDA: 'Ayurveda',
  HOMEOPATHY: 'Homeopatia',
  TCM: 'Medicina Tradicional Chinesa',
  ANTHROPOSOPHY: 'Antroposofia',
  NATUROPATHY: 'Naturopatia',
  FUNCTIONAL: 'Medicina Funcional',
  GENERAL: 'Geral',
  CUSTOM: 'Personalizado'
}

function QuestionnairesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams?.get('patientId') || null
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
  const [patient, setPatient] = useState<{ id: string; name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    fetchTemplates()
    if (patientId) {
      fetchPatient(patientId)
    }
  }, [patientId])

  async function fetchPatient(id: string) {
    try {
      const res = await fetch(`/api/patients/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPatient(data)
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/questionnaires')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function seedBuiltInTemplates() {
    setSeeding(true)
    try {
      const res = await fetch('/api/questionnaires/seed', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        alert(`Templates criados: ${data.message}`)
        fetchTemplates()
      } else {
        const err = await res.json()
        alert(`Erro: ${err.error}`)
      }
    } catch (error) {
      console.error('Error seeding templates:', error)
    } finally {
      setSeeding(false)
    }
  }

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === 'all') return matchSearch
    if (activeTab === 'builtin') return matchSearch && t.isBuiltIn
    if (activeTab === 'mine') return matchSearch && !t.isBuiltIn
    return matchSearch && t.therapeuticSystem === activeTab.toUpperCase()
  })

  const systems = [...new Set(templates.map(t => t.therapeuticSystem))]

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Banner de Paciente Selecionado */}
      {patient && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <User className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Enviando questionário para: <strong>{patient.name}</strong> ({patient.email})
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/questionnaires')}
            >
              Cancelar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {patient ? 'Escolha um Questionário' : 'Questionários Integrativos'}
          </h1>
          <p className="text-muted-foreground">
            Anamneses e avaliações para medicina integrativa
          </p>
        </div>
        <div className="flex gap-2">
          {templates.filter(t => t.isBuiltIn).length === 0 && (
            <Button 
              variant="outline" 
              onClick={seedBuiltInTemplates}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Carregar Templates
            </Button>
          )}
          <Button onClick={() => router.push('/questionnaires/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Questionário
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.reduce((acc, t) => acc + t._count.sentQuestionnaires, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter(t => t.isBuiltIn).length}
                </p>
                <p className="text-sm text-muted-foreground">Do Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter(t => !t.isBuiltIn).length}
                </p>
                <p className="text-sm text-muted-foreground">Personalizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar questionários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="builtin">Do Sistema</TabsTrigger>
          <TabsTrigger value="mine">Meus</TabsTrigger>
          {systems.map(sys => (
            <TabsTrigger key={sys} value={sys.toLowerCase()}>
              {SYSTEM_LABELS[sys] || sys}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum questionário encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {templates.length === 0 
                    ? 'Clique em "Carregar Templates" para adicionar os questionários pré-definidos.'
                    : 'Tente ajustar os filtros ou criar um novo questionário.'}
                </p>
                {templates.length === 0 && (
                  <Button onClick={seedBuiltInTemplates} disabled={seeding}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Carregar Templates do Sistema
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => {
                const Icon = SYSTEM_ICONS[template.therapeuticSystem] || FileText
                return (
                  <Card 
                    key={template.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => {
                      if (patient) {
                        router.push(`/questionnaires/${template.id}?patientId=${patient.id}`)
                      } else {
                        router.push(`/questionnaires/${template.id}`)
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div 
                          className="p-3 rounded-lg text-2xl"
                          style={{ backgroundColor: `${template.themeColor}20` }}
                        >
                          {template.iconEmoji || <Icon className="h-6 w-6" style={{ color: template.themeColor }} />}
                        </div>
                        <div className="flex gap-1">
                          {template.isBuiltIn && (
                            <Badge variant="secondary">Sistema</Badge>
                          )}
                          {template.isPublic && !template.isBuiltIn && (
                            <Badge variant="outline">Público</Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="mt-3 group-hover:text-primary transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {template.questionCount} perguntas
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          ~{template.estimatedMinutes} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Send className="h-4 w-4" />
                          {template._count.sentQuestionnaires}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: template.themeColor,
                            color: template.themeColor
                          }}
                        >
                          {SYSTEM_LABELS[template.therapeuticSystem] || template.therapeuticSystem}
                        </Badge>
                        {patient ? (
                          <Button size="sm" className="gap-1" style={{ backgroundColor: template.themeColor }}>
                            <Send className="h-3 w-3" />
                            Enviar
                          </Button>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function QuestionnairesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <QuestionnairesPageContent />
    </Suspense>
  )
}
