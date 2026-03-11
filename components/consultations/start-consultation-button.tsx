'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StartConsultationButtonProps {
  patientId: string
  patientName?: string
  variant?: 'default' | 'outline' | 'medical'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

/**
 * Botão para iniciar consulta imediatamente — sem modal, sem burocracia.
 * Usa paciente da página + médico logado. Um clique e vai para o workspace.
 */
export function StartConsultationButton({
  patientId,
  patientName,
  variant = 'default',
  size = 'default',
  className = '',
  children,
}: StartConsultationButtonProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    const doctorId = (session?.user as { id?: string })?.id
    if (!doctorId) {
      toast.error('Faça login para iniciar a consulta')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          doctorId,
          scheduledDate: new Date().toISOString(),
          type: 'ROUTINE',
          description: '',
          notes: '',
          duration: 60,
          status: 'IN_PROGRESS',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao iniciar consulta')
      }

      const { consultation } = await res.json()
      toast.success(`Consulta iniciada com ${patientName || 'paciente'}`)
      router.push(`/consultations/${consultation.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar consulta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleStart}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Play className="h-4 w-4 mr-2" />
      )}
      {children ?? 'Iniciar Consulta'}
    </Button>
  )
}
