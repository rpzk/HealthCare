'use client'

import { useState } from 'react'
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Copy
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from '@/hooks/use-toast'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduleEntry {
  id: string
  staffId: string
  staffName: string
  role: string
  day: number // 0-6
  startTime: string
  endTime: string
  type: 'regular' | 'overtime' | 'on-call'
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

const SHIFT_TYPES = {
  regular: { label: 'Regular', color: 'bg-blue-100 text-blue-800' },
  overtime: { label: 'Extra', color: 'bg-orange-100 text-orange-800' },
  'on-call': { label: 'Plantão', color: 'bg-purple-100 text-purple-800' },
}

export default function HRSchedulesPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [view, setView] = useState<'week' | 'day'>('week')
  
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([
    { id: '1', staffId: '1', staffName: 'Dr. João Santos', role: 'Médico', day: 1, startTime: '08:00', endTime: '12:00', type: 'regular' },
    { id: '2', staffId: '1', staffName: 'Dr. João Santos', role: 'Médico', day: 1, startTime: '14:00', endTime: '18:00', type: 'regular' },
    { id: '3', staffId: '1', staffName: 'Dr. João Santos', role: 'Médico', day: 3, startTime: '08:00', endTime: '18:00', type: 'regular' },
    { id: '4', staffId: '2', staffName: 'Dra. Ana Costa', role: 'Médica', day: 2, startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '5', staffId: '2', staffName: 'Dra. Ana Costa', role: 'Médica', day: 4, startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '6', staffId: '3', staffName: 'Enf. Maria Silva', role: 'Enfermeira', day: 0, startTime: '07:00', endTime: '19:00', type: 'on-call' },
  ])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getSchedulesForDay = (day: number) => {
    return schedules.filter(s => 
      s.day === day && 
      (selectedStaff === 'all' || s.staffId === selectedStaff)
    )
  }

  const uniqueStaff = Array.from(new Set(schedules.map(s => s.staffId)))
    .map(id => schedules.find(s => s.staffId === id))
    .filter(Boolean)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copiar Semana
          </Button>
          <Button>
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
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {uniqueStaff.map(staff => (
                    <SelectItem key={staff?.staffId} value={staff?.staffId || ''}>
                      {staff?.staffName}
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
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-4 border-r bg-muted/30">
                  <span className="text-sm font-medium">Horário</span>
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
                {uniqueStaff.filter(s => selectedStaff === 'all' || s?.staffId === selectedStaff).map(staff => (
                  <div key={staff?.staffId} className="grid grid-cols-8">
                    <div className="p-4 border-r bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(staff?.staffName || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{staff?.staffName}</p>
                          <p className="text-xs text-muted-foreground">{staff?.role}</p>
                        </div>
                      </div>
                    </div>
                    {weekDays.map((_, dayIndex) => {
                      const daySchedules = schedules.filter(
                        s => s.staffId === staff?.staffId && s.day === dayIndex
                      )
                      return (
                        <div 
                          key={dayIndex} 
                          className="p-2 border-r last:border-r-0 min-h-[100px] hover:bg-muted/20 transition-colors"
                        >
                          {daySchedules.map(schedule => (
                            <div 
                              key={schedule.id}
                              className={`p-2 rounded text-xs mb-1 ${SHIFT_TYPES[schedule.type].color}`}
                            >
                              <p className="font-medium">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                              <p>{SHIFT_TYPES[schedule.type].label}</p>
                            </div>
                          ))}
                          {daySchedules.length === 0 && (
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
                <p className="text-2xl font-bold">
                  {schedules.reduce((acc, s) => {
                    const start = parseInt(s.startTime.split(':')[0])
                    const end = parseInt(s.endTime.split(':')[0])
                    return acc + (end - start)
                  }, 0)}h
                </p>
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
                <p className="text-2xl font-bold">{uniqueStaff.length}</p>
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
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
