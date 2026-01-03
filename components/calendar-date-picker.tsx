'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarDatePickerProps {
  selectedDates: string[]
  onDatesChange: (dates: string[]) => void
  onClear: () => void
}

export function CalendarDatePicker({ selectedDates, onDatesChange, onClear }: CalendarDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week and pad with previous month days
  const firstDay = daysInMonth[0]
  const lastDay = daysInMonth[daysInMonth.length - 1]
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  const allDays = eachDayOfInterval({ start: startDate, end: endDate })

  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const newDates = selectedDates.includes(dateStr)
      ? selectedDates.filter((d) => d !== dateStr)
      : [...selectedDates, dateStr]
    onDatesChange(newDates.sort())
  }

  const selectWeekdays = () => {
    const newDates = [...selectedDates]
    daysInMonth.forEach((day) => {
      const dayOfWeek = day.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Exclude Saturday (6) and Sunday (0)
        const dateStr = format(day, 'yyyy-MM-dd')
        if (!newDates.includes(dateStr)) {
          newDates.push(dateStr)
        }
      }
    })
    onDatesChange(newDates.sort())
  }

  const selectWeekends = () => {
    const newDates = [...selectedDates]
    daysInMonth.forEach((day) => {
      const dayOfWeek = day.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dateStr = format(day, 'yyyy-MM-dd')
        if (!newDates.includes(dateStr)) {
          newDates.push(dateStr)
        }
      }
    })
    onDatesChange(newDates.sort())
  }

  const selectEntireMonth = () => {
    const newDates = [...selectedDates]
    daysInMonth.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      if (!newDates.includes(dateStr)) {
        newDates.push(dateStr)
      }
    })
    onDatesChange(newDates.sort())
  }

  const weekdaysCount = useMemo(() => {
    return selectedDates.filter((dateStr) => {
      const date = parseISO(dateStr)
      const dayOfWeek = date.getDay()
      return dayOfWeek !== 0 && dayOfWeek !== 6
    }).length
  }, [selectedDates])

  const weekendCount = useMemo(() => {
    return selectedDates.filter((dateStr) => {
      const date = parseISO(dateStr)
      const dayOfWeek = date.getDay()
      return dayOfWeek === 0 || dayOfWeek === 6
    }).length
  }, [selectedDates])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Seletor de Datas
        </CardTitle>
        <CardDescription>
          Clique nos dias para selecioná-los. Use os atalhos para seleção rápida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick select buttons */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="outline" size="sm" onClick={selectWeekdays}>
            Dias Úteis
          </Button>
          <Button variant="outline" size="sm" onClick={selectWeekends}>
            Fins de Semana
          </Button>
          <Button variant="outline" size="sm" onClick={selectEntireMonth}>
            Mês Inteiro
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            Limpar
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{selectedDates.length}</strong> data(s) selecionada(s)
            {weekdaysCount > 0 && ` · ${weekdaysCount} dia(s) útil(is)`}
            {weekendCount > 0 && ` · ${weekendCount} dia(s) fim de semana`}
          </AlertDescription>
        </Alert>

        {/* Month navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar */}
        <div className="space-y-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDates.includes(format(day, 'yyyy-MM-dd'))
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <button
                  key={format(day, 'yyyy-MM-dd')}
                  onClick={() => toggleDate(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    aspect-square rounded text-xs font-medium transition-all
                    ${!isCurrentMonth && 'opacity-20 cursor-not-allowed'}
                    ${isSelected
                      ? 'bg-blue-600 text-white border-2 border-blue-700 font-bold'
                      : isWeekend
                        ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        : 'bg-white border border-gray-200 hover:bg-blue-50'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
            <span>Dia útil não selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded" />
            <span>Fim de semana não selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded" />
            <span>Data selecionada</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
