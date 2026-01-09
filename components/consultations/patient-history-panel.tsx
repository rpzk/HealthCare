"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  History, 
  Pill, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  Copy,
  Loader2,
  AlertCircle,
  Stethoscope
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PastConsultation {
  id: string
  date: string
  type: string
  doctor: string
  diagnosis?: string
  notes?: string
}

interface PastPrescription {
  id: string
  date: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  doctor: string
}

interface PatientHistoryProps {
  patientId: string
  onRepeatPrescription?: (prescription: PastPrescription) => void
}

export function PatientHistoryPanel({ patientId, onRepeatPrescription }: PatientHistoryProps) {
  const [consultations, setConsultations] = useState<PastConsultation[]>([])
  const [prescriptions, setPrescriptions] = useState<PastPrescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consultationsOpen, setConsultationsOpen] = useState(true)
  const [prescriptionsOpen, setPrescriptionsOpen] = useState(true)

  useEffect(() => {
    if (patientId) {
      loadHistory()
    }
  }, [patientId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      // Consultas anteriores do paciente (usa filtros existentes ao invés de rota inexistente)
      const consultRes = await fetch(`/api/consultations?patientId=${patientId}&limit=5`)
      if (consultRes.ok) {
        const consultData = await consultRes.json()
        const parsed = (consultData.consultations || consultData.data || []) as any[]
        const mapped: PastConsultation[] = parsed.map((c) => ({
          id: c.id,
          date: c.scheduledDate || c.date || c.createdAt,
          type: c.type || '',
          doctor: c.doctor?.name || '',
          diagnosis: c.chiefComplaint || c.diagnosis || undefined,
          notes: c.notes || undefined,
        }))
        setConsultations(mapped)
      } else {
        setError('Não foi possível carregar as consultas anteriores')
        console.error('Falha ao buscar consultas do paciente', consultRes.status, consultRes.statusText)
      }

      // Prescrições anteriores do paciente (usa rota principal com filtro por patientId)
      const prescRes = await fetch(`/api/prescriptions?patientId=${patientId}&limit=10`)
      if (prescRes.ok) {
        const prescData = await prescRes.json()
        const parsed = (prescData.prescriptions || prescData.data || []) as any[]
        const mapped: PastPrescription[] = parsed.map((p) => {
          const med = p.medications?.[0] || {}
          return {
            id: p.id,
            date: p.startDate || p.createdAt,
            medication: med.name || p.medication || '',
            dosage: med.dosage || p.dosage || '',
            frequency: med.frequency || p.frequency || '',
            duration: med.duration || p.duration || '',
            instructions: med.instructions || p.instructions || undefined,
            doctor: p.doctor?.name || '',
          }
        })
        setPrescriptions(mapped)
      } else {
        setError('Não foi possível carregar as prescrições anteriores')
        console.error('Falha ao buscar prescrições do paciente', prescRes.status, prescRes.statusText)
      }
    } catch (e) {
      setError('Erro ao carregar histórico')
      console.error('Erro ao carregar histórico:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleRepeat = (prescription: PastPrescription) => {
    if (onRepeatPrescription) {
      onRepeatPrescription(prescription)
      toast({
        title: 'Prescrição copiada',
        description: `${prescription.medication} adicionado à prescrição atual`
      })
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px] px-4">
          {/* Consultas Anteriores */}
          <Collapsible open={consultationsOpen} onOpenChange={setConsultationsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
              {consultationsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Stethoscope className="h-4 w-4" />
              Últimas Consultas ({consultations.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pb-4">
                {consultations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhuma consulta anterior</p>
                ) : (
                  consultations.map((c) => (
                    <div key={c.id} className="p-2 bg-muted/50 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {c.type || 'Consulta'}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(c.date)}
                        </span>
                      </div>
                      {c.diagnosis && (
                        <p className="font-medium text-foreground">{c.diagnosis}</p>
                      )}
                      {c.notes && (
                        <p className="text-muted-foreground line-clamp-2 mt-1">{c.notes}</p>
                      )}
                      <p className="text-muted-foreground mt-1">Dr(a). {c.doctor}</p>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-2" />

          {/* Prescrições Anteriores */}
          <Collapsible open={prescriptionsOpen} onOpenChange={setPrescriptionsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
              {prescriptionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Pill className="h-4 w-4" />
              Prescrições Anteriores ({prescriptions.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pb-4">
                {prescriptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhuma prescrição anterior</p>
                ) : (
                  prescriptions.map((p) => (
                    <div key={p.id} className="p-2 bg-muted/50 rounded-lg text-xs group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{p.medication}</p>
                          <p className="text-muted-foreground">
                            {p.dosage} • {p.frequency} • {p.duration}
                          </p>
                          {p.instructions && (
                            <p className="text-muted-foreground italic mt-1">{p.instructions}</p>
                          )}
                          <p className="text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(p.date)} • Dr(a). {p.doctor}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                          onClick={() => handleRepeat(p)}
                          title="Repetir prescrição"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Repetir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
