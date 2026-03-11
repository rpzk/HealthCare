'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Download, ExternalLink } from 'lucide-react'

interface MedicalCertificate {
  id: string
  sequenceNumber: number
  year: number
  type: string
  days?: number | null
  startDate: string | Date
  endDate?: string | Date | null
  title: string
  content: string
  issuedAt: string | Date
  revokedAt?: string | Date | null
  doctor: {
    name: string
    crmNumber?: string | null
    speciality?: string | null
  }
  consultation?: {
    id: string
    scheduledDate: string | Date
  } | null
}

interface PatientCertificatesProps {
  certificates: MedicalCertificate[]
  patientId: string
}

const typeLabels: Record<string, string> = {
  MEDICAL_LEAVE: 'Afastamento',
  MEDICAL_CERTIFICATE: 'Atestado médico',
  ACCOMPANIMENT: 'Acompanhamento',
  DECLARATION: 'Declaração',
  OTHER: 'Outro',
}

export function PatientCertificates({ certificates, patientId }: PatientCertificatesProps) {
  const activeCertificates = certificates.filter(c => !c.revokedAt)

  if (certificates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Atestados
          </CardTitle>
          <CardDescription>
            Atestados médicos emitidos para o paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum atestado emitido
          </p>
          <Button asChild variant="outline">
            <a href={`/certificates?patientId=${patientId}&tab=create`}>
              <FileText className="h-4 w-4 mr-2" />
              Emitir Atestado
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
              Atestados
              <Badge variant="secondary">{certificates.length}</Badge>
            </CardTitle>
            <CardDescription>
              Atestados médicos emitidos para o paciente
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/certificates?patientId=${patientId}&tab=create`}>
              <FileText className="h-4 w-4 mr-2" />
              Novo
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {cert.title} nº {String(cert.sequenceNumber).padStart(3, '0')}/{cert.year}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[cert.type] || cert.type}
                    </Badge>
                    {cert.revokedAt && (
                      <Badge variant="destructive">Revogado</Badge>
                    )}
                    {cert.days && (
                      <span className="text-sm text-muted-foreground">
                        {cert.days} dia(s)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dr(a). {cert.doctor.name}
                    {cert.doctor.speciality && ` • ${cert.doctor.speciality}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Emitido em {format(new Date(cert.issuedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {cert.startDate && cert.endDate && (
                      <> • Válido: {format(new Date(cert.startDate), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(cert.endDate), 'dd/MM/yyyy', { locale: ptBR })}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/certificates/validate/${cert.sequenceNumber}/${cert.year}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
