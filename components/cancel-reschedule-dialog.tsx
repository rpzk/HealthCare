'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CancelRescheduleDialogProps {
  consultationId: string
  patientName: string
  doctorName: string
  scheduledDate: string
  onSuccess?: () => void
}

export function CancelRescheduleDialog({
  consultationId,
  patientName,
  doctorName,
  scheduledDate,
  onSuccess,
}: CancelRescheduleDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<'cancel' | 'reschedule' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Por favor, informe um motivo')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          reason,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao cancelar')
      }

      toast.success('Consulta cancelada com sucesso')
      setIsOpen(false)
      setAction(null)
      setReason('')
      onSuccess?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = () => {
    try {
      setLoading(true)
      // Redirect to booking page with previous consultation data
      router.push(`/appointments/book?reschedule=${consultationId}`)
      toast.success('Redirecionando para reagendamento...')
      setIsOpen(false)
      setAction(null)
      setReason('')
    } catch (error) {
      toast.error('Erro ao redirecionar para reagendamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cancelar/Remarcar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancelar ou Remarcar Consulta</DialogTitle>
          <DialogDescription>
            {doctorName} - {new Date(scheduledDate).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          <div className="space-y-3 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Escolha se deseja cancelar ou remarcar sua consulta
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => setAction('cancel')}
              >
                ✕ Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => setAction('reschedule')}
              >
                ↻ Remarcar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {action === 'cancel' ? (
              <>
                <div>
                  <Label htmlFor="reason">Motivo do cancelamento (obrigatório)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Ex: Mudança de horário disponível, problema de saúde, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Você será notificado por email sobre o cancelamento
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAction(null)
                      setReason('')
                    }}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleCancel}
                    disabled={loading || !reason.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Você será redirecionado para escolher uma nova data e horário
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAction(null)
                      setReason('')
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleReschedule}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecionando...
                      </>
                    ) : (
                      'Remarcar Consulta'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
