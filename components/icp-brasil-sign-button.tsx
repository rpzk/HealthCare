/**
 * Componente: Botão de assinatura com certificado A1
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { logger } from '@/lib/logger'

interface IcpBrasilSignButtonProps {
  certificateId: string
  onSuccess?: (data: { certificateId: string }) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function IcpBrasilSignButton({
  certificateId,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: IcpBrasilSignButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignClick = async () => {
    try {
      setIsLoading(true)
      setError(null)
      logger.info('[ICP-Brasil] Iniciando assinatura para certificado:', certificateId)
      const response = await fetch('/api/certificates/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao assinar certificado')
      }
      // Baixa o PDF assinado
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificado-assinado-${certificateId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setSuccess(true)
      onSuccess?.({ certificateId })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      logger.error('[ICP-Brasil] Erro:', errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        onClick={handleSignClick}
        disabled={disabled || isLoading || success}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Assinando...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            PDF assinado disponível
          </>
        ) : (
          '🔐 Assinar e Baixar PDF'
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-2">
        Assinatura com certificado A1 (ICP-Brasil) registrada no sistema
      </p>
    </div>
  )
}
