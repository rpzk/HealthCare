'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, AlertCircle } from 'lucide-react'

interface Diagnosis {
  id: string
  consultationId: string
  primaryCodeId: string
  secondaryCodeId?: string | null
  primaryCode: {
    id: string
    code: string
    description: string
  }
  secondaryCode?: {
    id: string
    code: string
    description: string
  } | null
  notes?: string | null
  severity?: string | null
  isActive: boolean
  createdAt: string | Date
}

interface Consultation {
  id: string
  scheduledDate: string | Date
  doctor: {
    name: string
    crmNumber: string
  }
  diagnoses: Diagnosis[]
}

interface PatientDiagnosesProps {
  consultations: Consultation[]
}

export function PatientDiagnoses({ consultations }: PatientDiagnosesProps) {
  // Extrair todos os diagnósticos de todas as consultas
  const allDiagnoses = consultations.flatMap(consultation => 
    (consultation.diagnoses ?? []).map(diagnosis => ({
      ...diagnosis,
      consultation
    }))
  )

  // Agrupar por CID primário (mostrar apenas ativos)
  const activeDiagnoses = allDiagnoses.filter(d => d.isActive)
  const historicalDiagnoses = allDiagnoses.filter(d => !d.isActive)

  // Extrair CIDs únicos ativos
  const uniqueActiveCIDs = Array.from(
    new Map(
      activeDiagnoses.map(d => [d.primaryCode.code, d])
    ).values()
  )

  if (allDiagnoses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Diagnósticos (CID-10)
          </CardTitle>
          <CardDescription>
            Histórico de diagnósticos e condições clínicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum diagnóstico registrado
          </p>
        </CardContent>
      </Card>
    )
  }

  const getSeverityVariant = (severity?: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!severity) return "default"
    switch (severity.toLowerCase()) {
      case 'grave':
      case 'alta':
        return "destructive"
      case 'moderada':
      case 'média':
        return "default"
      case 'leve':
      case 'baixa':
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      {/* Diagnósticos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Diagnósticos Ativos
            <Badge variant="destructive">{uniqueActiveCIDs.length}</Badge>
          </CardTitle>
          <CardDescription>
            Condições clínicas em acompanhamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uniqueActiveCIDs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum diagnóstico ativo no momento
            </p>
          ) : (
            <div className="space-y-3">
              {uniqueActiveCIDs.map((diagnosis) => (
                <div 
                  key={diagnosis.id} 
                  className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="font-mono">
                          {diagnosis.primaryCode.code}
                        </Badge>
                        {diagnosis.severity && (
                          <Badge variant={getSeverityVariant(diagnosis.severity)}>
                            {diagnosis.severity}
                          </Badge>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          <Activity className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1">
                        {diagnosis.primaryCode.description}
                      </h4>
                      {diagnosis.secondaryCode && (
                        <div className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">CID Secundário:</span>{' '}
                          <code className="text-xs bg-muted px-1 rounded">
                            {diagnosis.secondaryCode.code}
                          </code>{' '}
                          - {diagnosis.secondaryCode.description}
                        </div>
                      )}
                      {diagnosis.notes && (
                        <p className="text-sm text-muted-foreground mt-2 border-l-2 border-red-300 pl-2">
                          {diagnosis.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(diagnosis.consultation.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span>•</span>
                        <span>
                          Dr(a). {diagnosis.consultation.doctor.name} - CRM {diagnosis.consultation.doctor.crmNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Diagnósticos */}
      {historicalDiagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Histórico de Diagnósticos
              <Badge variant="outline">{historicalDiagnoses.length}</Badge>
            </CardTitle>
            <CardDescription>
              Condições clínicas anteriores (inativas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historicalDiagnoses.slice(0, 10).map((diagnosis) => (
                <div 
                  key={diagnosis.id} 
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {diagnosis.primaryCode.code}
                        </Badge>
                        {diagnosis.severity && (
                          <Badge variant="secondary" className="text-xs">
                            {diagnosis.severity}
                          </Badge>
                        )}
                      </div>
                      <h5 className="text-sm font-medium text-muted-foreground">
                        {diagnosis.primaryCode.description}
                      </h5>
                      {diagnosis.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {diagnosis.notes}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(diagnosis.consultation.scheduledDate), "dd/MM/yyyy", { locale: ptBR })} - 
                        Dr(a). {diagnosis.consultation.doctor.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {historicalDiagnoses.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {historicalDiagnoses.length - 10} diagnósticos anteriores
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
