"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  Send, 
  Edit, 
  Copy, 
  Trash2, 
  Clock,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link as LinkIcon,
  Loader2,
  Eye,
  BarChart3
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Patient {
  id: string
  name: string
  email: string
}

interface SentQuestionnaire {
  id: string
  status: string
  progressPercent: number
  sentAt: string
  startedAt: string | null
  completedAt: string | null
  expiresAt: string | null
  accessToken: string
  patient: {
    id: string
    name: string
    email: string
  }
}

interface QuestionOption {
  id: string
  text: string
  emoji: string | null
  description: string | null
}

interface Question {
  id: string
  text: string
  helpText: string | null
  type: string
  isRequired: boolean
  scaleMin: number | null
  scaleMax: number | null
  scaleMinLabel: string | null
  scaleMaxLabel: string | null
  options: QuestionOption[]
}

interface Category {
  id: string
  name: string
  description: string | null
  iconEmoji: string | null
  questions: Question[]
}

interface Template {
  id: string
  name: string
  description: string | null
  patientIntro: string | null
  therapeuticSystem: string
  estimatedMinutes: number
  allowPause: boolean
  showProgress: boolean
  themeColor: string | null
  iconEmoji: string | null
  isBuiltIn: boolean
  isPublic: boolean
  aiAnalysisPrompt: string | null
  categories: Category[]
  _count: {
    sentQuestionnaires: number
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: 'Expirado', color: 'bg-red-100 text-red-800', icon: XCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle }
}

function TemplateDetailPageContent({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams?.get('patientId') || null
  const [template, setTemplate] = useState<Template | null>(null)
  const [sentQuestionnaires, setSentQuestionnaires] = useState<SentQuestionnaire[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatientId || '')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplate()
    fetchSentQuestionnaires()
    fetchPatients()
    // Auto-open dialog if patient is preselected
    if (preselectedPatientId) {
      setShowSendDialog(true)
    }
  }, [params.id, preselectedPatientId])

  async function fetchTemplate() {
    try {
      const res = await fetch(`/api/questionnaires/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setTemplate(data)
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSentQuestionnaires() {
    try {
      const res = await fetch(`/api/questionnaires/${params.id}/send`)
      if (res.ok) {
        const data = await res.json()
        setSentQuestionnaires(data)
      }
    } catch (error) {
      console.error('Error fetching sent questionnaires:', error)
    }
  }

  async function fetchPatients() {
    try {
      const res = await fetch('/api/patients?limit=100')
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || data)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  async function sendToPatient() {
    if (!selectedPatient) return

    setSending(true)
    try {
      const res = await fetch(`/api/questionnaires/${params.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient,
          expiresInDays: parseInt(expiresInDays)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShowSendDialog(false)
        setSelectedPatient('')
        fetchSentQuestionnaires()
        
        // Show success with link
        if (data.accessUrl) {
          alert(`Questionário enviado!\n\nLink: ${data.accessUrl}`)
        }
      } else {
        const err = await res.json()
        alert(`Erro: ${err.error}`)
      }
    } catch (error) {
      console.error('Error sending questionnaire:', error)
    } finally {
      setSending(false)
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/questionnaire/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(token)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Template não encontrado</h3>
            <Button className="mt-4" onClick={() => router.push('/questionnaires')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalQuestions = template.categories.reduce((acc, cat) => acc + cat.questions.length, 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/questionnaires')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.iconEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!template.isBuiltIn && (
            <>
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Enviar para Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Questionário</DialogTitle>
                <DialogDescription>
                  Selecione o paciente que receberá este questionário
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo para responder (dias)</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={sendToPatient} disabled={!selectedPatient || sending}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalQuestions}</p>
                <p className="text-sm text-muted-foreground">Perguntas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">~{template.estimatedMinutes}</p>
                <p className="text-sm text-muted-foreground">Minutos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{sentQuestionnaires.length}</p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {sentQuestionnaires.filter(q => q.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-muted-foreground">Respondidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="h-4 w-4 mr-2" />
            Enviados ({sentQuestionnaires.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {/* Intro */}
          {template.patientIntro && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Introdução para o Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{template.patientIntro}</p>
              </CardContent>
            </Card>
          )}

          {/* Categories and Questions */}
          {template.categories.map((category, catIndex) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{category.iconEmoji}</span>
                  {catIndex + 1}. {category.name}
                </CardTitle>
                {category.description && (
                  <CardDescription>{category.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {category.questions.map((question, qIndex) => (
                  <div key={question.id} className="border-l-2 border-muted pl-4">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground">
                        {catIndex + 1}.{qIndex + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {question.text}
                          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {question.helpText && (
                          <p className="text-sm text-muted-foreground mt-1">{question.helpText}</p>
                        )}
                        
                        {/* Question Type Preview */}
                        <div className="mt-3">
                          {question.type === 'SCALE' && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{question.scaleMinLabel || question.scaleMin}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full" />
                              <span>{question.scaleMaxLabel || question.scaleMax}</span>
                            </div>
                          )}
                          
                          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
                            <div className="flex flex-wrap gap-2">
                              {question.options.map(opt => (
                                <Badge key={opt.id} variant="outline" className="font-normal">
                                  {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
                                  {opt.text}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'TEXT' && (
                            <div className="h-20 border rounded-md bg-muted/30" />
                          )}
                          
                          {question.type === 'YES_NO' && (
                            <div className="flex gap-2">
                              <Badge variant="outline">Sim</Badge>
                              <Badge variant="outline">Não</Badge>
                            </div>
                          )}
                        </div>

                        <Badge variant="secondary" className="mt-2 text-xs">
                          {question.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent">
          {sentQuestionnaires.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum questionário enviado</h3>
                <p className="text-muted-foreground mb-4">
                  Envie este questionário para um paciente para começar a coletar respostas.
                </p>
                <Button onClick={() => setShowSendDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Paciente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Paciente</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Progresso</th>
                      <th className="text-left p-4 font-medium">Enviado</th>
                      <th className="text-left p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentQuestionnaires.map(sq => {
                      const status = STATUS_LABELS[sq.status] || STATUS_LABELS.PENDING
                      const StatusIcon = status.icon
                      return (
                        <tr key={sq.id} className="border-t">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{sq.patient.name}</p>
                              <p className="text-sm text-muted-foreground">{sq.patient.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full max-w-[100px]">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${sq.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {sq.progressPercent}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(sq.sentAt), { 
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyLink(sq.accessToken)}
                              >
                                <LinkIcon className="h-4 w-4 mr-1" />
                                {copiedLink === sq.accessToken ? 'Copiado!' : 'Copiar Link'}
                              </Button>
                              {sq.status === 'COMPLETED' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => router.push(`/questionnaires/responses/${sq.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Análises em breve</h3>
              <p className="text-muted-foreground">
                Estatísticas agregadas e padrões nas respostas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function TemplateDetailPageWrapper({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TemplateDetailPageContent params={params} />
    </Suspense>
  )
}
