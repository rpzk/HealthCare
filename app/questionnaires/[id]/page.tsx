"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  Send, 
  Edit, 
  Copy, 
  Trash2,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link as LinkIcon,
  Loader2,
  Eye,
  BarChart3,
  LucideProps,
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
  createdBy?: {
    id: string
    name: string
  }
  createdById?: string | null
  _count: {
    sentQuestionnaires: number
  }
}

type SessionInfo = {
  user?: {
    id?: string
    role?: string
    availableRoles?: string[]
  }
}

function isAdminSession(session: SessionInfo | null) {
  const role = session?.user?.role
  const availableRoles = session?.user?.availableRoles
  return role === 'ADMIN' || (Array.isArray(availableRoles) && availableRoles.includes('ADMIN'))
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.FC<LucideProps> }> = {
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
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [sentQuestionnaires, setSentQuestionnaires] = useState<SentQuestionnaire[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editJson, setEditJson] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatientId || '')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        setSessionInfo(data)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchTemplate = useCallback(async () => {
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
  }, [params.id])

  const fetchSentQuestionnaires = useCallback(async () => {
    try {
      const res = await fetch(`/api/questionnaires/${params.id}/send`)
      if (res.ok) {
        const data = await res.json()
        setSentQuestionnaires(data)
      }
    } catch (error) {
      console.error('Error fetching sent questionnaires:', error)
    }
  }, [params.id])

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients?limit=100')
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || data)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }, [])

  useEffect(() => {
    fetchTemplate()
    fetchSentQuestionnaires()
    fetchPatients()
    fetchSession()
    // Auto-open dialog if patient is preselected
    if (preselectedPatientId) {
      setShowSendDialog(true)
    }
  }, [preselectedPatientId, fetchTemplate, fetchSentQuestionnaires, fetchPatients, fetchSession])

  function openEdit() {
    if (!template) return

    const editable = {
      name: template.name,
      description: template.description,
      patientIntro: template.patientIntro,
      therapeuticSystem: template.therapeuticSystem,
      estimatedMinutes: template.estimatedMinutes,
      allowPause: template.allowPause,
      showProgress: template.showProgress,
      randomizeQuestions: (template as any).randomizeQuestions,
      themeColor: template.themeColor,
      iconEmoji: template.iconEmoji,
      isPublic: template.isPublic,
      aiAnalysisPrompt: template.aiAnalysisPrompt,
      scoringLogic: (template as any).scoringLogic ?? null,
      categories: template.categories?.map(cat => ({
        name: cat.name,
        description: cat.description,
        iconEmoji: cat.iconEmoji,
        order: undefined,
        questions: cat.questions?.map(q => ({
          text: q.text,
          helpText: q.helpText,
          imageUrl: null,
          type: q.type,
          isRequired: q.isRequired,
          order: undefined,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          options: (q.options || []).map(o => ({
            text: o.text,
            emoji: o.emoji,
            description: o.description,
            imageUrl: null,
            order: undefined,
          })),
        })),
      })),
    }

    setEditJson(JSON.stringify(editable, null, 2))
    setShowEditDialog(true)
  }

  async function saveEdit() {
    if (!template) return
    setSavingEdit(true)
    try {
      const parsed = JSON.parse(editJson)
      const res = await fetch(`/api/questionnaires/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      if (res.ok) {
        setShowEditDialog(false)
        fetchTemplate()
        return
      }

      const err = await res.json().catch(() => null)
      alert(`Erro: ${err?.error || 'Falha ao salvar'}`)
    } catch (e: any) {
      alert(`Erro: ${e?.message || 'JSON inválido'}`)
    } finally {
      setSavingEdit(false)
    }
  }

  async function copyTemplate() {
    if (!template) return
    setCopying(true)
    try {
      const payload = {
        name: `${template.name} (cópia)`,
        description: template.description,
        patientIntro: template.patientIntro,
        therapeuticSystem: template.therapeuticSystem,
        estimatedMinutes: template.estimatedMinutes,
        allowPause: template.allowPause,
        showProgress: template.showProgress,
        randomizeQuestions: (template as any).randomizeQuestions,
        themeColor: template.themeColor,
        iconEmoji: template.iconEmoji,
        isPublic: false,
        aiAnalysisPrompt: template.aiAnalysisPrompt,
        scoringLogic: (template as any).scoringLogic ?? null,
        categories: template.categories?.map((cat) => ({
          name: cat.name,
          description: cat.description,
          iconEmoji: cat.iconEmoji,
          questions: cat.questions?.map((q) => ({
            text: q.text,
            helpText: q.helpText,
            type: q.type,
            isRequired: q.isRequired,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            scaleMinLabel: q.scaleMinLabel,
            scaleMaxLabel: q.scaleMaxLabel,
            options: (q.options || []).map((o) => ({
              text: o.text,
              emoji: o.emoji,
              description: o.description,
            })),
          })),
        })),
      }

      const res = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const created = await res.json()
        router.push(`/questionnaires/${created.id}`)
        return
      }

      const err = await res.json().catch(() => null)
      alert(`Erro: ${err?.error || 'Falha ao copiar'}`)
    } catch (e: any) {
      alert(`Erro: ${e?.message || 'Falha ao copiar'}`)
    } finally {
      setCopying(false)
    }
  }

  async function deleteTemplate() {
    if (!template) return
    const ok = window.confirm('Tem certeza que deseja excluir este template?')
    if (!ok) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/questionnaires/${template.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/questionnaires')
        return
      }

      const err = await res.json().catch(() => null)
      alert(`Erro: ${err?.error || 'Falha ao excluir'}`)
    } catch (e: any) {
      alert(`Erro: ${e?.message || 'Falha ao excluir'}`)
    } finally {
      setDeleting(false)
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Template não encontrado</h3>
                <Button className="mt-4" onClick={() => router.push('/questionnaires')}>
                  Voltar
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const isAdmin = isAdminSession(sessionInfo)
  const canEdit = isAdmin || (!template.isBuiltIn)
  const canDelete = isAdmin || (!template.isBuiltIn)
  const canCopy = true

  const totalQuestions = template.categories.reduce((acc: number, cat: Category) => acc + cat.questions.length, 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
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
          {canEdit && (
            <Button variant="outline" size="icon" onClick={openEdit} title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canCopy && (
            <Button
              variant="outline"
              size="icon"
              onClick={copyTemplate}
              disabled={copying}
              title="Criar cópia editável"
            >
              {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="icon"
              onClick={deleteTemplate}
              disabled={deleting}
              title="Excluir"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}

          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Editar template (JSON)</DialogTitle>
                <DialogDescription>
                  Edite o JSON do template. Se o template já foi enviado, alterações estruturais podem ser bloqueadas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label>Template</Label>
                <Textarea
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  className="min-h-[420px] font-mono"
                  spellCheck={false}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={savingEdit}>
                  Cancelar
                </Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Analytics rápidos</CardTitle>
                <CardDescription>Resumo das remessas e conclusão do questionário</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>Atualiza ao abrir a aba</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total enviado</p>
                <p className="text-3xl font-bold">{sentQuestionnaires.length}</p>
                <div className="text-sm text-muted-foreground">
                  {template._count.sentQuestionnaires} histórico(s) registrado(s)
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Conclusão</p>
                {(() => {
                  const completed = sentQuestionnaires.filter(sq => sq.status === 'COMPLETED').length
                  const rate = sentQuestionnaires.length > 0 
                    ? Math.round((completed / sentQuestionnaires.length) * 100)
                    : 0
                  return (
                    <>
                      <p className="text-3xl font-bold">{rate}%</p>
                      <p className="text-sm text-muted-foreground">{completed} concluído(s)</p>
                    </>
                  )
                })()}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="space-y-1 text-sm">
                  {(['PENDING','IN_PROGRESS','COMPLETED','EXPIRED','CANCELLED'] as const).map(status => {
                    const count = sentQuestionnaires.filter(sq => sq.status === status).length
                    if (count === 0) return null
                    const statusMeta = STATUS_LABELS[status]
                    const StatusIcon = statusMeta.icon
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusMeta.color.replace('bg-','text-').split(' ')[0]}`} />
                        <span className="font-medium">{statusMeta.label}</span>
                        <span className="text-muted-foreground">· {count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </div>
        </main>
      </div>
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
