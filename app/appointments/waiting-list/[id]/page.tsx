'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, CalendarPlus, RefreshCw, Stethoscope, XCircle } from 'lucide-react'

type WaitingListStatus = 'ACTIVE' | 'NOTIFIED' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED'

type WaitingListItem = {
  id: string
  status: WaitingListStatus
  priority: number
  specialty: string | null
  urgencyReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  patient: {
    id: string
    name: string
    phone: string | null
    email: string | null
  }
  doctor: {
    id: string
    name: string
    speciality: string | null
  } | null
  appointment: {
    id: string
    status: string
    scheduledDate: string
  } | null
}

const statusLabel: Record<WaitingListStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }>
  = {
    ACTIVE: { label: 'Ativa', variant: 'secondary' },
    NOTIFIED: { label: 'Notificado', variant: 'outline' },
    SCHEDULED: { label: 'Agendado', variant: 'default' },
    EXPIRED: { label: 'Expirado', variant: 'destructive' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  }

export default function WaitingListItemPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [item, setItem] = useState<WaitingListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)

  const id = params?.id || ''

  const scheduleUrl = useMemo(() => {
    if (!item) return null
    const sp = new URLSearchParams({
      waitingListId: item.id,
      patientId: item.patient.id,
    })
    if (item.doctor?.id) sp.set('doctorId', item.doctor.id)
    return `/appointments/schedule?${sp.toString()}`
  }, [item])

  const canStartNow = useMemo(() => {
    if (!item) return false
    if (item.appointment?.id) return false
    return item.status === 'ACTIVE' || item.status === 'NOTIFIED'
  }, [item])

  const fetchItem = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/waiting-list/${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Não foi possível carregar a solicitação')
      }
      const data = await res.json()
      setItem(data.item)
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Erro ao carregar solicitação',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchItem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const cancelRequest = async () => {
    if (!item) return
    setMutating(true)
    try {
      const res = await fetch(`/api/waiting-list/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Erro ao cancelar')
      }
      toast({ title: 'Ok', description: 'Solicitação cancelada.' })
      await fetchItem()
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao cancelar', variant: 'destructive' })
    } finally {
      setMutating(false)
    }
  }

  const startNow = async () => {
    if (!item) return
    setMutating(true)
    try {
      const res = await fetch(`/api/waiting-list/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_now' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao iniciar atendimento')
      }

      const consultationId = data?.consultation?.id
      if (!consultationId) {
        throw new Error('Resposta inválida ao iniciar atendimento')
      }

      toast({ title: 'Consulta iniciada', description: 'Abrindo prontuário...' })
      router.push(`/consultations/${consultationId}`)
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao iniciar atendimento', variant: 'destructive' })
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" onClick={fetchItem} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitação de agendamento</CardTitle>
          <CardDescription>Fila de espera (sem horário definido)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : !item ? (
            <div className="text-sm text-muted-foreground">Solicitação não encontrada.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusLabel[item.status].variant}>{statusLabel[item.status].label}</Badge>
                <Badge variant="outline">Prioridade: {item.priority}</Badge>
              </div>

              <div>
                <div className="text-sm font-medium">Paciente</div>
                <div className="text-sm">{item.patient.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.patient.phone || item.patient.email || 'Sem contato'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Profissional</div>
                <div className="text-sm">{item.doctor?.name || item.specialty || 'A definir'}</div>
              </div>

              {item.urgencyReason && (
                <div>
                  <div className="text-sm font-medium">Urgência</div>
                  <div className="text-sm">{item.urgencyReason}</div>
                </div>
              )}

              {item.notes && (
                <div>
                  <div className="text-sm font-medium">Observações</div>
                  <pre className="text-xs bg-muted/30 p-3 rounded whitespace-pre-wrap">{item.notes}</pre>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {canStartNow && (
                  <Button variant="secondary" onClick={startNow} disabled={mutating}>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Atender agora
                  </Button>
                )}
                {scheduleUrl && (
                  <Button asChild>
                    <Link href={scheduleUrl}>
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Agendar agora
                    </Link>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={cancelRequest}
                  disabled={mutating || item.status === 'CANCELLED' || item.status === 'SCHEDULED'}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar solicitação
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
