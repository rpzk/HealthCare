'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  HelpCircle,
  Info,
  User,
  Calendar,
  FileWarning,
  Loader2,
  Eye,
  RotateCcw,
  Trash2,
  Send,
  BookOpen
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Tipos
interface ExportRequest {
  id: string
  patientId: string
  patientName: string
  patientEmail: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  requestedAt: string
  completedAt?: string
  expiresAt?: string
  filename?: string
  fileSize?: number
  errorMessage?: string
  requestedBy?: string
  logs: Array<{
    step: string
    percentage?: number
    message?: string
    timestamp: string
  }>
}

// Mapeamento de status para componentes visuais
const statusConfig = {
  PENDING: {
    label: 'Aguardando',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    description: 'Na fila para processamento'
  },
  PROCESSING: {
    label: 'Processando',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Loader2,
    description: 'Gerando documento...'
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle2,
    description: 'Pronto para download'
  },
  FAILED: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
    description: 'Erro no processamento'
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: XCircle,
    description: 'Cancelado pelo usuário ou admin'
  }
}

// Componente de checklist rápido - O que fazer agora
function QuickActionsChecklist({ requests }: { requests: ExportRequest[] }) {
  const pending = requests.filter(r => r.status === 'PENDING').length
  const failed = requests.filter(r => r.status === 'FAILED').length
  const expiringSoon = requests.filter(r => {
    if (r.status !== 'COMPLETED' || !r.expiresAt) return false
    const expiresAt = new Date(r.expiresAt)
    const now = new Date()
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 2 && diffDays > 0
  }).length

  const hasActions = pending > 0 || failed > 0 || expiringSoon > 0

  if (!hasActions) {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">✅ Tudo em ordem!</AlertTitle>
        <AlertDescription className="text-green-700">
          Não há ações pendentes no momento. O sistema está processando as solicitações automaticamente.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 flex items-center gap-2">
        📋 O que você precisa fazer agora:
      </AlertTitle>
      <AlertDescription className="text-orange-700 mt-2">
        <ul className="space-y-2">
          {failed > 0 && (
            <li className="flex items-start gap-2 bg-red-100 p-2 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-800">{failed} solicitação(ões) com erro</strong>
                <p className="text-sm">Clique na aba "Com Erro" e use o botão <RotateCcw className="h-3 w-3 inline" /> para reprocessar</p>
              </div>
            </li>
          )}
          {expiringSoon > 0 && (
            <li className="flex items-start gap-2 bg-amber-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-800">{expiringSoon} download(s) expirando em breve</strong>
                <p className="text-sm">Considere reenviar o link ao paciente com o botão <Send className="h-3 w-3 inline" /></p>
              </div>
            </li>
          )}
          {pending > 0 && (
            <li className="flex items-start gap-2 bg-blue-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-800">{pending} solicitação(ões) aguardando</strong>
                <p className="text-sm">O sistema processa automaticamente. Sem ação necessária.</p>
              </div>
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

// Componente de ajuda/guia
function HelpGuide() {
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <BookOpen className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">📖 Guia Completo - Como funciona este painel?</AlertTitle>
      <AlertDescription className="text-blue-700 mt-2">
        <div className="space-y-3">
          <p>
            <strong>Este painel gerencia solicitações de cópia de prontuário</strong> feitas pelos pacientes, 
            conforme seu direito garantido pela LGPD (Art. 18, V) e CFM 1.821/2007.
          </p>
          
          {/* Fluxo visual simplificado */}
          <div className="bg-white/70 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-3">🔄 Como funciona o fluxo:</h4>
            <div className="flex items-center justify-between text-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-yellow-200 rounded-full flex items-center justify-center">
                  <span className="text-xl">1️⃣</span>
                </div>
                <p className="mt-2 font-medium">Paciente Solicita</p>
                <p className="text-xs text-muted-foreground">Pelo app</p>
              </div>
              <div className="flex-1 h-0.5 bg-blue-300 mx-2" />
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-xl">2️⃣</span>
                </div>
                <p className="mt-2 font-medium">Sistema Processa</p>
                <p className="text-xs text-muted-foreground">Automático</p>
              </div>
              <div className="flex-1 h-0.5 bg-blue-300 mx-2" />
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-green-200 rounded-full flex items-center justify-center">
                  <span className="text-xl">3️⃣</span>
                </div>
                <p className="mt-2 font-medium">PDF Gerado</p>
                <p className="text-xs text-muted-foreground">Notificação enviada</p>
              </div>
              <div className="flex-1 h-0.5 bg-blue-300 mx-2" />
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-purple-200 rounded-full flex items-center justify-center">
                  <span className="text-xl">4️⃣</span>
                </div>
                <p className="mt-2 font-medium">Paciente Baixa</p>
                <p className="text-xs text-muted-foreground">7 dias p/ download</p>
              </div>
            </div>
          </div>
          
          {/* Status detalhado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/50 rounded-lg p-3">
              <h4 className="font-semibold flex items-center gap-2 text-blue-900">
                <Clock className="h-4 w-4" /> Aguardando
              </h4>
              <p className="text-sm mt-1">
                Solicitação na fila. O sistema processa automaticamente em ordem de chegada.
              </p>
              <p className="text-xs mt-2 italic">👉 Ação: Nenhuma - apenas monitore</p>
            </div>
            
            <div className="bg-white/50 rounded-lg p-3">
              <h4 className="font-semibold flex items-center gap-2 text-blue-900">
                <Loader2 className="h-4 w-4" /> Processando
              </h4>
              <p className="text-sm mt-1">
                O sistema está gerando o PDF. Pode levar alguns minutos dependendo do volume de dados.
              </p>
              <p className="text-xs mt-2 italic">👉 Ação: Aguarde - processo em andamento</p>
            </div>
            
            <div className="bg-white/50 rounded-lg p-3">
              <h4 className="font-semibold flex items-center gap-2 text-green-900">
                <CheckCircle2 className="h-4 w-4" /> Concluído
              </h4>
              <p className="text-sm mt-1">
                Documento pronto! O paciente pode baixar pelo app.
              </p>
              <p className="text-xs mt-2 italic">👉 Ação: Reenvie o link se o paciente pedir</p>
            </div>
            
            <div className="bg-white/50 rounded-lg p-3">
              <h4 className="font-semibold flex items-center gap-2 text-red-900">
                <XCircle className="h-4 w-4" /> Falhou
              </h4>
              <p className="text-sm mt-1">
                Ocorreu um erro no processamento.
              </p>
              <p className="text-xs mt-2 italic">👉 Ação: Clique em <RotateCcw className="h-3 w-3 inline" /> Reprocessar</p>
            </div>
          </div>

          {/* Ações explicadas */}
          <div className="bg-white/70 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-3">🎯 Botões de Ação:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="pointer-events-none">
                  <Eye className="h-4 w-4" />
                </Button>
                <span>Ver todos os detalhes da solicitação</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="pointer-events-none">
                  <Download className="h-4 w-4" />
                </Button>
                <span>Baixar o PDF para verificar</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="pointer-events-none">
                  <Send className="h-4 w-4" />
                </Button>
                <span>Reenviar link de download ao paciente</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="pointer-events-none">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <span>Tentar gerar o PDF novamente</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> ⚠️ Prazos Legais Importantes
            </h4>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>O paciente tem <strong>prazo legal de 15 dias</strong> para receber a cópia (LGPD Art. 19)</li>
              <li>O link de download expira em <strong>7 dias</strong> após geração</li>
              <li>Se expirou, basta clicar em "Reenviar Link" para gerar novo prazo</li>
              <li>Todas as ações são registradas para auditoria LGPD</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Componente de estatísticas
function StatsCards({ requests }: { requests: ExportRequest[] }) {
  const pending = requests.filter(r => r.status === 'PENDING').length
  const processing = requests.filter(r => r.status === 'PROCESSING').length
  const completed = requests.filter(r => r.status === 'COMPLETED').length
  const failed = requests.filter(r => r.status === 'FAILED').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-200 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-900">{pending}</p>
            <p className="text-xs text-yellow-700">Aguardando</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-200 rounded-lg">
            <Loader2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{processing}</p>
            <p className="text-xs text-blue-700">Processando</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-900">{completed}</p>
            <p className="text-xs text-green-700">Concluídos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-200 rounded-lg">
            <XCircle className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-900">{failed}</p>
            <p className="text-xs text-red-700">Com Erro</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente principal
export default function MedicalRecordRequestsPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<ExportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<ExportRequest | null>(null)
  const [showHelp, setShowHelp] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Carregar solicitações
  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/medical-record-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      } else {
        toast.error('Erro ao carregar solicitações')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadRequests, 30000)
    return () => clearInterval(interval)
  }, [loadRequests])

  // Filtrar solicitações
  const filteredRequests = requests.filter(req => {
    // Filtro por texto
    const matchesSearch = 
      req.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por tab
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') return matchesSearch && req.status === 'PENDING'
    if (activeTab === 'processing') return matchesSearch && req.status === 'PROCESSING'
    if (activeTab === 'completed') return matchesSearch && req.status === 'COMPLETED'
    if (activeTab === 'failed') return matchesSearch && (req.status === 'FAILED' || req.status === 'CANCELLED')

    return matchesSearch
  })

  // Ações
  const handleReprocess = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/admin/medical-record-requests/${id}/reprocess`, {
        method: 'POST'
      })
      if (response.ok) {
        toast.success('Reprocessamento iniciado!')
        loadRequests()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao reprocessar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/admin/medical-record-requests/${id}/cancel`, {
        method: 'POST'
      })
      if (response.ok) {
        toast.success('Solicitação cancelada')
        loadRequests()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao cancelar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendLink = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/admin/medical-record-requests/${id}/resend`, {
        method: 'POST'
      })
      if (response.ok) {
        toast.success('Link reenviado para o paciente!')
        loadRequests()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao reenviar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = async (id: string) => {
    window.open(`/api/admin/medical-record-requests/${id}/download`, '_blank')
  }

  // Renderizar status badge
  const renderStatusBadge = (status: ExportRequest['status']) => {
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`${config.color} border gap-1`}>
              <Icon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Formatação de tamanho de arquivo
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Solicitações de Cópia de Prontuário
          </h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de pacientes para cópia do prontuário médico
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            {showHelp ? 'Ocultar Ajuda' : 'Mostrar Ajuda'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Guia de ajuda */}
      {showHelp && <HelpGuide />}

      {/* Checklist de ações rápidas - sempre visível */}
      <QuickActionsChecklist requests={requests} />

      {/* Cards de estatísticas */}
      <StatsCards requests={requests} />

      {/* Filtros e busca */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nome, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs e tabela */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            Todos ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Aguardando ({requests.filter(r => r.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processando ({requests.filter(r => r.status === 'PROCESSING').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídos ({requests.filter(r => r.status === 'COMPLETED').length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Com Erro ({requests.filter(r => r.status === 'FAILED' || r.status === 'CANCELLED').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Nenhuma solicitação encontrada com esse termo'
                      : 'Nenhuma solicitação nesta categoria'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{request.patientName}</p>
                              <p className="text-sm text-muted-foreground">{request.patientEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          {request.status === 'PROCESSING' ? (
                            <div className="w-32">
                              <Progress value={request.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {request.progress}%
                              </p>
                            </div>
                          ) : request.status === 'COMPLETED' ? (
                            <span className="text-green-600">100%</span>
                          ) : request.status === 'FAILED' ? (
                            <span className="text-red-600">Erro</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(request.requestedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: ptBR })}
                          </p>
                        </TableCell>
                        <TableCell>
                          {formatFileSize(request.fileSize)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver detalhes */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedRequest(request)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalhes</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Ações específicas por status */}
                            {request.status === 'COMPLETED' && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDownload(request.id)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Baixar PDF</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={actionLoading === request.id}
                                        onClick={() => handleResendLink(request.id)}
                                      >
                                        {actionLoading === request.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reenviar link ao paciente</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}

                            {request.status === 'FAILED' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={actionLoading === request.id}
                                      onClick={() => handleReprocess(request.id)}
                                    >
                                      {actionLoading === request.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reprocessar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {(request.status === 'PENDING' || request.status === 'PROCESSING') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={actionLoading === request.id}
                                      onClick={() => handleCancel(request.id)}
                                    >
                                      {actionLoading === request.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancelar solicitação</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Solicitação
            </DialogTitle>
            <DialogDescription>
              ID: {selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Dados do paciente */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Paciente
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedRequest.patientName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedRequest.patientEmail}</p>
                  </div>
                </div>
              </div>

              {/* Status e progresso */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Status
                </h4>
                <div className="flex items-center gap-4">
                  {renderStatusBadge(selectedRequest.status)}
                  {selectedRequest.status === 'PROCESSING' && (
                    <div className="flex-1">
                      <Progress value={selectedRequest.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedRequest.progress}% concluído
                      </p>
                    </div>
                  )}
                </div>

                {selectedRequest.status === 'FAILED' && selectedRequest.errorMessage && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{selectedRequest.errorMessage}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Timeline de logs */}
              {selectedRequest.logs && selectedRequest.logs.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Histórico de Processamento
                  </h4>
                  <div className="space-y-3">
                    {selectedRequest.logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="flex-1">
                          <p className="font-medium">{log.message || log.step}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                        {log.percentage && (
                          <Badge variant="outline">{log.percentage}%</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações do arquivo */}
              {selectedRequest.status === 'COMPLETED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-4 w-4" /> Documento Gerado
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Arquivo:</span>
                      <p className="font-medium text-green-900">{selectedRequest.filename}</p>
                    </div>
                    <div>
                      <span className="text-green-700">Tamanho:</span>
                      <p className="font-medium text-green-900">{formatFileSize(selectedRequest.fileSize)}</p>
                    </div>
                    {selectedRequest.expiresAt && (
                      <div className="col-span-2">
                        <span className="text-green-700">Expira em:</span>
                        <p className="font-medium text-green-900">
                          {format(new Date(selectedRequest.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Solicitado em:</span>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.requestedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {selectedRequest.completedAt && (
                  <div>
                    <span className="text-muted-foreground">Concluído em:</span>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedRequest?.status === 'COMPLETED' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleResendLink(selectedRequest.id)}
                  disabled={actionLoading === selectedRequest.id}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Reenviar Link
                </Button>
                <Button onClick={() => handleDownload(selectedRequest.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </>
            )}
            {selectedRequest?.status === 'FAILED' && (
              <Button
                onClick={() => handleReprocess(selectedRequest.id)}
                disabled={actionLoading === selectedRequest.id}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reprocessar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
