'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Download, ExternalLink } from 'lucide-react'

interface ValidarData {
  prescriptionId: string
  doctorName: string
  crm: string
  crmState?: string
  specialty?: string
  signedAt: string
  status: string
}

export default function ValidarPrescricaoPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ValidarData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Link de validação inválido.')
      setLoading(false)
      return
    }
    const apiUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/prescriptions/${id}/validar`
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) return res.json().then((body) => { throw new Error(body?.error || body?.message || 'Documento não encontrado') })
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message || 'Não foi possível validar o documento.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando documento...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Validação indisponível
              </h1>
              <p className="text-muted-foreground mb-6">
                {error || 'Documento não encontrado ou ainda não assinado digitalmente.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Use o link ou QR Code que veio no próprio documento. Para validade oficial, utilize o PDF no site do Governo.
              </p>
              <Button asChild className="mt-4">
                <a href="https://validar.iti.gov.br" target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  validar.iti.gov.br
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const signedAtFormatted = new Date(data.signedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const pdfDownloadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/prescriptions/${data.prescriptionId}/public-pdf`
    : '#'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mb-3" />
              <h1 className="text-xl font-bold text-foreground mb-2">
                Documento Assinado Digitalmente via ICP-Brasil
              </h1>
              <p className="text-sm text-muted-foreground">
                Esta prescrição foi assinada digitalmente e pode ser validada em todo o território nacional (Lei nº 14.063/2020).
              </p>
            </div>

            <dl className="space-y-4 border-t border-border pt-6 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Médico</dt>
                <dd className="mt-1 text-foreground font-medium">{data.doctorName}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">CRM</dt>
                <dd className="mt-1 text-foreground">{data.crm}</dd>
              </div>
              {data.specialty && (
                <div>
                  <dt className="font-medium text-muted-foreground">Especialidade</dt>
                  <dd className="mt-1 text-foreground">{data.specialty}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-muted-foreground">Data e hora da assinatura</dt>
                <dd className="mt-1 text-foreground">{signedAtFormatted}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1 text-foreground">{data.status}</dd>
              </div>
            </dl>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                Para validar oficialmente perante farmácias e órgãos, baixe o PDF original assinado e envie no site do Governo.
              </p>
              <Button asChild size="lg" className="w-full gap-2">
                <a href={pdfDownloadUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-5 w-5" />
                  Baixar PDF Original Assinado
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Use o arquivo baixado em <strong>validar.iti.gov.br</strong> para verificação oficial.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <Button asChild variant="outline" className="w-full gap-2">
              <a href="https://validar.iti.gov.br" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir validar.iti.gov.br
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Página pública de conferência. Nenhum dado clínico do paciente é exibido. Validade oficial: validar.iti.gov.br.
        </p>
      </div>
    </div>
  )
}
