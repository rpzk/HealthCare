'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Activity,
  Loader2,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AccessLog {
  id: string
  data: string
  acao: string
  tipoRecurso: string
  acessadoPor: {
    nome: string
    funcao: string
    especialidade?: string | null
  }
  ip: string
}

interface DeletionRequest {
  id: string
  status: string
  reason: string
  createdAt: string
  processedAt?: string | null
  processorNotes?: string | null
}

interface AccessHistoryResponse {
  acessos: AccessLog[]
  paginacao: {
    pagina: number
    total: number
    totalPaginas: number
  }
  estatisticas: {
    ultimos30Dias: {
      totalAcessos: number
      profissionaisUnicos: number
    }
  }
}

interface DeletionResponse {
  requests: DeletionRequest[]
  retentionInfo: {
    medicalRecords: { count: number; retention: string }
    prescriptions: { count: number; retention: string }
    certificates: { count: number; retention: string }
  }
}

export default function PrivacidadePage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('exportar')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [accessStats, setAccessStats] = useState({ totalAcessos: 0, profissionaisUnicos: 0 })
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([])
  const [retentionInfo, setRetentionInfo] = useState<DeletionResponse['retentionInfo'] | null>(null)
  
  // Dialogs
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false, title: '', message: ''
  })
  
  // Form states
  const [deleteForm, setDeleteForm] = useState({
    reason: '',
    confirmEmail: '',
    confirmUnderstanding: false
  })
  const [deleteError, setDeleteError] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Fetch access history
  const fetchAccessHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me/access-history')
      if (res.ok) {
        const data: AccessHistoryResponse = await res.json()
        setAccessLogs(data.acessos || [])
        setAccessStats(data.estatisticas?.ultimos30Dias || { totalAcessos: 0, profissionaisUnicos: 0 })
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch deletion requests
  const fetchDeletionRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me/deletion-request')
      if (res.ok) {
        const data: DeletionResponse = await res.json()
        setDeletionRequests(data.requests || [])
        setRetentionInfo(data.retentionInfo)
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'acessos') {
      fetchAccessHistory()
    } else if (activeTab === 'excluir') {
      fetchDeletionRequests()
    }
  }, [activeTab])

  // Export data
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/me/export')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meus_dados_lgpd_${format(new Date(), 'yyyy-MM-dd')}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setExportDialogOpen(false)
        setSuccessDialog({
          open: true,
          title: 'Exportação Concluída',
          message: 'Seus dados foram exportados com sucesso. Verifique a pasta de downloads do seu navegador.'
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao exportar dados')
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

  // Request deletion
  const handleDeleteRequest = async () => {
    setDeleteError('')
    
    if (!deleteForm.reason || deleteForm.reason.length < 10) {
      setDeleteError('Por favor, informe o motivo (mínimo 10 caracteres)')
      return
    }
    if (!deleteForm.confirmEmail) {
      setDeleteError('Por favor, confirme seu email')
      return
    }
    if (!deleteForm.confirmUnderstanding) {
      setDeleteError('Você precisa confirmar que entendeu as consequências')
      return
    }

    setDeleteSubmitting(true)
    try {
      const res = await fetch('/api/me/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteForm)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setDeleteDialogOpen(false)
        setDeleteForm({ reason: '', confirmEmail: '', confirmUnderstanding: false })
        setSuccessDialog({
          open: true,
          title: 'Solicitação Enviada',
          message: 'Sua solicitação de exclusão foi registrada e será analisada pelo nosso Encarregado de Proteção de Dados (DPO). Prazo máximo de resposta: 15 dias.'
        })
        fetchDeletionRequests()
      } else {
        setDeleteError(data.error || 'Erro ao enviar solicitação')
      }
    } catch (error) {
      console.error('Erro ao solicitar exclusão:', error)
      setDeleteError('Erro ao processar solicitação')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Activity className="w-3 h-3 mr-1" /> Em Análise</Badge>
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>
      case 'REJECTED':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Negado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const hasPendingRequest = deletionRequests.some(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/minha-saude">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Privacidade e Dados
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus dados conforme a LGPD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Seus Direitos (LGPD - Art. 18)</AlertTitle>
          <AlertDescription>
            Você tem direito a acessar, corrigir, exportar e solicitar a exclusão dos seus dados pessoais. 
            Alguns dados médicos possuem período de retenção obrigatório por lei.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="exportar" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="acessos" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Acessos
            </TabsTrigger>
            <TabsTrigger value="excluir" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir
            </TabsTrigger>
          </TabsList>

          {/* Tab: Exportar */}
          <TabsContent value="exportar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Portabilidade de Dados
                </CardTitle>
                <CardDescription>
                  Baixe uma cópia de todos os seus dados pessoais e médicos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">O que está incluído:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Dados pessoais (nome, CPF, endereço, contatos)</li>
                    <li>• Histórico de consultas e atendimentos</li>
                    <li>• Prescrições médicas</li>
                    <li>• Resultados de exames</li>
                    <li>• Prontuários e registros médicos</li>
                    <li>• Atestados e encaminhamentos</li>
                    <li>• Sinais vitais registrados</li>
                    <li>• Consentimentos fornecidos</li>
                  </ul>
                </div>
                
                <Alert variant="default">
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Os dados são exportados em formato JSON, que pode ser aberto em qualquer editor de texto 
                    ou importado em outros sistemas de saúde.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => setExportDialogOpen(true)} 
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Meus Dados
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Acessos */}
          <TabsContent value="acessos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  Quem Acessou Seus Dados
                </CardTitle>
                <CardDescription>
                  Veja o histórico de profissionais que acessaram suas informações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{accessStats.totalAcessos}</div>
                    <div className="text-sm text-muted-foreground">Acessos (30 dias)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{accessStats.profissionaisUnicos}</div>
                    <div className="text-sm text-muted-foreground">Profissionais</div>
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : accessLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Recurso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.data), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">{log.acessadoPor.nome}</div>
                                <div className="text-xs text-muted-foreground">{log.acessadoPor.funcao}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{log.acao}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.tipoRecurso}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum acesso registrado recentemente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Excluir */}
          <TabsContent value="excluir" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Exclusão de Dados
                </CardTitle>
                <CardDescription>
                  Solicite a exclusão dos seus dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Retention Warning */}
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Retenção Legal Obrigatória</AlertTitle>
                  <AlertDescription>
                    Prontuários médicos devem ser mantidos por 20 anos (CFM nº 1.821/2007). 
                    Receitas e prescrições por 5 anos (ANVISA). Esses dados serão anonimizados, não excluídos.
                  </AlertDescription>
                </Alert>

                {/* Retention Info */}
                {retentionInfo && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium">Seus registros:</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                        <div className="font-bold">{retentionInfo.medicalRecords.count}</div>
                        <div className="text-xs text-muted-foreground">Prontuários</div>
                        <div className="text-xs text-orange-600">{retentionInfo.medicalRecords.retention}</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                        <div className="font-bold">{retentionInfo.prescriptions.count}</div>
                        <div className="text-xs text-muted-foreground">Receitas</div>
                        <div className="text-xs text-orange-600">{retentionInfo.prescriptions.retention}</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                        <div className="font-bold">{retentionInfo.certificates.count}</div>
                        <div className="text-xs text-muted-foreground">Atestados</div>
                        <div className="text-xs text-orange-600">{retentionInfo.certificates.retention}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Requests */}
                {deletionRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Suas solicitações:</h4>
                    {deletionRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(req.status)}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(req.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          {req.processorNotes && (
                            <p className="text-sm text-muted-foreground mt-1">{req.processorNotes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Request Button */}
                <Button 
                  onClick={() => setDeleteDialogOpen(true)} 
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  disabled={hasPendingRequest}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {hasPendingRequest ? 'Solicitação em Andamento' : 'Solicitar Exclusão de Dados'}
                </Button>

                {hasPendingRequest && (
                  <p className="text-sm text-center text-muted-foreground">
                    Você já possui uma solicitação em análise. Aguarde o processamento.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Links */}
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Política de Privacidade
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/terms" className="text-blue-600 hover:underline">
            Termos de Uso
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/settings/privacy" className="text-blue-600 hover:underline">
            Configurações de Privacidade
          </Link>
        </div>
      </div>

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Seus Dados</DialogTitle>
            <DialogDescription>
              Você está prestes a baixar uma cópia completa dos seus dados pessoais e médicos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                O arquivo conterá informações sensíveis. Mantenha-o em local seguro e não compartilhe com terceiros.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Confirmar Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Solicitar Exclusão de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação enviará uma solicitação para nosso DPO. Dados com retenção legal serão anonimizados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da solicitação *</Label>
              <Textarea
                id="reason"
                placeholder="Explique por que deseja excluir seus dados..."
                value={deleteForm.reason}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Confirme seu email *</Label>
              <Input
                id="confirmEmail"
                type="email"
                placeholder={session?.user?.email || 'seu@email.com'}
                value={deleteForm.confirmEmail}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, confirmEmail: e.target.value }))}
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirmUnderstanding"
                checked={deleteForm.confirmUnderstanding}
                onCheckedChange={(checked) => 
                  setDeleteForm(prev => ({ ...prev, confirmUnderstanding: checked === true }))
                }
              />
              <Label htmlFor="confirmUnderstanding" className="text-sm leading-tight">
                Entendo que dados médicos com retenção legal obrigatória serão anonimizados, 
                não excluídos, e que esta ação pode levar até 15 dias para ser processada.
              </Label>
            </div>

            {deleteError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRequest}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              {successDialog.title}
            </DialogTitle>
          </DialogHeader>
          <p className="py-4">{successDialog.message}</p>
          <DialogFooter>
            <Button onClick={() => setSuccessDialog(prev => ({ ...prev, open: false }))}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
