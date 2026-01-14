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
  Share2,
  Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import QRCode from 'qrcode'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface PrescriptionDetail {
  id: string
  patient: { id: string; name: string; email?: string }
  doctor: { id: string; name: string; speciality?: string }
  medications: Medication[]
  notes?: string
  status: string
  digitalSignature?: {
    valid: boolean
    signatureAlgorithm: string
    signedAt: string
  } | string | null
  verificationUrl?: string | null
  startDate: string | Date
  endDate?: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast, success, error: showError } = useToast()
  
  // Set print styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page { 
          size: A4; 
          margin: 2cm 2.5cm; 
        }
        
        * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        
        body {
          margin: 0;
          padding: 0;
          background: white !important;
          color: #000 !important;
          font-family: 'Times New Roman', serif !important;
        }
        
        /* Hide all UI elements */
        header, nav, aside, footer,
        [class*="sidebar"], 
        .no-print,
        button,
        [class*="ActionBar"],
        [class*="PageHeader"],
        [class*="Badge"],
        [class*="Card"]:not(.print-prescription) {
          display: none !important;
        }

        /* Reset main to full width */
        .ml-64, main {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: none !important;
        }
        
        /* Show only print prescription card */
        .print-prescription {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          border: none !important;
          box-shadow: none !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-prescription * {
          visibility: visible !important;
        }
        
        /* Simple professional prescription */
        .print-prescription {
          font-size: 11pt;
          line-height: 1.6;
          color: #000;
        }

        .print-prescription p {
          margin: 0;
          padding: 0;
        }

        .rx-header {
          margin-bottom: 1cm;
        }

        .rx-header p {
          margin: 2pt 0;
        }

        .rx-date {
          margin: 0.5cm 0 0.8cm 0;
        }

        .rx-patient {
          margin-bottom: 1cm;
        }

        .rx-medications {
          margin: 1cm 0 3cm 0;
        }

        .rx-medications > div {
          margin-bottom: 0.8cm;
        }

        .rx-signature {
          margin-top: 4cm;
          text-align: center;
        }

        .rx-signature-line {
          width: 6cm;
          border-top: 1px solid #000;
          margin: 0 auto;
          padding-top: 4pt;
        }

        .rx-qr {
          position: absolute;
          bottom: 0.8cm;
          right: 1cm;
        }

        .rx-qr img {
          width: 1cm;
          height: 1cm;
          opacity: 0.3;
        }

        .rx-footer {
          position: absolute;
          bottom: 0.3cm;
          left: 1cm;
          right: 1cm;
          font-size: 5pt;
          color: #e0e0e0;
          text-align: center;
        }

        /* Hide screen-only cards */
        .screen-only {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])
  
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PrescriptionDetail | null>(null)
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  
  const [password, setPassword] = useState('')
  const [sendEmail, setSendEmail] = useState('')
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'sms'>('email')
  const [sending, setSending] = useState(false)
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [requireSignBeforePrint, setRequireSignBeforePrint] = useState(false)

  const fetchPrescription = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/prescriptions/${id}`)
      if (!res.ok) throw new Error('Falha ao carregar prescrição')
      const json = await res.json() as PrescriptionDetail

      // Normalize verification URL to absolute
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const fullUrl = json.verificationUrl
        ? (json.verificationUrl.startsWith('http') ? json.verificationUrl : `${baseUrl}${json.verificationUrl}`)
        : null

      setData({ ...json, verificationUrl: fullUrl })
      setIsSigned(!!json?.digitalSignature)
      if (fullUrl) setVerificationUrl(fullUrl)

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

  // Generate QR Code when verificationUrl is available
  useEffect(() => {
    if (verificationUrl) {
      console.log('Generating QR Code for URL:', verificationUrl)
      QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => {
          console.log('QR Code generated successfully')
          setQrCodeDataUrl(url)
        })
        .catch(err => console.error('QR Code generation failed:', err))
    } else {
      console.log('No verificationUrl available for QR Code')
    }
  }, [verificationUrl])

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
    
    // Set document title for PDF filename
    if (data) {
      const date = format(new Date(data.createdAt), 'dd-MM-yyyy', { locale: ptBR })
      const patientName = data.patient.name.replace(/[^a-zA-Z0-9]/g, '_')
      document.title = `Receita_${patientName}_${date}`
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

  const handleSend = async () => {
    if (!sendEmail) {
      showError('Email obrigatório', 'Digite o email do destinatário')
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail, method: sendMethod })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao enviar prescrição')
      }

      success('Prescrição enviada!', `Prescrição enviada para ${sendEmail}`)
      setShowSendDialog(false)
      setSendEmail('')
    } catch (e) {
      showError('Erro ao enviar', (e as Error).message)
    } finally {
      setSending(false)
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
      <div className="prescription-print-root min-h-screen bg-background transition-colors duration-300">
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
      <div className="prescription-print-root min-h-screen bg-background transition-colors duration-300">
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
    <div className="prescription-print-root min-h-screen bg-background transition-colors duration-300">
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
                  label: 'Enviar',
                  icon: <Mail className="h-4 w-4" />,
                  onClick: () => setShowSendDialog(true),
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 screen-only">
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
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 screen-only">
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
              <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 screen-only">
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
              {/* PRINT ONLY - Simple prescription */}
              <div className="hidden print:block print-prescription col-span-full" style={{ position: 'relative', minHeight: '25cm' }}>
                
                {/* Header */}
                <div className="rx-header">
                  <p style={{ fontSize: '11pt', fontWeight: 'bold' }}>{data.doctor.name}</p>
                  {data.doctor.speciality && <p style={{ fontSize: '10pt' }}>{data.doctor.speciality}</p>}
                </div>

                {/* Date */}
                <div className="rx-date">
                  <p>{format(new Date(data.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                </div>

                {/* Patient */}
                <div className="rx-patient">
                  <p>Paciente: <strong>{data.patient.name}</strong></p>
                </div>

                {/* Medications */}
                <div className="rx-medications">
                  {data.medications.map((med, i) => (
                    <div key={i}>
                      <p><strong>{i + 1}) {med.name}</strong> - {med.dosage}</p>
                      <p style={{ marginLeft: '1cm' }}>{med.frequency}</p>
                      {med.duration && <p style={{ marginLeft: '1cm' }}>Duração: {med.duration}</p>}
                      {med.instructions && <p style={{ marginLeft: '1cm', fontStyle: 'italic', fontSize: '10pt' }}>{med.instructions}</p>}
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {data.notes && (
                  <div style={{ margin: '1cm 0', fontSize: '10pt', fontStyle: 'italic' }}>
                    <p>{data.notes}</p>
                  </div>
                )}

                {/* Signature */}
                <div className="rx-signature">
                  <div className="rx-signature-line">
                    <p style={{ fontSize: '9pt' }}>{data.doctor.name}</p>
                    {data.doctor.speciality && <p style={{ fontSize: '8pt', color: '#666' }}>{data.doctor.speciality}</p>}
                  </div>
                </div>
                
                {/* QR Code */}
                {isSigned && qrCodeDataUrl && (
                  <div className="rx-qr">
                    <img src={qrCodeDataUrl} alt="" />
                  </div>
                )}
                
                {/* Footer */}
                {isSigned && (
                  <div className="rx-footer">
                    {data.id.substring(0, 8)} • {format(new Date(data.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                    {verificationUrl && <> • {typeof window !== 'undefined' ? window.location.origin : ''}{verificationUrl}</>}
                  </div>
                )}
              </div>

              {/* SCREEN-ONLY Content */}
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6 screen-only">
                {/* Print Header - Only visible when printing */}
                <div className="hidden print:block print-header mb-8">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold mb-2">RECEITA MÉDICA</h1>
                    <p className="text-sm text-gray-600">
                      Data de Emissão: {format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 border border-gray-300">
                    <div>
                      <p className="font-bold text-sm mb-1">PACIENTE:</p>
                      <p className="text-base">{data.patient.name}</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-1">MÉDICO RESPONSÁVEL:</p>
                      <p className="text-base">{data.doctor.name}</p>
                      {data.doctor.speciality && (
                        <p className="text-sm text-gray-600">{data.doctor.speciality}</p>
                      )}
                    </div>
                  </div>
                  <hr className="my-4 border-gray-400" />
                </div>
                
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
                      <div key={i} className="medication-item border-l-4 border-green-500 pl-4 py-2">
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
              <div className="space-y-4 screen-only">
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

            {/* Print-only Signature Section */}
            <div className="hidden print:block print-signature mt-12 pt-8 border-t-2 border-gray-800">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2 mt-16">
                    <p className="font-bold">{data.doctor.name}</p>
                    {data.doctor.speciality && (
                      <p className="text-sm text-gray-600">{data.doctor.speciality}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Assinatura do Médico</p>
                  </div>
                </div>
                <div className="text-center">
                  {isSigned && data.digitalSignature && typeof data.digitalSignature === 'object' ? (
                    <div>
                      <div className="border-2 border-green-600 p-4 rounded bg-green-50">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="font-bold text-green-800 text-sm mb-2">DOCUMENTO ASSINADO DIGITALMENTE</p>
                        <p className="text-xs text-green-700">
                          Assinado em {format(new Date(data.digitalSignature.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-green-700">
                          Algoritmo: {data.digitalSignature.signatureAlgorithm}
                        </p>
                        {verificationUrl && qrCodeDataUrl && (
                          <div className="mt-3 pt-3 border-t border-green-300">
                            <p className="text-xs font-bold text-green-800 mb-2">VERIFICAÇÃO DA ASSINATURA</p>
                            <img 
                              src={qrCodeDataUrl} 
                              alt="QR Code para verificação" 
                              className="mx-auto mb-2"
                              style={{ width: '120px', height: '120px' }}
                            />
                            <p className="text-xs text-green-700 font-mono break-all leading-tight">
                              {verificationUrl}
                            </p>
                            <p className="text-xs text-gray-600 mt-2 italic">
                              Escaneie o QR Code ou acesse o link acima para verificar a autenticidade
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t-2 border-gray-800 pt-2 mt-16">
                      <p className="text-sm text-gray-600">Carimbo e Assinatura</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
                <p>Este documento foi gerado eletronicamente pelo sistema HealthCare</p>
                <p>Data de emissão: {format(new Date(data.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                {isSigned && (
                  <>
                    <p className="font-bold text-green-700 mt-1">
                      ✓ Documento com validade jurídica - ICP-Brasil
                    </p>
                    {verificationUrl && (
                      <p className="text-xs text-gray-600 mt-2">
                        Para garantir a autenticidade deste documento, verifique a assinatura digital através do QR Code ou link acima
                      </p>
                    )}
                  </>
                )}
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

      {/* Send Prescription Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Prescrição</DialogTitle>
            <DialogDescription>
              Envie a prescrição para o paciente ou outro destinatário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="send-email">Email</Label>
              <Input
                id="send-email"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="Digite o email do destinatário"
                disabled={sending}
                defaultValue={data?.patient?.email || ''}
              />
            </div>
            <div>
              <Label htmlFor="send-method">Método</Label>
              <select
                id="send-method"
                value={sendMethod}
                onChange={(e) => setSendMethod(e.target.value as any)}
                disabled={sending}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowSendDialog(false); setSendEmail('') }}
                disabled={sending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={!sendEmail || sending}
              >
                {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>) : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
