'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, CalendarPlus, Eye, Stethoscope } from 'lucide-react'

type WaitingListStatus = 'ACTIVE' | 'NOTIFIED' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED'

type WaitingListItem = {
  id: string
  status: WaitingListStatus
  priority: number
  specialty: string | null
  urgencyReason: string | null
  notes: string | null
  createdAt: string
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
}

const statusLabel: Record<WaitingListStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }>
  = {
    ACTIVE: { label: 'Ativa', variant: 'secondary' },
    NOTIFIED: { label: 'Notificado', variant: 'outline' },
    SCHEDULED: { label: 'Agendado', variant: 'default' },
    EXPIRED: { label: 'Expirado', variant: 'destructive' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  }

export default function WaitingListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<WaitingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/waiting-list')
      if (!res.ok) {
        throw new Error('Não foi possível carregar a fila de espera')
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Erro ao carregar fila de espera',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNow = async (item: WaitingListItem) => {
    setStartingId(item.id)
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
      if (!consultationId) throw new Error('Resposta inválida ao iniciar atendimento')

      toast({ title: 'Consulta iniciada', description: 'Abrindo prontuário...' })
      router.push(`/consultations/${consultationId}`)
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Erro ao iniciar atendimento', variant: 'destructive' })
    } finally {
      setStartingId(null)
    }
  }

  const openScheduleUrl = (item: WaitingListItem) => {
    const params = new URLSearchParams({
      waitingListId: item.id,
      patientId: item.patient.id,
    })
    if (item.doctor?.id) params.set('doctorId', item.doctor.id)
    return `/appointments/schedule?${params.toString()}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fila de Espera</h1>
          <p className="text-muted-foreground">Solicitações de agendamento sem horário definido</p>
        </div>
        <Button variant="outline" onClick={fetchItems} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            Clique em uma solicitação para ver detalhes ou vá direto para agendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma solicitação na fila.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/appointments/waiting-list/${item.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{item.patient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.patient.phone || item.patient.email || 'Sem contato'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabel[item.status].variant}>{statusLabel[item.status].label}</Badge>
                    </TableCell>
                    <TableCell>{item.priority}</TableCell>
                    <TableCell>
                      {item.doctor?.name || item.specialty || 'A definir'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/appointments/waiting-list/${item.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Link>
                        </Button>
                        {(item.status === 'ACTIVE' || item.status === 'NOTIFIED') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => startNow(item)}
                            disabled={startingId === item.id}
                          >
                            <Stethoscope className="h-4 w-4 mr-2" />
                            Atender
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link href={openScheduleUrl(item)}>
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Agendar
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
