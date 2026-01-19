'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { FileText, Calendar, Clock, Download, QrCode, Loader2, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { A1SignButton } from '@/components/a1-sign-button'

interface CertificatesListProps {
  patientId?: string
  doctorId?: string
  onCertificateClick?: (certificate: any) => void
}

export function CertificatesList({ patientId, doctorId, onCertificateClick }: CertificatesListProps) {
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (patientId) params.set('patientId', patientId)
      if (doctorId) params.set('doctorId', doctorId)

      const response = await fetch(`/api/certificates?${params}`)
      const data = await response.json()

      if (data.certificates) {
        setCertificates(data.certificates)
      }
    } catch (error) {
      console.error('[Certificates] Erro ao carregar:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os atestados',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [doctorId, patientId])

  useEffect(() => {
    void loadCertificates()
  }, [loadCertificates])

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      MEDICAL_LEAVE: 'Afastamento',
      FITNESS: 'Aptidão Física',
      ACCOMPANIMENT: 'Acompanhante',
      TIME_OFF: 'Comparecimento',
      CUSTOM: 'Personalizado'
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      MEDICAL_LEAVE: 'bg-red-100 text-red-700',
      FITNESS: 'bg-green-100 text-green-700',
      ACCOMPANIMENT: 'bg-blue-100 text-blue-700',
      TIME_OFF: 'bg-gray-100 text-gray-700',
      CUSTOM: 'bg-purple-100 text-purple-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-500">Carregando atestados...</span>
      </Card>
    )
  }

  if (certificates.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum atestado emitido</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {certificates.map((cert) => (
        <Card
          key={cert.id}
          className={`p-4 ${cert.revokedAt ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'} transition-shadow cursor-pointer`}
          onClick={() => onCertificateClick?.(cert)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <FileText className={`w-5 h-5 ${cert.revokedAt ? 'text-gray-400' : 'text-blue-600'}`} />
                <h3 className="font-semibold text-gray-900">
                  Nº {cert.sequenceNumber.toString().padStart(6, '0')}/{cert.year}
                </h3>
                <Badge className={getTypeBadgeColor(cert.type)}>
                  {getTypeLabel(cert.type)}
                </Badge>
                {cert.revokedAt && (
                  <Badge className="bg-red-100 text-red-700">
                    <Ban className="w-3 h-3 mr-1" />
                    REVOGADO
                  </Badge>
                )}
              </div>

              {/* Patient/Doctor Info */}
              <div className="text-sm text-gray-600 space-y-1">
                {cert.patient && (
                  <p>
                    <strong>Paciente:</strong> {cert.patient.name}
                  </p>
                )}
                {cert.doctor && (
                  <p>
                    <strong>Médico:</strong> {cert.doctor.name} - CRM {cert.doctor.crmNumber}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(cert.startDate), 'dd/MM/yyyy')}
                  {cert.endDate && (
                    <> até {format(new Date(cert.endDate), 'dd/MM/yyyy')}</>
                  )}
                </span>
                {cert.days && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {cert.days} {cert.days === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </div>

              {/* CID */}
              {cert.includeCid && cert.cidCode && (
                <div className="mt-2 text-sm">
                  <Badge variant="outline" className="text-xs">
                    CID-10: {cert.cidCode}
                    {cert.cidDescription && ` - ${cert.cidDescription}`}
                  </Badge>
                </div>
              )}

              {/* Content Preview */}
              <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                {cert.content}
              </p>

              {/* Issued Date */}
              <p className="mt-2 text-xs text-gray-500">
                Emitido em {format(new Date(cert.issuedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>

              {/* Revoked Info */}
              {cert.revokedAt && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Revogado em:</strong> {format(new Date(cert.revokedAt), 'dd/MM/yyyy HH:mm')}
                  {cert.revokedReason && (
                    <><br /><strong>Motivo:</strong> {cert.revokedReason}</>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {!cert.revokedAt && (
              <div className="flex flex-col gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/certificates/${cert.id}/pdf`);
                        if (!res.ok) throw new Error('Falha ao gerar PDF');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `atestado_${cert.sequenceNumber}_${cert.year}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Baixar PDF
                  </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (cert.qrCodeData) {
                      window.open(cert.qrCodeData, '_blank')
                    }
                  }}
                >
                  <QrCode className="w-4 h-4 mr-1" />
                  QR Code
                </Button>
                {/* Assinatura ICP-Brasil A1 se ainda não assinado */}
                {(!cert.signature || cert.signatureMethod !== 'ICP_BRASIL') && (
                  <A1SignButton
                    certificateId={cert.id}
                    onSuccess={() => {
                      // reload list after successful signing
                      loadCertificates()
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
