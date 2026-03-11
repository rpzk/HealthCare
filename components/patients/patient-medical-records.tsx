'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Plus } from 'lucide-react'

interface MedicalRecord {
  id: string
  title: string
  description: string
  diagnosis?: string | null
  treatment?: string | null
  recordType: string
  createdAt: string | Date
  doctor: {
    name: string
    speciality?: string | null
  }
}

interface PatientMedicalRecordsProps {
  records: MedicalRecord[]
  patientId: string
}

const recordTypeLabels: Record<string, string> = {
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PRESCRIPTION: 'Prescrição',
  DIAGNOSIS: 'Diagnóstico',
  TREATMENT: 'Tratamento',
  SURGERY: 'Cirurgia',
  EMERGENCY: 'Emergência',
  FOLLOW_UP: 'Acompanhamento',
}

export function PatientMedicalRecords({ records, patientId }: PatientMedicalRecordsProps) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registros / Evoluções
          </CardTitle>
          <CardDescription>
            Anotações clínicas e evoluções (SOAP gerado por IA, documentos importados)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum registro adicional. Consultas, prescrições e exames estão nas abas específicas.
          </p>
          <Button asChild variant="outline">
            <a href={`/medical-records/new?patientId=${patientId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros / Evoluções
              <Badge variant="secondary">{records.length}</Badge>
            </CardTitle>
            <CardDescription>
              Anotações clínicas, evoluções SOAP e documentos importados
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/medical-records/new?patientId=${patientId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {records.map((record) => (
            <a
              key={record.id}
              href={`/medical-records/${record.id}`}
              className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{record.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {recordTypeLabels[record.recordType] || record.recordType}
                    </Badge>
                  </div>
                  {record.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {record.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Dr(a). {record.doctor.name}
                    {record.doctor.speciality && ` • ${record.doctor.speciality}`}
                    {' • '}
                    {format(new Date(record.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
