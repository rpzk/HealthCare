'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { ActionBar } from '@/components/navigation/action-bar'
import { ConfirmationDialog } from '@/components/dialogs/confirmation-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAutoPrint } from '@/hooks/use-auto-print'
import { 
  TestTube, 
  User, 
  Stethoscope, 
  Calendar, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Loader2,
  Printer,
  Share2,
  FileCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ExamRequestDetail {
  id: string
  patient: { id: string; name: string }
  doctor: { id: string; name: string; speciality?: string }
  examType: string
  description?: string | null
  urgency: string
  status: string
  notes?: string | null
  results?: string | null
  requestDate: string | Date
  scheduledDate?: string | Date | null
  completedDate?: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

export default function ExamRequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ExamRequestDetail | null>(null)
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  
  const [password, setPassword] = useState('')
  const [resultText, setResultText] = useState('')
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [signatureValid, setSignatureValid] = useState(false)
  const [signatureReason, setSignatureReason] = useState<string | null>(null)
  const [requireSignBeforePrint, setRequireSignBeforePrint] = useState(false)

  // Auto-print when ?print=1 is in URL
  const canPrintNow = !loading && !!data && (isSigned || !requireSignBeforePrint)
  useAutoPrint({
    isReady: !loading && !!data,
    canPrint: canPrintNow
  })

  const fetchExamRequest = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exam-requests/${id}`)
      if (!res.ok) throw new Error('Falha ao carregar solicitação de exame')
      const json = await res.json()
      setData(json)
      setResultText(json.results || '')
      
      // Fetch signature metadata
      const sigRes = await fetch(`/api/exam-requests/${id}/signature`)
      if (sigRes.ok) {
        const s = await sigRes.json()
        if (s?.signed) {
          setIsSigned(true)
          setSignatureValid(!!s?.valid)
          setSignatureReason(s?.reason ?? null)
          if (s?.verificationUrl) setVerificationUrl(s.verificationUrl)
        } else {
          setIsSigned(false)
          setSignatureValid(false)
          setSignatureReason(null)
        }
      }

      // Load signature policy
      const policyRes = await fetch('/api/system/signature-policy')
      if (policyRes.ok) {
        const p = await policyRes.json()
        const flag = !!p?.policy?.requireSignature?.examRequest
        setRequireSignBeforePrint(flag)
      }
    } catch (e) {
      setError((e as Error).message)
      toast({ 
        title: 'Erro ao carregar', 
        description: (e as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void fetchExamRequest()
  }, [fetchExamRequest])

  const handleSign = async () => {
    if (!password) return
    setSigning(true)
    try {
      const res = await fetch(`/api/exam-requests/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao assinar')
      }

      const result = await res.json()
      if (result?.verificationUrl) setVerificationUrl(result.verificationUrl)
      setIsSigned(true)
      setSignatureValid(true)
      setSignatureReason(null)
      setShowPasswordDialog(false)
      setPassword('')
      
      toast({ 
        title: 'Solicitação assinada!', 
        description: 'Registro de assinatura criado. Use “Verificar” para checar janela/estado do certificado.' 
      })
    } catch (e) {
      toast({ 
        title: 'Erro ao assinar', 
        description: (e as Error).message,
        variant: 'destructive'
      })
    } finally {
      setSigning(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/exam-requests/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar solicitação')
      
      toast({ 
        title: 'Solicitação deletada!', 
        description: 'A solicitação de exame foi removida com sucesso' 
      })
      router.push('/exams')
    } catch (e) {
      toast({ 
        title: 'Erro ao deletar', 
        description: (e as Error).message,
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/exam-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      
      if (!res.ok) throw new Error('Erro ao cancelar solicitação')
      
      const updated = await res.json()
      setData(updated)
      setShowCancelDialog(false)
      
      toast({ 
        title: 'Solicitação cancelada', 
        description: 'O status foi atualizado para cancelado' 
      })
    } catch (e) {
      toast({ 
        title: 'Erro ao cancelar', 
        description: (e as Error).message,
        variant: 'destructive'
      })
    }
  }

  const handleUpdateResult = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/exam-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          results: resultText,
          status: 'COMPLETED',
          completedDate: new Date().toISOString()
        })
      })
      
      if (!res.ok) throw new Error('Erro ao atualizar resultado')
      
      const updated = await res.json()
      setData(updated)
      setShowResultDialog(false)
      
      toast({ 
        title: 'Resultado atualizado!', 
        description: 'O resultado do exame foi salvo com sucesso' 
      })
    } catch (e) {
      toast({ 
        title: 'Erro ao atualizar', 
        description: (e as Error).message,
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handlePrint = () => {
    if (!isSigned && requireSignBeforePrint) {
      toast({
        title: 'Assinatura necessária',
        description: 'Esta solicitação deve ser assinada antes de imprimir',
        variant: 'destructive'
      })
      return
    }
    window.print()
  }

  const handleShare = () => {
    if (!isSigned && requireSignBeforePrint) {
      toast({
        title: 'Assinatura necessária',
        description: 'Esta solicitação deve ser assinada antes de compartilhar',
        variant: 'destructive'
      })
      return
    }
    
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    if ((navigator as any)?.share) {
      (navigator as any).share({ title: 'Solicitação de Exame', url: shareUrl }).catch(() => {})
    } else {
      try { 
        navigator.clipboard.writeText(shareUrl)
        toast({ 
          title: 'Link copiado!', 
          description: 'O link foi copiado para a área de transferência' 
        })
      } catch {
        toast({ title: 'Erro ao copiar link', variant: 'destructive' })
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'REQUESTED': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      'SCHEDULED': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'IN_PROGRESS': 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      'COMPLETED': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      'CANCELLED': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
  }

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      'ROUTINE': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      'URGENT': 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      'EMERGENCY': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
    }
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'REQUESTED': <Clock className="h-4 w-4" />,
      'SCHEDULED': <Calendar className="h-4 w-4" />,
      'IN_PROGRESS': <TestTube className="h-4 w-4" />,
      'COMPLETED': <CheckCircle className="h-4 w-4" />,
      'CANCELLED': <XCircle className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'REQUESTED': 'Solicitado',
      'SCHEDULED': 'Agendado',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Concluído',
      'CANCELLED': 'Cancelado'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels = {
      'ROUTINE': 'Rotina',
      'URGENT': 'Urgente',
      'EMERGENCY': 'Emergência'
    }
    return labels[urgency as keyof typeof labels] || urgency
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-20">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-1/3"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-20">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="max-w-7xl mx-auto">
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
                  <p className="text-muted-foreground mb-4">{error || 'Solicitação não encontrada'}</p>
                  <Button onClick={() => router.push('/exams')}>
                    Voltar para Exames
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-20">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
              title={`Solicitação de Exame #${id}`}
              description="Detalhes e gerenciamento da solicitação de exame"
              breadcrumbs={[
                { label: 'Dashboard', href: '/' },
                { label: 'Exames', href: '/exams' },
                { label: `#${id}`, href: `/exams/requests/${id}` }
              ]}
            />

            <ActionBar
              title={`Exame #${id}`}
              backUrl="/exams"
              canEdit={data.status !== 'CANCELLED' && data.status !== 'COMPLETED'}
              onEdit={() => router.push(`/exams/requests/${id}/edit`)}
              canDelete={data.status === 'REQUESTED' || data.status === 'CANCELLED'}
              onDelete={() => setShowDeleteDialog(true)}
              canSign={!isSigned && (data.status === 'REQUESTED' || data.status === 'SCHEDULED')}
              onSign={() => setShowPasswordDialog(true)}
              canCancel={data.status !== 'COMPLETED' && data.status !== 'CANCELLED'}
              onCancel={() => setShowCancelDialog(true)}
              additionalActions={[
                {
                  label: 'Atualizar Resultado',
                  icon: <FileCheck className="h-4 w-4" />,
                  onClick: () => setShowResultDialog(true),
                },
                {
                  label: 'Imprimir',
                  icon: <Printer className="h-4 w-4" />,
                  onClick: handlePrint,
                },
                {
                  label: 'Compartilhar',
                  icon: <Share2 className="h-4 w-4" />,
                  onClick: handleShare,
                }
              ]}
            />

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={getStatusColor(data.status)}>
                    {getStatusIcon(data.status)}
                    <span className="ml-1">{getStatusLabel(data.status)}</span>
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Urgência</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={getUrgencyColor(data.urgency)}>
                    {data.urgency === 'EMERGENCY' && <AlertTriangle className="h-4 w-4 mr-1" />}
                    {getUrgencyLabel(data.urgency)}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assinatura</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant="outline"
                    className={
                      signatureValid
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200'
                        : isSigned
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                    }
                  >
                    {signatureValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span className="ml-1">
                      {signatureValid ? 'Validada' : isSigned ? 'Registrada' : 'Não Assinada'}
                    </span>
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Data da Solicitação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(data.requestDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Messages */}
            {signatureValid && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-300">
                        Assinatura registrada (certificado configurado)
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Use “Verificar” para checagem de metadados
                      </p>
                    </div>
                    {verificationUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(verificationUrl!, '_blank')}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Verificar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isSigned && !signatureValid && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                        Assinatura registrada (não validada)
                      </p>
                      {signatureReason && (
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                          Motivo: {signatureReason}
                        </p>
                      )}
                    </div>
                    {verificationUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(verificationUrl!, '_blank')}
                        className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Verificar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isSigned && requireSignBeforePrint && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-300">
                      Este documento requer assinatura registrada no sistema antes de imprimir ou compartilhar
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Exam Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Informações do Exame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tipo de Exame</Label>
                      <p className="text-base font-semibold mt-1">{data.examType}</p>
                    </div>

                    {data.description && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{data.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {data.scheduledDate && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Data Agendada</Label>
                          <p className="text-sm mt-1">
                            {format(new Date(data.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {data.completedDate && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Data de Conclusão</Label>
                          <p className="text-sm mt-1">
                            {format(new Date(data.completedDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Results */}
                {data.results && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Resultado do Exame
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{data.results}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {data.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-4">
                {/* Patient Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="font-medium">{data.patient.name}</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={() => router.push(`/patients/${data.patient.id}`)}
                      >
                        Ver perfil completo →
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Doctor Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Médico Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="font-medium">{data.doctor.name}</p>
                      {data.doctor.speciality && (
                        <p className="text-sm text-muted-foreground">{data.doctor.speciality}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Histórico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Criado em</p>
                      <p className="font-medium">
                        {format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última atualização</p>
                      <p className="font-medium">
                        {format(new Date(data.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinar Solicitação Digitalmente</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado digital A1 para assinar esta solicitação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="cert-password">Senha do Certificado</Label>
              <Input
                id="cert-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                disabled={signing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !signing) handleSign()
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowPasswordDialog(false); setPassword('') }}
                disabled={signing}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSign}
                disabled={!password || signing}
              >
                {signing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assinando...</>) : 'Assinar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Update Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Resultado do Exame</DialogTitle>
            <DialogDescription>
              Insira o resultado do exame. Isso marcará automaticamente o exame como concluído.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="result-text">Resultado</Label>
              <Textarea
                id="result-text"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Descreva o resultado do exame..."
                rows={6}
                disabled={updating}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowResultDialog(false); setResultText(data?.results || '') }}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateResult}
                disabled={!resultText.trim() || updating}
              >
                {updating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : 'Salvar Resultado'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deletar solicitação?"
        description="Esta ação não pode ser desfeita. A solicitação de exame será permanentemente removida do sistema."
        confirmText="Deletar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={handleDelete}
        isLoading={deleting}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancelar solicitação?"
        description="O status da solicitação será alterado para Cancelada. Esta ação pode ser revertida posteriormente."
        confirmText="Sim, cancelar"
        cancelText="Não"
        type="warning"
        onConfirm={handleCancel}
      />
    </div>
  )
}
