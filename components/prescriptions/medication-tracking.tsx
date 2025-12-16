'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Calendar, Pill, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MedicationTime {
  id: string
  prescriptionItemId: string
  medicationName: string
  dosage: string
  scheduledTime: string
  isTaken: boolean
  notes?: string
}

interface MedicationTrackingProps {
  prescriptionId: string
}

export function MedicationTracking({ prescriptionId }: MedicationTrackingProps) {
  const [medications, setMedications] = useState<MedicationTime[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetchMedications()
  }, [prescriptionId])

  const fetchMedications = async () => {
    try {
      const res = await fetch(`/api/medications/tracking?prescriptionId=${prescriptionId}`)
      if (!res.ok) throw new Error('Erro ao carregar medicações')
      const data = await res.json()
      setMedications(data.data)
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar medicações')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsTaken = async (itemId: string, notes?: string) => {
    setSubmitting(itemId)
    try {
      const res = await fetch('/api/medications/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionItemId: itemId,
          takenAt: new Date().toISOString(),
          dosage: medications.find(m => m.prescriptionItemId === itemId)?.dosage || '',
          notes,
          missed: false,
        }),
      })

      if (!res.ok) throw new Error('Erro ao registrar medicação')

      toast.success('Medicação registrada com sucesso!')
      // Recarregar lista
      fetchMedications()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao registrar medicação')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="w-5 h-5" />
          Rastreamento de Medicações
        </CardTitle>
        <CardDescription>Registre quando tomar seus medicamentos</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {medications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma medicação para hoje</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className={`
                  p-4 border rounded-lg transition-all
                  ${
                    med.isTaken
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{med.medicationName}</div>
                    <div className="text-sm text-gray-600">
                      Dosagem: {med.dosage}
                    </div>
                    {med.scheduledTime && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Horário: {med.scheduledTime}
                      </div>
                    )}
                  </div>

                  {med.isTaken ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Tomado
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsTaken(med.prescriptionItemId)}
                      disabled={submitting === med.prescriptionItemId}
                      variant="outline"
                    >
                      {submitting === med.prescriptionItemId ? 'Registrando...' : 'Marcar como tomado'}
                    </Button>
                  )}
                </div>

                {med.notes && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    {med.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            💡 Dica: Registre suas medicações para ajudar seu médico a monitorar sua aderência ao tratamento.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
