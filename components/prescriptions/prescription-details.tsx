'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon } from 'lucide-react'

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
        body: JSON.stringify({ password })
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
      setShowPasswordDialog(false)
      setPassword('')
      alert('Prescrição assinada com sucesso!')
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
          <h3 className="text-lg font-semibold">Prescrição #{data.id}</h3>
          <p className="text-sm text-gray-600">Paciente: {data.patient.name} • Médico: {data.doctor.name}</p>
        </div>
        <div className="space-x-2">
          {!data.digitalSignature && (
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
                (navigator as any).share({ title: 'Prescrição', url: shareUrl }).catch(() => {})
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
          <Button variant="outline" onClick={() => router.push(`/prescriptions/${id}/edit`)}>Editar</Button>
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

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Assinatura</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado A1 para assinar esta prescrição.
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
