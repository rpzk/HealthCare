'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'

interface VerifyResult {
  valid: boolean
  reason: string | null
  signature?: {
    documentType: string
    documentId: string
    signedAt: string
    signatureAlgorithm: string
  }
  certificate?: {
    subject: string
    issuer: string
    serialNumber: string
    notBefore: string
    notAfter: string
    certificateType: string
  }
  validation?: { validatedAt: string; method: string }
}

const DOC_TYPE_LABEL: Record<string, string> = {
  PRESCRIPTION: 'Prescrição médica',
  MEDICAL_CERTIFICATE: 'Atestado médico',
  REFERRAL: 'Encaminhamento',
  EXAM_REQUEST: 'Solicitação de exame',
  OTHER: 'Documento',
}

function extractNameFromSubject(subject: string): string {
  const match = subject.match(/CN=([^:]+)(?::|$)/i)
  return match ? decodeURIComponent(match[1].trim()) : subject
}

export default function VerifyPage() {
  const params = useParams()
  const hash = params?.hash as string
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hash) {
      setError('Link de verificação inválido.')
      setLoading(false)
      return
    }
    const apiUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/digital-signatures/validate/${hash}`
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setResult(data)
      })
      .catch(() => setError('Não foi possível verificar o documento.'))
      .finally(() => setLoading(false))
  }, [hash])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Verificação indisponível
              </h1>
              <p className="text-muted-foreground mb-6">
                {error || 'Documento não encontrado ou link inválido.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Use o link ou QR Code que veio no próprio documento para validar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const docLabel = DOC_TYPE_LABEL[result.signature?.documentType || ''] || result.signature?.documentType || 'Documento'
  const signerName = result.certificate?.subject ? extractNameFromSubject(result.certificate.subject) : '—'
  const signedAt = result.signature?.signedAt
    ? new Date(result.signature.signedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* O que importa de verdade: validação no ITI */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
          <CardContent className="pt-6 pb-6">
            <p className="font-medium text-foreground mb-2">
              O que importa para validade oficial
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              A validade perante farmácias, órgãos e terceiros é feita pelo <strong>Governo (ITI)</strong>, usando o PDF original da receita. Quem recebeu o documento deve validá-lo em:
            </p>
            <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
              <a
                href="https://validar.iti.gov.br"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                validar.iti.gov.br
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Use o arquivo PDF da receita (não uma cópia de impressão).
            </p>
          </CardContent>
        </Card>

        {/* Conferência interna (secundária) */}
        <Card className={result.valid ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}>
          <CardContent className="pt-8 pb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
              Conferência interna no sistema
            </p>
            <div className="flex flex-col items-center text-center mb-6">
              {result.valid ? (
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mb-3" />
              ) : (
                <XCircle className="h-16 w-16 text-amber-600 dark:text-amber-400 mb-3" />
              )}
              <h2 className="text-xl font-bold text-foreground mb-1">
                {result.valid ? 'Registro de assinatura encontrado' : 'Documento com ressalvas'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {result.valid
                  ? 'Este sistema registrou uma assinatura para este documento. Não exibe o conteúdo; apenas o resultado da conferência.'
                  : 'O documento foi encontrado, mas a verificação apresentou ressalvas.'}
              </p>
            </div>

            <dl className="space-y-3 border-t border-border pt-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Tipo</dt>
                <dd className="mt-0.5 text-foreground">{docLabel}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Assinado por</dt>
                <dd className="mt-0.5 text-foreground">{signerName}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Data e hora da assinatura</dt>
                <dd className="mt-0.5 text-foreground">{signedAt}</dd>
              </div>
              {result.certificate?.issuer && (
                <div>
                  <dt className="font-medium text-muted-foreground">Certificado (emissor)</dt>
                  <dd className="mt-0.5 text-xs text-foreground break-all">{result.certificate.issuer}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground max-w-md mx-auto">
          Esta página é pública. Nenhum dado do documento é exibido aqui — apenas o resultado da conferência no nosso sistema. Para validade oficial, use sempre o PDF no validar.iti.gov.br.
        </p>
      </div>
    </div>
  )
}
