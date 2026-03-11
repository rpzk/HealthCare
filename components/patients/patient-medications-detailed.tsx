'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pill, AlertTriangle, Clock, Check } from 'lucide-react'

interface PrescriptionItem {
  id: string
  medication?: {
    id: string
    name: string
    synonym?: string | null
    strength?: string | null
    form?: string | null
    componente?: string | null
    controlado?: boolean
    antimicrobiano?: boolean
    codigoCATMAT?: string | null
  } | null
  dosage: string
  frequency: string
  duration: string
  instructions?: string | null
  quantity?: number | null
}

interface Prescription {
  id: string
  createdAt: string | Date
  doctor: {
    name: string
    crmNumber: string
  }
  items: PrescriptionItem[]
  isActive?: boolean
  expiresAt?: string | Date | null
}

interface PatientMedicationsDetailedProps {
  prescriptions: Prescription[]
}

export function PatientMedicationsDetailed({ prescriptions }: PatientMedicationsDetailedProps) {
  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicações
          </CardTitle>
          <CardDescription>
            Histórico de prescrições e medicamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma prescrição registrada
          </p>
        </CardContent>
      </Card>
    )
  }

  // Consolidar medicações atuais (prescrições ativas)
  const activePrescriptions = prescriptions.filter(p => {
    if (p.isActive === false) return false
    if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false
    return true
  })

  const allActiveItems = activePrescriptions.flatMap(p => 
    (p.items ?? []).map(item => ({ ...item, prescription: p }))
  )

  return (
    <div className="space-y-4">
      {/* Medicações Atuais */}
      {allActiveItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-green-500" />
              Medicações em Uso
              <Badge variant="default" className="bg-green-500">
                {allActiveItems.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Medicamentos prescritos atualmente ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allActiveItems.map((item) => {
                const med = item.medication
                const isRENAME = !!med?.codigoCATMAT
                const medicationName = med?.name || 'Medicamento não especificado'
                
                return (
                  <div 
                    key={item.id} 
                    className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/10"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">
                            {medicationName}
                          </h4>
                          {isRENAME && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              RENAME
                            </Badge>
                          )}
                        </div>
                        
                        {med && (med.synonym || med.strength || med.form) && (
                          <div className="text-xs text-muted-foreground mb-2">
                            {med.synonym && <><span className="font-medium">Princípio Ativo:</span> {med.synonym}</>}
                            {med.strength && <span> - {med.strength}</span>}
                            {med.form && <><span> • </span><span className="font-medium">Forma:</span> {med.form}</>}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <div>
                            <span className="font-medium">Dosagem:</span>{' '}
                            {item.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequência:</span>{' '}
                            {item.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Duração:</span>{' '}
                            {item.duration}
                          </div>
                          {item.quantity && (
                            <div>
                              <span className="font-medium">Quantidade:</span>{' '}
                              {item.quantity}
                            </div>
                          )}
                        </div>

                        {item.instructions && (
                          <p className="text-sm text-muted-foreground mt-2 border-l-2 border-green-300 pl-2">
                            {item.instructions}
                          </p>
                        )}

                        {med && (med.controlado || med.antimicrobiano || med.componente) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {med.controlado && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Controlado
                              </Badge>
                            )}
                            {med.antimicrobiano && (
                              <Badge variant="default" className="text-xs bg-orange-500">
                                Antimicrobiano
                              </Badge>
                            )}
                            {med.componente && (
                              <Badge variant="secondary" className="text-xs">
                                {med.componente}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      Prescrito em {format(new Date(item.prescription.createdAt), "dd/MM/yyyy", { locale: ptBR })} por 
                      Dr(a). {item.prescription.doctor.name} (CRM {item.prescription.doctor.crmNumber})
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Prescrições */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Prescrições
            <Badge variant="outline">{prescriptions.length}</Badge>
          </CardTitle>
          <CardDescription>
            Todas as prescrições anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prescriptions.map((prescription) => {
              const isActive = activePrescriptions.some(p => p.id === prescription.id)
              
              return (
                <div 
                  key={prescription.id} 
                  className={`border rounded-lg p-3 ${isActive ? 'bg-green-50 dark:bg-green-950/10' : 'bg-muted/30'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">
                      {format(new Date(prescription.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-green-500" : ""}>
                      {isActive ? 'Ativa' : 'Finalizada'}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    Dr(a). {prescription.doctor.name} - CRM {prescription.doctor.crmNumber}
                  </div>

                  <div className="space-y-1.5">
                    {prescription.items.map((item, idx) => {
                      const medName = item.medication?.name || 'Medicamento não especificado'
                      
                      return (
                        <div key={item.id} className="text-sm pl-3 border-l-2 border-muted">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{idx + 1}.</span>
                            <span>{medName}</span>
                            {item.medication?.controlado && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground ml-4">
                            {item.dosage} • {item.frequency} • {item.duration}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
