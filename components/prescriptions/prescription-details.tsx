'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon, FileText, Share2, Mail, MessageCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface PrescriptionDetail {
  id: string
  patient: { id: string; name: string; cpf?: string; email?: string | null }
  doctor: { id: string; name: string; speciality?: string; crmNumber?: string }
  medications: Medication[]
  notes?: string
  status: string
  digitalSignature?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export default function PrescriptionDetails({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PrescriptionDetail | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [requireSignBeforePrint, setRequireSignBeforePrint] = useState(false)
  const [clinicInfo, setClinicInfo] = useState<{ name?: string; address?: string; phone?: string }>({})
  const [signatureData, setSignatureData] = useState<{
    signedAt?: string
    signatureHash?: string
    certificate?: {
      subject?: string
      issuer?: string
      serialNumber?: string
      notBefore?: string
      notAfter?: string
    }
  } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailToSend, setEmailToSend] = useState('')
  const [loadingShareLink, setLoadingShareLink] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/prescriptions/${id}`)
        if (!res.ok) throw new Error('Falha ao carregar prescrição')
        const json = await res.json()
        setData(json)
        setIsSigned(!!json?.digitalSignature)
        // If already signed, fetch signature metadata to display verification link
        const sigRes = await fetch(`/api/prescriptions/${id}/signature`)
        if (sigRes.ok) {
          const s = await sigRes.json()
          if (s?.signed) {
            setIsSigned(true)
            if (s?.verificationUrl) setVerificationUrl(s.verificationUrl)
            setSignatureData({
              signedAt: s.signedAt,
              signatureHash: s.signatureHash,
              certificate: s.certificate
            })
          }
        }

        // Load signature policy
        const policyRes = await fetch('/api/system/signature-policy')
        if (policyRes.ok) {
          const p = await policyRes.json()
          const flag = !!p?.policy?.requireSignature?.prescription
          setRequireSignBeforePrint(flag)
        }

        // Load clinic info
        try {
          const clinicRes = await fetch('/api/system/settings?keys=clinic_name,clinic_address,clinic_phone')
          if (clinicRes.ok) {
            const c = await clinicRes.json()
            setClinicInfo({
              name: c.clinic_name || 'Clínica Médica',
              address: c.clinic_address || '',
              phone: c.clinic_phone || ''
            })
          }
        } catch {}
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSign = async () => {
    if (!password) return
    setSigning(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include', // Garante envio do cookie de sessão/JWT
      })
      
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao assinar')
      }

      const result = await res.json()
      // Update local state
      setData(prev => prev ? ({ ...prev, digitalSignature: result.signature }) : null)
      setIsSigned(true)
      if (result?.verificationUrl) setVerificationUrl(result.verificationUrl)
      // Reload signature data
      const sigRes = await fetch(`/api/prescriptions/${id}/signature`)
      if (sigRes.ok) {
        const s = await sigRes.json()
        setSignatureData({
          signedAt: s.signedAt,
          signatureHash: s.signatureHash,
          certificate: s.certificate
        })
      }
      setShowPasswordDialog(false)
      setPassword('')
      alert('Prescrição assinada com sucesso!')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Carregando...</span></div>
  if (error) return <div className="text-red-600 p-4">Erro: {error}</div>
  if (!data) return <div className="p-4">Não encontrado</div>


  const handleCopyShareLink = async () => {
    setLoadingShareLink(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/share-link`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Não foi possível gerar o link.', variant: 'destructive' })
        return
      }
      const url = data?.url
      if (url) {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copiado', description: 'Envie este link ao paciente (WhatsApp, etc.). Ele abre o PDF sem precisar logar. Válido por 7 dias.' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao copiar link.', variant: 'destructive' })
    } finally {
      setLoadingShareLink(false)
    }
  }

  const handleSendEmail = async (email?: string) => {
    const to = email || emailToSend || (data?.patient as { email?: string })?.email
    if (!to?.trim()) {
      setShowEmailDialog(true)
      return
    }
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: to.trim(), method: 'email' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erro ao enviar', description: json?.error || 'Tente novamente.', variant: 'destructive' })
        return
      }
      toast({ title: 'E-mail enviado', description: `Receita enviada para ${to}. O paciente recebe o PDF em anexo quando disponível.` })
      setShowEmailDialog(false)
      setEmailToSend('')
    } catch {
      toast({ title: 'Erro ao enviar', description: 'Falha de conexão.', variant: 'destructive' })
    } finally {
      setSendingEmail(false)
    }
  }

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Prescrição #{data.id}</h3>
          <p className="text-sm text-gray-600">Paciente: {data.patient.name} • Médico: {data.doctor.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() => window.open(`/api/prescriptions/${id}/pdf`, '_blank')}
            disabled={loading}
            title="Baixar o PDF da receita (documento assinado digitalmente; não use impressão para preservar a assinatura)."
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Baixar PDF
          </Button>
          {!data.digitalSignature && (
            <Button 
              onClick={() => setShowPasswordDialog(true)} 
              disabled={signing}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {signing ? (<><Loader2 className="h-4 w-4 animate-spin" />Assinando...</>) : <>Assinar Digitalmente</>}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSendEmail()}
            disabled={loading || sendingEmail}
            title="Envia a receita por e-mail ao paciente (com PDF em anexo quando disponível)."
            className="gap-2"
          >
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Enviar por e-mail
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyShareLink}
            disabled={loading || loadingShareLink}
            title="Gera um link que o paciente pode abrir no celular (ex.: WhatsApp) para ver o PDF sem precisar logar. Válido 7 dias."
            className="gap-2"
          >
            {loadingShareLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Link para enviar ao paciente
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!signatureData?.signatureHash) return
              const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${signatureData.signatureHash}` : ''
              if ((navigator as any)?.share) {
                (navigator as any).share({ title: 'Conferência de assinatura (sistema)', url: shareUrl }).catch(() => {})
              } else {
                try {
                  navigator.clipboard.writeText(shareUrl)
                  toast({ title: 'Link copiado', description: 'Link de conferência no sistema. Para validade oficial, o paciente deve usar o PDF no validar.iti.gov.br.' })
                } catch {}
              }
            }}
            disabled={(!isSigned && requireSignBeforePrint) || loading || !signatureData?.signatureHash}
            title="Copiar link de conferência no sistema (não mostra o documento; para validade oficial use o PDF no validar.iti.gov.br)"
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Compartilhar link (conferência)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (isSigned) {
                toast({
                  title: 'Edição bloqueada',
                  description: 'Esta prescrição já foi assinada digitalmente. Para alterações, crie uma nova prescrição.',
                  variant: 'destructive',
                })
                return
              }
              router.push(`/prescriptions/${id}/edit`)
            }}
            disabled={loading}
          >
            Editar
          </Button>
        </div>
      </div>

      {isSigned && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-md flex items-center flex-wrap gap-2 text-green-800 dark:text-green-200 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Assinatura registrada no sistema.</span>
          {signatureData?.signatureHash && (
            <Button
              variant="link"
              className="text-green-700 dark:text-green-300 underline p-0 h-auto font-medium"
              onClick={() => window.open(`/verify/${signatureData.signatureHash}`, '_blank')}
            >
              <LinkIcon className="w-4 h-4 mr-1" /> Ver resultado da verificação
            </Button>
          )}
        </div>
      )}

      {!isSigned && requireSignBeforePrint && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-900 text-sm">
          Este documento requer assinatura registrada antes de imprimir ou compartilhar.
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium">Medicamentos</h4>
          <ul className="list-disc pl-6 space-y-1">
            {data.medications.map((m, i) => (
              <li key={i}>
                {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                {m.instructions ? ` • ${m.instructions}` : ''}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {data.notes && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-1">Observações</h4>
            <p className="text-gray-700">{data.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de senha unificado para todas as ações */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmação de Assinatura</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado digital para assinar e liberar as ações desejadas (imprimir, enviar, compartilhar).
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
                {signing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assinando...</>) : 'Assinar e Prosseguir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: informar e-mail quando o paciente não tem e-mail cadastrado */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => { setShowEmailDialog(open); if (!open) setEmailToSend('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar receita por e-mail</DialogTitle>
            <DialogDescription>
              O paciente não possui e-mail cadastrado. Informe o e-mail para envio. A receita será enviada com o PDF em anexo (quando disponível).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="email-send">E-mail do destinatário</Label>
              <Input
                id="email-send"
                type="email"
                value={emailToSend}
                onChange={(e) => setEmailToSend(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={sendingEmail}
                onKeyDown={(e) => e.key === 'Enter' && handleSendEmail(emailToSend)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEmailDialog(false)} disabled={sendingEmail}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => handleSendEmail(emailToSend)} disabled={!emailToSend?.trim() || sendingEmail}>
                {sendingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
