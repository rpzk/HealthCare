"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { Clock, Save } from 'lucide-react'

const DAYS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
]

export function ScheduleConfig() {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<any[]>([])

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule')
      const json = await res.json()
      
      // Initialize empty days if not present
      const fullSchedule = DAYS.map((day, index) => {
        const existing = json.find((s: any) => s.dayOfWeek === index)
        return existing || {
          dayOfWeek: index,
          startTime: '08:00',
          endTime: '18:00',
          slotDuration: 30,
          active: !!existing // Helper flag for UI
        }
      })
      
      setSchedule(fullSchedule)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Filter only active days to save
      const toSave = schedule
        .filter(s => s.active)
        .map(({ active, ...rest }) => rest)

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave)
      })

      if (!res.ok) throw new Error('Failed to save')
      
      toast({ title: 'Sucesso', description: 'Agenda atualizada.' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar agenda.', variant: 'destructive' })
    }
  }

  const updateDay = (index: number, field: string, value: any) => {
    const newSchedule = [...schedule]
    newSchedule[index] = { ...newSchedule[index], [field]: value }
    setSchedule(newSchedule)
  }

  if (loading) return <div>Carregando agenda...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configuração de Horários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {schedule.map((day, index) => (
          <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="w-32 flex items-center gap-2">
              <Switch 
                checked={day.active}
                onCheckedChange={(checked: boolean) => updateDay(index, 'active', checked)}
              />
              <span className={day.active ? 'font-medium' : 'text-gray-400'}>{DAYS[index]}</span>
            </div>
            
            {day.active && (
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <Label>Início</Label>
                  <Input 
                    type="time" 
                    value={day.startTime}
                    onChange={(e) => updateDay(index, 'startTime', e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Fim</Label>
                  <Input 
                    type="time" 
                    value={day.endTime}
                    onChange={(e) => updateDay(index, 'endTime', e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Duração (min)</Label>
                  <Input 
                    type="number" 
                    value={day.slotDuration}
                    onChange={(e) => updateDay(index, 'slotDuration', parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
