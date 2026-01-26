/**
 * Exemplo: Componente de assinatura de certificados médicos
 * 
 * Demonstra como assinar documentos
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileSignature } from 'lucide-react'
import { logger } from '@/lib/logger'

interface CertificateSignatureExampleProps {
  certificateId: string
  certificateNumber: string
  patientName: string
}

export function CertificateSignatureExample({
  certificateId,
  certificateNumber,
  patientName
}: CertificateSignatureExampleProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Assinatura</CardTitle>
        <CardDescription>
          Assine este atestado médico
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-blue-900">Assinatura PKI-Local</h4>
            <p className="text-sm text-blue-800 mt-1">
              Assinatura para testes e desenvolvimento
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-blue-300 space-y-2 text-sm">
            <p><strong>Certificado ID:</strong> {certificateId}</p>
            <p><strong>Número:</strong> {certificateNumber}</p>
            <p><strong>Paciente:</strong> {patientName}</p>
          </div>

          <Button
            onClick={() => logger.info('Assinar certificado:', certificateId)}
            className="w-full"
          >
            <FileSignature className="mr-2 h-4 w-4" />
            Assinar Certificado
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            💡 Para implementar assinatura com certificado ICP-Brasil,
            integre com o provedor de certificação de sua escolha.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
