"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Loader2, Check, Copy, Mail } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface TeleInviteButtonProps {
  consultationId: string
}

export function TeleInviteButton({ consultationId }: TeleInviteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [teleLink, setTeleLink] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleInvite = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/consultations/${consultationId}/tele-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json() as { teleLink?: string; message?: string; error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar convite')
      }

      setTeleLink(data.teleLink ?? null)
      setSent(true)
      
      toast({
        title: '✅ Convite Enviado!',
        description: data.message,
      })

    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Erro', description: String(error), variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (teleLink) {
      navigator.clipboard.writeText(teleLink)
      toast({
        title: 'Link copiado!',
        description: 'Cole e envie para o paciente',
      })
    }
  }

  if (sent && teleLink) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">Convite enviado!</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyLink}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Copiar Link
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleInvite}
          disabled={loading}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Mail className="h-4 w-4" />
          Reenviar
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleInvite}
      disabled={loading}
      className="gap-2 bg-green-600 hover:bg-green-700"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          Chamar Paciente
        </>
      )}
    </Button>
  )
}
