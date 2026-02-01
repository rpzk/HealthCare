'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface User {
  id: string
  name: string
  role: string
  speciality?: string
}

interface ScheduleEntry {
  id: string
  scheduleId: string
  userId: string
  user: User
  date: string
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'FULL_DAY' | 'ON_CALL'
  startTime?: string
  endTime?: string
  notes?: string
}

interface WorkSchedule {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  entries?: ScheduleEntry[]
  _count?: { entries: number }
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const SHIFT_TYPES: Record<string, { label: string; color: string }> = {
  MORNING: { label: 'Manhã', color: 'bg-blue-100 text-blue-800' },
  AFTERNOON: { label: 'Tarde', color: 'bg-orange-100 text-orange-800' },
  NIGHT: { label: 'Noite', color: 'bg-indigo-100 text-indigo-800' },
  FULL_DAY: { label: 'Integral', color: 'bg-green-100 text-green-800' },
  ON_CALL: { label: 'Plantão', color: 'bg-purple-100 text-purple-800' },
}

export default function HRSchedulesPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  const [newEntry, setNewEntry] = useState({
    userId: '',
    date: '',
    shiftType: 'MORNING',
    startTime: '',
    endTime: ''
  })

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/schedules?active=true')
      if (!res.ok) throw new Error('Erro ao carregar escalas')
      const json = await res.json()
      setSchedules(json.data || [])
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar as escalas', variant: 'destructive' })
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch entries for each active schedule
      const allEntries: ScheduleEntry[] = []
      
      for (const schedule of schedules) {
        if (selectedSchedule !== 'all' && schedule.id !== selectedSchedule) continue
        
        const res = await fetch(`/api/hr/schedules/${schedule.id}/entries?startDate=${format(weekStart, 'yyyy-MM-dd')}&endDate=${format(addDays(weekStart, 6), 'yyyy-MM-dd')}`)
        if (res.ok) {
          const json = await res.json()
          allEntries.push(...(json.data || []))
        }
      }
      
      setEntries(allEntries)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os turnos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [schedules, selectedSchedule, weekStart])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?active=true&limit=100')
      if (res.ok) {
        const json = await res.json()
        setUsers(json.data || json.users || [])
      }
    } catch {
      // Silently fail - users list is optional
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetchUsers()
  }, [fetchSchedules, fetchUsers])

  useEffect(() => {
    if (schedules.length > 0) {
      fetchEntries()
    } else {
      setLoading(false)
    }
  }, [schedules, fetchEntries])

  const handleCreateEntry = async () => {
    if (!newEntry.userId || !newEntry.date || !newEntry.shiftType) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    // Find or create a schedule for this entry
    const targetSchedule = schedules.find(s => s.isActive)
    if (!targetSchedule) {
      toast({ title: 'Erro', description: 'Nenhuma escala ativa encontrada', variant: 'destructive' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch(`/api/hr/schedules/${targetSchedule.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar turno')
      }

      toast({ title: 'Turno criado com sucesso' })
      setDialogOpen(false)
      setNewEntry({ userId: '', date: '', shiftType: 'MORNING', startTime: '', endTime: '' })
      fetchEntries()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Group entries by user
  const uniqueUsers = Array.from(new Map(entries.map(e => [e.userId, e.user])).values())

  const getEntriesForUserAndDay = (userId: string, dayIndex: number) => {
    const dayDate = format(weekDays[dayIndex], 'yyyy-MM-dd')
    return entries.filter(e => e.userId === userId && e.date.startsWith(dayDate))
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const totalHours = entries.reduce((acc, e) => {
    if (e.startTime && e.endTime) {
      const start = parseInt(e.startTime.split(':')[0])
      const end = parseInt(e.endTime.split(':')[0])
      return acc + (end - start)
    }
    // Default hours per shift type
    const defaultHours: Record<string, number> = {
      MORNING: 4, AFTERNOON: 4, NIGHT: 6, FULL_DAY: 8, ON_CALL: 12
    }
    return acc + (defaultHours[e.shiftType] || 4)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escalas de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie os horários e escalas da equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Semana
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Turno
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <p className="font-medium">
                  {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(currentWeek, 'yyyy')}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setCurrentWeek(new Date())}>
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por escala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as escalas</SelectItem>
                  {schedules.map(schedule => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(SHIFT_TYPES).map(([type, config]) => (
          <Badge key={type} variant="outline" className={config.color}>
            {config.label}
          </Badge>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {entries.length === 0 && schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma escala ativa encontrada</p>
              <p className="text-sm">Crie uma escala primeiro em Configurações &gt; Escalas</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum turno cadastrado para esta semana</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Turno
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-8 border-b">
                  <div className="p-4 border-r bg-muted/30">
                    <span className="text-sm font-medium">Profissional</span>
                  </div>
                  {weekDays.map((day, i) => (
                    <div 
                      key={i} 
                      className={`p-4 text-center border-r last:border-r-0 ${
                        format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                          ? 'bg-primary/10' 
                          : ''
                      }`}
                    >
                      <p className="text-sm font-medium">{DAYS[i]}</p>
                      <p className="text-2xl font-bold">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>

                {/* Schedule Rows */}
                <div className="divide-y">
                  {uniqueUsers.map(user => (
                    <div key={user.id} className="grid grid-cols-8">
                      <div className="p-4 border-r bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                      </div>
                      {weekDays.map((_, dayIndex) => {
                        const dayEntries = getEntriesForUserAndDay(user.id, dayIndex)
                        return (
                          <div 
                            key={dayIndex} 
                            className="p-2 border-r last:border-r-0 min-h-[100px] hover:bg-muted/20 transition-colors"
                          >
                            {dayEntries.map(entry => (
                              <div 
                                key={entry.id}
                                className={`p-2 rounded text-xs mb-1 ${SHIFT_TYPES[entry.shiftType]?.color || 'bg-gray-100'}`}
                              >
                                <p className="font-medium">
                                  {entry.startTime && entry.endTime 
                                    ? `${entry.startTime} - ${entry.endTime}`
                                    : SHIFT_TYPES[entry.shiftType]?.label
                                  }
                                </p>
                                <p>{SHIFT_TYPES[entry.shiftType]?.label}</p>
                              </div>
                            ))}
                            {dayEntries.length === 0 && (
                              <div className="h-full flex items-center justify-center">
                                <Button variant="ghost" size="sm" className="text-muted-foreground">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Horas</p>
                <p className="text-2xl font-bold">{totalHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profissionais</p>
                <p className="text-2xl font-bold">{uniqueUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Turnos</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog - Novo Turno */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Turno</DialogTitle>
            <DialogDescription>
              Adicione um turno à escala
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select 
                value={newEntry.userId} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, userId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                type="date" 
                value={newEntry.date}
                onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Turno</Label>
              <Select 
                value={newEntry.shiftType} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, shiftType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHIFT_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora Início (opcional)</Label>
                <Input 
                  type="time" 
                  value={newEntry.startTime}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fim (opcional)</Label>
                <Input 
                  type="time" 
                  value={newEntry.endTime}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEntry} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
