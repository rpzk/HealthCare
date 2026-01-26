'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon, Send } from 'lucide-react'

interface ReferralDetail {
  id: string
  patient: { id: string; name: string }
  doctor: { id: string; name: string; speciality?: string }
  specialty: string
  description: string
  priority: string
  notes?: string | null
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

export default function ReferralDetails({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReferralDetail | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const [requireSignBeforePrint, setRequireSignBeforePrint] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/referrals/${id}`)
        if (!res.ok) throw new Error('Falha ao carregar encaminhamento')
        const json = await res.json()
        setData(json)

        // Fetch signature metadata regardless; referral model doesn't hold signature field
        const sigRes = await fetch(`/api/referrals/${id}/signature`)
        if (sigRes.ok) {
          const s = await sigRes.json()
          if (s?.signed) {
            setIsSigned(true)
            if (s?.verificationUrl) setVerificationUrl(s.verificationUrl)
          }
        }

        // Policy flags
        const policyRes = await fetch('/api/system/signature-policy')
        if (policyRes.ok) {
          const p = await policyRes.json()
          const flag = !!p?.policy?.requireSignature?.referral
          setRequireSignBeforePrint(flag)
        }
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
      const res = await fetch(`/api/referrals/${id}/sign`, {
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
      setShowPasswordDialog(false)
      setPassword('')
      alert('Encaminhamento assinado com sucesso!')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">Erro: {error}</div>
  if (!data) return <div>Não encontrado</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-4 h-4" /> Encaminhamento #{data.id}
          </h3>
          <p className="text-sm text-gray-600">Paciente: {data.patient.name} • Médico: {data.doctor.name}</p>
        </div>
        <div className="space-x-2">
          {!isSigned && (
            <Button 
              onClick={() => setShowPasswordDialog(true)} 
              disabled={signing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {signing ? 'Assinando...' : 'Assinar Digitalmente'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={!isSigned && requireSignBeforePrint}
            title={!isSigned && requireSignBeforePrint ? 'Assine antes de imprimir' : undefined}
          >
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
              if ((navigator as any)?.share) {
                (navigator as any).share({ title: 'Encaminhamento', url: shareUrl }).catch(() => {})
              } else {
                try { navigator.clipboard.writeText(shareUrl) } catch {}
                alert('Link copiado para a área de transferência')
              }
            }}
            disabled={!isSigned && requireSignBeforePrint}
            title={!isSigned && requireSignBeforePrint ? 'Assine antes de compartilhar' : undefined}
          >
            Compartilhar
          </Button>
          <Button variant="outline" onClick={() => router.push(`/referrals/${id}/edit`)}>Editar</Button>
        </div>
      </div>

      {isSigned && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md flex items-center text-green-800 text-sm">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div className="flex items-center gap-3">
            <span>Assinatura registrada no sistema.</span>
            {verificationUrl && (
              <Button
                variant="link"
                className="text-green-700 underline p-0 h-auto"
                onClick={() => window.open(verificationUrl!, '_blank')}
              >
                <LinkIcon className="w-4 h-4 mr-1" /> Verificar
              </Button>
            )}
          </div>
        </div>
      )}

      {!isSigned && requireSignBeforePrint && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-900 text-sm">
          Este documento requer assinatura registrada antes de imprimir ou compartilhar.
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="font-medium">Especialidade</h4>
              <p className="text-gray-700">{data.specialty}</p>
            </div>
            <div>
              <h4 className="font-medium">Prioridade</h4>
              <p className="text-gray-700">{data.priority}</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium">Descrição</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{data.description}</p>
          </div>
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

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Assinatura</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado A1 para assinar este encaminhamento.
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
    </div>
  )
}
