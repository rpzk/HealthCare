'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon, Printer, FileText } from 'lucide-react'
import { useAutoPrint } from '@/hooks/use-auto-print'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface PrescriptionDetail {
  id: string
  patient: { id: string; name: string; cpf?: string }
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
  const printRef = useRef<HTMLDivElement>(null)
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

  // Auto-print when ?print=1 is in URL
  const canPrintNow = !loading && !!data && (isSigned || !requireSignBeforePrint)
  useAutoPrint({
    isReady: !loading && !!data,
    canPrint: canPrintNow
  })

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

  const handlePrint = () => {
    window.print()
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

  // Generate full verification URL
  const fullVerificationUrl = typeof window !== 'undefined' && verificationUrl 
    ? `${window.location.origin}${verificationUrl}` 
    : ''

  return (
    <>
      {/* Print-only version - hidden on screen */}
      <div ref={printRef} className="print-area hidden print:block">
        <div className="max-w-[700px] mx-auto p-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
          {/* Header with doctor info */}
          <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
            <h1 className="text-xl font-bold">{data.doctor.name}</h1>
            {data.doctor.crmNumber && <p className="text-sm">CRM: {data.doctor.crmNumber}</p>}
            {data.doctor.speciality && <p className="text-sm">{data.doctor.speciality}</p>}
            <p className="text-xs text-gray-600 mt-1">{clinicInfo.name || 'Clínica Médica'}</p>
            {clinicInfo.address && <p className="text-xs text-gray-600">{clinicInfo.address}</p>}
          </div>

          {/* Patient Info */}
          <div className="mb-4 p-2 bg-gray-50 border rounded">
            <p className="text-sm"><strong>Nome:</strong> {data.patient.name}</p>
            {data.patient.cpf && <p className="text-sm"><strong>CPF:</strong> {data.patient.cpf}</p>}
          </div>

          {/* Medications */}
          <div className="mb-6">
            {data.medications.map((m, i) => (
              <div key={i} className="mb-4 pb-2 border-b border-gray-200">
                <p className="font-bold text-sm">{m.name}</p>
                <p className="text-xs">- {m.dosage}</p>
                <p className="text-xs">{m.frequency}</p>
                <p className="text-xs">Duração: {m.duration}</p>
                {m.instructions && <p className="text-xs italic mt-1">{m.instructions}</p>}
              </div>
            ))}
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="mb-4 p-2 bg-gray-50 border rounded text-sm">
              <p>{data.notes}</p>
            </div>
          )}

          {/* Date and signature section */}
          <div className="mt-6 pt-4 border-t-2 border-gray-800">
            <div className="flex justify-between items-start">
              {/* Left: Date and signature info */}
              <div className="flex-1">
                <p className="text-sm mb-4">
                  <strong>Data e hora:</strong> {formatDateTime(signatureData?.signedAt || data.createdAt)}
                </p>
                
                {/* Signature line */}
                <div className="mt-6">
                  <div className="w-56 border-t border-gray-800 pt-1">
                    <p className="font-semibold text-sm">{data.doctor.name}</p>
                    {data.doctor.crmNumber && <p className="text-xs">CRM {data.doctor.crmNumber}</p>}
                  </div>
                </div>

                {/* Digital signature info */}
                {isSigned && (
                  <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <p className="font-bold text-green-800">✓ Documento Assinado Digitalmente</p>
                    <p className="text-green-700 mt-1">
                      Assinado por: {signatureData?.certificate?.subject || data.doctor.name}
                    </p>
                    {signatureData?.signedAt && (
                      <p className="text-green-700">
                        Em: {formatDateTime(signatureData.signedAt)}
                      </p>
                    )}
                    {signatureData?.certificate?.issuer && (
                      <p className="text-green-700 text-[10px] mt-1">
                        Emissor: {signatureData.certificate.issuer}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: QR Code for verification */}
              {isSigned && fullVerificationUrl && (
                <div className="ml-4 text-center">
                  <div className="border-2 border-gray-800 p-1 inline-block bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(fullVerificationUrl)}`}
                      alt="QR Code para verificação"
                      width={100}
                      height={100}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <p className="text-[9px] mt-1 text-gray-600 max-w-[110px]">
                    Escaneie para validar a assinatura
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer with validation info */}
          <div className="mt-4 pt-2 border-t text-[9px] text-gray-500">
            <p className="text-center">
              Para validar este documento, acesse: {fullVerificationUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/digital-signatures/validate`}
            </p>
            <p className="text-center mt-1">
              ID do documento: {data.id}
              {signatureData?.signatureHash && ` | Hash: ${signatureData.signatureHash.slice(0, 16)}...`}
            </p>
          </div>
        </div>
      </div>

      {/* Screen version */}
      <div className="space-y-4 print:hidden">
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
              {signing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assinando...</>) : 'Assinar Digitalmente'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!isSigned && requireSignBeforePrint || loading}
            title={!isSigned && requireSignBeforePrint ? 'Assine antes de imprimir' : undefined}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
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
            disabled={!isSigned && requireSignBeforePrint || loading}
            title={!isSigned && requireSignBeforePrint ? 'Assine antes de compartilhar' : undefined}
          >
            Compartilhar
          </Button>
          <Button variant="outline" onClick={() => router.push(`/prescriptions/${id}/edit`)} disabled={loading}>Editar</Button>
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
      </div>
    </>
  )
}
