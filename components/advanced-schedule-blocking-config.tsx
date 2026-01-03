'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShiftTemplates } from '@/components/schedule-shift-templates'
import { BulkDateUpload } from '@/components/bulk-date-upload'
import { CalendarDatePicker } from '@/components/calendar-date-picker'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

interface ScheduleException {
  id: string
  date: string
  blockType: string
  reason?: string
  createdAt: string
}

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

export function AdvancedScheduleBlockingConfig() {
  const { data: session } = useSession()
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectedShift, setSelectedShift] = useState<ShiftTemplate | undefined>()
  const [saving, setSaving] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleBulkAdd = async () => {
    if (selectedDates.length === 0) {
      toast.error('Selecione pelo menos uma data')
      return
    }

    if (!selectedShift) {
      toast.error('Selecione um turno')
      return
    }

    try {
      setSaving(true)
      let successCount = 0
      let failCount = 0

      for (const dateStr of selectedDates) {
        const date = new Date(dateStr)
        const startDate = new Date(date)
        const endDate = new Date(date)

        // Parse times from shift template
        const [startHour, startMin] = selectedShift.startTime.split(':').map(Number)
        const [endHour, endMin] = selectedShift.endTime.split(':').map(Number)

        startDate.setHours(startHour, startMin, 0, 0)
        endDate.setHours(endHour, endMin, 0, 0)

        // Handle overnight shifts
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1)
        }

        try {
          const response = await fetch('/api/schedules/exceptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              blockType: 'ON_CALL',
              reason: selectedShift.name,
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      setSuccessCount(successCount)

      if (successCount > 0) {
        toast.success(`${successCount} plantão(õ)es adicionado(s) com sucesso!`)
        setSelectedDates([])
        await loadExceptions()
      }

      if (failCount > 0) {
        toast.warning(`${failCount} data(s) falharam. Verifique dados duplicados.`)
      }
    } catch (error) {
      console.error('Error adding blocks:', error)
      toast.error('Erro ao adicionar bloqueios')
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

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Agendamento de Plantões em Lote
          </CardTitle>
          <CardDescription>
            Adicione múltiplos plantões rapidamente. Selecione datas, escolha um turno e adicione tudo de uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {successCount > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>{successCount} plantão(ões) adicionado(s)</strong> com sucesso! Você pode continuar adicionando mais.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
              <TabsTrigger value="upload">Importar</TabsTrigger>
              <TabsTrigger value="details">Resumo</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <CalendarDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                onClear={() => setSelectedDates([])}
              />
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <BulkDateUpload
                onDatesLoaded={(dates) => {
                  setSelectedDates(dates)
                  toast.success(`${dates.length} data(s) importada(s)`)
                }}
              />
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Datas Selecionadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma data selecionada</p>
                    </div>
                  ) : (
                    <div>
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{selectedDates.length} data(s)</strong> será(ão) bloqueada(s)
                        </AlertDescription>
                      </Alert>
                      <div className="max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                          {selectedDates.map((date) => (
                            <div
                              key={date}
                              className="bg-blue-100 border border-blue-300 rounded px-2 py-1 text-xs font-medium text-center"
                            >
                              {new Date(date).toLocaleDateString('pt-BR')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <ShiftTemplates selectedShift={selectedShift} onSelectShift={setSelectedShift} />

          <div className="space-y-2">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedDates.length > 0 && selectedShift ? (
                  <>
                    <strong>Pronto para adicionar:</strong> {selectedDates.length} plantão(ões) de{' '}
                    <strong>{selectedShift.startTime} às {selectedShift.endTime}</strong>
                  </>
                ) : (
                  <>
                    {!selectedShift && <strong>Selecione um turno</strong>}
                    {selectedDates.length === 0 && <strong>Selecione pelo menos uma data</strong>}
                  </>
                )}
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleBulkAdd}
              disabled={selectedDates.length === 0 || !selectedShift || saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando {selectedDates.length} plantão(ões)...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Adicionar {selectedDates.length > 0 && `${selectedDates.length}`} Plantão(ões)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing blocks summary */}
      <Card>
        <CardHeader>
          <CardTitle>Plantões Registrados ({exceptions.length})</CardTitle>
          <CardDescription>
            Seus bloqueios de agenda atuais. Use a aba anterior para adicionar mais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum plantão registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Últimos plantões adicionados:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {exceptions.slice(0, 12).map((exc) => (
                  <div
                    key={exc.id}
                    className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs"
                  >
                    {new Date(exc.date).toLocaleDateString('pt-BR')}
                  </div>
                ))}
                {exceptions.length > 12 && (
                  <div className="bg-gray-200 border border-gray-400 rounded px-2 py-1 text-xs font-semibold flex items-center justify-center">
                    +{exceptions.length - 12}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
