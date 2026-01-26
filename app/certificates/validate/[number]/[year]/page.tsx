'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Download, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import QRCode from 'qrcode'

interface ValidatedCertificate {
  id: string
  sequenceNumber: number
  year: number
  type: string
  title: string
  content: string
  patient: {
    name: string
    email?: string
  }
  doctor: {
    name: string
    specialty?: string
  }
  startDate: string
  endDate?: string
  days?: number
  cidCode?: string
  cidDescription?: string
  includeCid?: boolean
  issuedAt: string
  revokedAt?: string
  pdfPath?: string
  pdfHash?: string
  valid: boolean
}

export default function ValidateCertificatePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const number = params?.number as string
  const year = params?.year as string
  const validationCode = searchParams?.get('h') ?? searchParams?.get('hash')

  const [certificate, setCertificate] = useState<ValidatedCertificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const validateCertificate = async () => {
      setLoading(true)
      try {
        if (!validationCode) {
          setError('Link de validação incompleto (código ausente).')
          return
        }

        const res = await fetch(`/api/certificates/validate/${number}/${year}?h=${encodeURIComponent(validationCode)}`)

        if (res.ok) {
          const data = await res.json()
          setCertificate(data.certificate)
          setIsValid(data.valid === true)
        } else {
          const data = await res.json()
          setError(data.error || 'Atestado não encontrado')
        }
      } catch (err) {
        setError('Erro ao validar atestado')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (number && year) {
      validateCertificate()
    }
  }, [number, year, validationCode])

  useEffect(() => {
    const generateQr = async () => {
      try {
        if (typeof window === 'undefined') return
        const url = window.location.href
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
        })
        setQrCodeDataUrl(dataUrl)
      } catch (err) {
        console.error('Erro ao gerar QR Code', err)
        setQrCodeDataUrl(null)
      }
    }

    generateQr()
  }, [number, year, validationCode])

  const getCertificateTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      MEDICAL_LEAVE: 'Atestado de Afastamento',
      FITNESS: 'Atestado de Aptidão Física',
      ACCOMPANIMENT: 'Atestado de Acompanhante',
      TIME_OFF: 'Atestado de Comparecimento',
      CUSTOM: 'Atestado Personalizado',
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Validando atestado...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Atestado Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Status Banner */}
        <div className="mb-6">
          {isValid && !certificate?.revokedAt ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-700 font-medium">
                ✓ Atestado válido para este código de validação
              </AlertDescription>
            </Alert>
          ) : certificate?.revokedAt ? (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertDescription>
                Este atestado foi revogado em {format(new Date(certificate.revokedAt), 'PPP', { locale: ptBR })}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertDescription>
                Atestado não validado para este código.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Documento Principal */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {certificate?.title || 'ATESTADO MÉDICO'}
                </CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  Número: {number}/{year}
                </CardDescription>
              </div>
              <Badge
                variant={isValid && !certificate?.revokedAt ? 'default' : 'destructive'}
                className="h-fit"
              >
                {isValid && !certificate?.revokedAt ? 'Válido' : 'Inválido'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-8 space-y-6">
            {/* Tipo de Atestado */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground">
                TIPO DE ATESTADO
              </label>
              <p className="text-lg font-medium mt-2">
                {getCertificateTypeLabel(certificate?.type || '')}
              </p>
            </div>

            {/* Paciente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  PACIENTE
                </label>
                <p className="text-lg font-medium mt-2">
                  {certificate?.patient.name}
                </p>
                {certificate?.patient.email ? (
                  <p className="text-sm text-muted-foreground">{certificate.patient.email}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  MÉDICO RESPONSÁVEL
                </label>
                <p className="text-lg font-medium mt-2">
                  {certificate?.doctor.name}
                </p>
                {certificate?.doctor.specialty && (
                  <p className="text-sm text-muted-foreground">
                    {certificate.doctor.specialty}
                  </p>
                )}
              </div>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  DATA DE INÍCIO
                </label>
                <p className="text-lg font-medium mt-2">
                  {format(new Date(certificate?.startDate || ''), 'PPP', {
                    locale: ptBR,
                  })}
                </p>
              </div>

              {certificate?.endDate && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    DATA DE TÉRMINO
                  </label>
                  <p className="text-lg font-medium mt-2">
                    {format(new Date(certificate.endDate), 'PPP', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}

              {certificate?.days && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    DIAS DE AFASTAMENTO
                  </label>
                  <p className="text-lg font-medium mt-2">{certificate.days} dias</p>
                </div>
              )}
            </div>

            {/* CID (se incluído) */}
            {certificate?.includeCid && certificate?.cidCode && (
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  DIAGNÓSTICO (CID-10)
                </label>
                <p className="text-lg font-medium mt-2">
                  {certificate.cidCode} - {certificate.cidDescription}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Em conformidade com a LGPD - Incluído com consentimento do paciente
                </p>
              </div>
            )}

            {/* Conteúdo do Atestado */}
            <div className="bg-gray-50 p-6 rounded-lg border">
              <label className="text-sm font-semibold text-muted-foreground">
                CONTEÚDO DO ATESTADO
              </label>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
                {certificate?.content}
              </div>
            </div>

            {/* Datas de Emissão */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  DATA DE EMISSÃO
                </label>
                <p className="text-sm mt-2">
                  {format(new Date(certificate?.issuedAt || ''), 'PPPppp', {
                    locale: ptBR,
                  })}
                </p>
              </div>

              {certificate?.revokedAt && (
                <div>
                  <label className="text-sm font-semibold text-red-600">
                    DATA DE REVOGAÇÃO
                  </label>
                  <p className="text-sm mt-2">
                    {format(new Date(certificate.revokedAt), 'PPPppp', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Hash e Autenticidade */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="text-sm font-semibold text-blue-900">CÓDIGO DE VALIDAÇÃO</label>
              <p className="text-xs font-mono mt-2 break-all text-blue-800">{validationCode || '—'}</p>
              <p className="text-xs text-blue-700 mt-2">
                Este código valida que o link corresponde a este atestado. Ele não comprova, por si só, a integridade do arquivo PDF.
              </p>

              {certificate?.pdfHash ? (
                <div className="mt-4">
                  <label className="text-sm font-semibold text-blue-900">HASH DO PDF (SHA-256)</label>
                  <p className="text-xs font-mono mt-2 break-all text-blue-800">{certificate.pdfHash}</p>
                  <p className="text-xs text-blue-700 mt-2">
                    Para checar a integridade do arquivo, compare o SHA-256 do PDF baixado com este valor.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-6 border-t">
              {certificate?.pdfPath && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    window.open(certificate.pdfPath, '_blank')
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              )}

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.share({
                    title: `Atestado ${number}/${year}`,
                    text: `Valide o atestado número ${number}/${year}`,
                    url: window.location.href,
                  })
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Segurança */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Informações de Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Numeração Sequencial</p>
                <p className="text-muted-foreground">
                  Este atestado tem número único {number}/{year}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Cadeia de Confiança</p>
                <p className="text-muted-foreground">
                  Emitido por este sistema; utilize o status acima para validar
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Privacidade (LGPD)</p>
                <p className="text-muted-foreground">
                  Dados do paciente inclusos apenas com consentimento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        {(certificate?.pdfPath || qrCodeDataUrl) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">QR Code de Validação</CardTitle>
              <CardDescription>
                Escaneie para abrir esta página de validação.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-6 bg-white rounded-lg">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code de validação"
                  className="h-[220px] w-[220px]"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  Não foi possível gerar o QR Code neste dispositivo.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
