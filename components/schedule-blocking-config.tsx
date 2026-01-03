'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Trash2, AlertCircle, Save, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduleException {
  id: string
  date: string
  blockType: string
  reason?: string
  createdAt: string
}

const BLOCK_TYPES = [
  { value: 'UNAVAILABLE', label: 'Indisponível', color: 'bg-gray-100' },
  { value: 'ON_CALL', label: 'Plantão em outro local', color: 'bg-blue-100' },
  { value: 'VACATION', label: 'Férias', color: 'bg-green-100' },
  { value: 'SICK_LEAVE', label: 'Licença médica', color: 'bg-red-100' },
  { value: 'MAINTENANCE', label: 'Manutenção/Reunião', color: 'bg-yellow-100' },
  { value: 'TRAINING', label: 'Treinamento', color: 'bg-purple-100' },
  { value: 'MEETING', label: 'Reunião profissional', color: 'bg-indigo-100' },
]

// Todos os roles que são considerados profissionais de saúde
const PROFESSIONAL_ROLES = [
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'NUTRITIONIST',
  'DENTIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'SOCIAL_WORKER',
  'RECEPTIONIST',
  'ADMIN'
]

export function ScheduleBlockingConfig() {
  const { data: session } = useSession()
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [blockType, setBlockType] = useState('VACATION')
  const [reason, setReason] = useState('')

  const isProfessional = session?.user?.role && PROFESSIONAL_ROLES.includes(session.user.role)

  useEffect(() => {
    if (isProfessional) {
      loadExceptions()
    }
  }, [isProfessional])

  const loadExceptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schedules/exceptions')
      if (response.ok) {
        const data = await response.json()
        setExceptions(data.exceptions || [])
      }
    } catch (error) {
      console.error('Error loading exceptions:', error)
      toast.error('Erro ao carregar bloqueios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Selecione data de início e fim')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Data de início não pode ser após data de fim')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/schedules/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          blockType,
          reason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar bloqueio')
      }

      toast.success('Dias bloqueados com sucesso!')
      setStartDate('')
      setEndDate('')
      setReason('')
      setBlockType('VACATION')
      await loadExceptions()
    } catch (error) {
      console.error('Error adding block:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar bloqueio')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBlock = async (exceptionId: string) => {
    if (!confirm('Tem certeza que quer remover este bloqueio?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/schedules/exceptions?id=${exceptionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover bloqueio')
      }

      toast.success('Bloqueio removido')
      await loadExceptions()
    } catch (error) {
      console.error('Error deleting block:', error)
      toast.error('Erro ao remover bloqueio')
    } finally {
      setSaving(false)
    }
  }

  if (!isProfessional) {
    return null
  }

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin" />
  }

  // Group exceptions by date for display
  const groupedByDate = exceptions.reduce((acc, ex) => {
    const dateKey = format(new Date(ex.date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(ex)
    return acc
  }, {} as Record<string, ScheduleException[]>)

  return (
    <div className="space-y-6">
      {/* Add Block Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Bloquear Dias
          </CardTitle>
          <CardDescription>
            Marque os dias em que você não está disponível (férias, plantão, etc)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBlock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data de Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-type">Tipo de Bloqueio</Label>
              <Select value={blockType} onValueChange={setBlockType}>
                <SelectTrigger id="block-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ex: Férias na praia"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Pacientes não conseguirão agendar consultas durante os dias bloqueados
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bloqueando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Bloquear Dias
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of Blocked Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dias Bloqueados ({exceptions.length})
          </CardTitle>
          <CardDescription>
            Seus dias indisponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dia bloqueado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedByDate).map(([dateKey, excs]) =>
                excs.map((exc) => {
                  const blockTypeObj = BLOCK_TYPES.find((t) => t.value === exc.blockType)
                  return (
                    <div
                      key={exc.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${blockTypeObj?.color || 'bg-gray-100'}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(new Date(exc.date), 'EEEE, dd MMMM yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex gap-4 mt-1 text-sm">
                          <span className="font-semibold">{blockTypeObj?.label}</span>
                          {exc.reason && (
                            <span className="text-muted-foreground">{exc.reason}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Adicionado em: {format(new Date(exc.createdAt), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlock(exc.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
