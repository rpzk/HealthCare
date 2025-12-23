/**
 * Componente: Botão de Assinatura com Gov.br
 * 
 * Permite que usuários assinem digitalmente documentos usando Gov.br
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react'

interface GovBrSignatureButtonProps {
  certificateId: string
  onSuccess?: (data: { certificateId: string }) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function GovBrSignatureButton({
  certificateId,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: GovBrSignatureButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignClick = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[GovBr Button] Iniciando assinatura para certificado:', certificateId)

      // Requisição para iniciar assinatura
      const response = await fetch('/api/govbr/iniciar-assinatura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ certificateId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao iniciar assinatura')
      }

      const data = await response.json()
      const redirectUrl = data.redirectUrl

      if (!redirectUrl) {
        throw new Error('URL de redirecionamento não retornada')
      }

      console.log('[GovBr Button] Redirecionando para Gov.br...')
      console.log('[GovBr Button] URL:', redirectUrl.slice(0, 50) + '...')

      // Redirecionar para Gov.br
      window.location.href = redirectUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[GovBr Button] Erro:', errorMessage)
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
        disabled={disabled || isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Redirecionando...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Assinado com Gov.br
          </>
        ) : (
          '🇧🇷 Assinar com Gov.br'
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-2">
        Você será redirecionado para a plataforma Gov.br para autenticar e assinar
      </p>
    </div>
  )
}
