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
import { useToast } from '@/hooks/use-toast'
import { 
  Pill, 
  User, 
  Stethoscope, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Loader2,
  Printer,
  Share2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface PrescriptionDetail {
  id: string
  patient: { id: string; name: string }
  doctor: { id: string; name: string; speciality?: string }
  medications: Medication[]
  notes?: string
  status: string
  digitalSignature?: string | null
  startDate: string | Date
  endDate?: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast, success, error: showError } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PrescriptionDetail | null>(null)
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  
  const [password, setPassword] = useState('')
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [requireSignBeforePrint, setRequireSignBeforePrint] = useState(false)

  const fetchPrescription = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/prescriptions/${id}`)
      if (!res.ok) throw new Error('Falha ao carregar prescrição')
      const json = await res.json()
      setData(json)
      setIsSigned(!!json?.digitalSignature)
      
      // Fetch signature metadata
      const sigRes = await fetch(`/api/prescriptions/${id}/signature`)
      if (sigRes.ok) {
        const s = await sigRes.json()
        if (s?.signed) {
          setIsSigned(true)
          if (s?.verificationUrl) setVerificationUrl(s.verificationUrl)
        }
      }

      // Load signature policy
      const policyRes = await fetch('/api/system/signature-policy')
      if (policyRes.ok) {
        const p = await policyRes.json()
        const flag = !!p?.policy?.requireSignature?.prescription
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
    void fetchPrescription()
  }, [fetchPrescription])

  const handleSign = async () => {
    if (!password) return
    setSigning(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao assinar')
      }

      const result = await res.json()
      setData(prev => prev ? ({ ...prev, digitalSignature: result.signature }) : null)
      setIsSigned(true)
      if (result?.verificationUrl) setVerificationUrl(result.verificationUrl)
      setShowPasswordDialog(false)
      setPassword('')
      
      success('Prescrição assinada!', 'A assinatura digital foi aplicada com sucesso')
    } catch (e) {
      showError('Erro ao assinar', (e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar prescrição')
      
      success('Prescrição deletada!', 'A prescrição foi removida com sucesso')
      router.push('/prescriptions')
    } catch (e) {
      showError('Erro ao deletar', (e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      
      if (!res.ok) throw new Error('Erro ao cancelar prescrição')
      
      const updated = await res.json()
      setData(updated)
      setShowCancelDialog(false)
      
      success('Prescrição cancelada', 'O status foi atualizado para cancelado')
    } catch (e) {
      showError('Erro ao cancelar', (e as Error).message)
    }
  }

  const handlePrint = () => {
    if (!isSigned && requireSignBeforePrint) {
      showError('Assinatura necessária', 'Esta prescrição deve ser assinada antes de imprimir')
      return
    }
    window.print()
  }

  const handleShare = () => {
    if (!isSigned && requireSignBeforePrint) {
      showError('Assinatura necessária', 'Esta prescrição deve ser assinada antes de compartilhar')
      return
    }
    
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    if ((navigator as any)?.share) {
      (navigator as any).share({ title: 'Prescrição', url: shareUrl }).catch(() => {})
    } else {
      try { 
        navigator.clipboard.writeText(shareUrl)
        success('Link copiado!', 'O link foi copiado para a área de transferência')
      } catch {
        showError('Erro ao copiar link')
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      'COMPLETED': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'CANCELLED': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
      'EXPIRED': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'ACTIVE': <Clock className="h-4 w-4" />,
      'COMPLETED': <CheckCircle className="h-4 w-4" />,
      'CANCELLED': <XCircle className="h-4 w-4" />,
      'EXPIRED': <AlertCircle className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'ACTIVE': 'Ativa',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'EXPIRED': 'Expirada'
    }
    return labels[status as keyof typeof labels] || status
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
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
                  <p className="text-muted-foreground mb-4">{error || 'Prescrição não encontrada'}</p>
                  <Button onClick={() => router.push('/prescriptions')}>
                    Voltar para Prescrições
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
              title={`Prescrição #${id}`}
              description="Detalhes e gerenciamento da prescrição médica"
              breadcrumbs={[
                { label: 'Dashboard', href: '/' },
                { label: 'Prescrições', href: '/prescriptions' },
                { label: `#${id}`, href: `/prescriptions/${id}` }
              ]}
            />

            <ActionBar
              title={`Prescrição #${id}`}
              backUrl="/prescriptions"
              canEdit={data.status !== 'CANCELLED'}
              onEdit={() => router.push(`/prescriptions/${id}/edit`)}
              canDelete={data.status === 'ACTIVE' || data.status === 'EXPIRED'}
              onDelete={() => setShowDeleteDialog(true)}
              canSign={!isSigned && data.status === 'ACTIVE'}
              onSign={() => setShowPasswordDialog(true)}
              canCancel={data.status === 'ACTIVE'}
              onCancel={() => setShowCancelDialog(true)}
              additionalActions={[
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={`${getStatusColor(data.status)}`}>
                    {getStatusIcon(data.status)}
                    <span className="ml-1">{getStatusLabel(data.status)}</span>
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assinatura Digital</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={isSigned ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                    {isSigned ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span className="ml-1">{isSigned ? 'Assinada' : 'Não Assinada'}</span>
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(data.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                      {data.endDate && ` - ${format(new Date(data.endDate), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Messages */}
            {isSigned && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-300">
                        Documento assinado digitalmente
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Esta prescrição possui validade jurídica
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

            {!isSigned && requireSignBeforePrint && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-300">
                      Este documento deve ser assinado digitalmente antes de imprimir ou compartilhar
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Medications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Medicamentos Prescritos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.medications.map((med, i) => (
                      <div key={i} className="border-l-4 border-green-500 pl-4 py-2">
                        <h4 className="font-semibold text-lg">{med.name}</h4>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p><strong>Dosagem:</strong> {med.dosage}</p>
                          <p><strong>Frequência:</strong> {med.frequency}</p>
                          <p><strong>Duração:</strong> {med.duration}</p>
                          {med.instructions && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <p className="text-blue-900 dark:text-blue-300">
                                <strong>Instruções:</strong> {med.instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

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
                      Médico Responsável
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
            <DialogTitle>Assinar Prescrição Digitalmente</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado digital A1 para assinar esta prescrição
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deletar prescrição?"
        description="Esta ação não pode ser desfeita. A prescrição será permanentemente removida do sistema."
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
        title="Cancelar prescrição?"
        description="O status da prescrição será alterado para Cancelada. Esta ação pode ser revertida posteriormente."
        confirmText="Sim, cancelar"
        cancelText="Não"
        type="warning"
        onConfirm={handleCancel}
      />
    </div>
  )
}
