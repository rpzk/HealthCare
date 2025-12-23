/**
 * Exemplo: Integração do Gov.br no formulário de emissão de atestados
 * 
 * Este arquivo mostra como integrar o botão de assinatura Gov.br
 * em uma página de gerenciamento de certificados.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GovBrSignatureButton } from '@/components/govbr-signature-button'

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
  const [signatureMethod, setSignatureMethod] = useState<'pki_local' | 'gov_br'>('pki_local')

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Assinatura Digital</CardTitle>
        <CardDescription>
          Escolha o método para assinar este atestado
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pki_local">
              🔐 PKI-Local
            </TabsTrigger>
            <TabsTrigger value="gov_br">
              🇧🇷 Gov.br
            </TabsTrigger>
          </TabsList>

          {/* PKI-Local (Auto-assinado) */}
          <TabsContent value="pki_local" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-blue-900">PKI-Local (Auto-assinado)</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Assinatura local rápida, reconhecimento interno apenas
                </p>
              </div>

              <div className="space-y-2 text-sm text-blue-800">
                <p>✅ Assinatura imediata</p>
                <p>✅ Sem redirecionamento externo</p>
                <p>⚠️ Reconhecimento interno apenas</p>
              </div>

              <div className="bg-white p-3 rounded border border-blue-300 space-y-2 text-sm">
                <p><strong>Certificado ID:</strong> {certificateId}</p>
                <p><strong>Número:</strong> {certificateNumber}</p>
                <p><strong>Paciente:</strong> {patientName}</p>
                <p><strong>Método:</strong> RSA 2048 + SHA-256</p>
              </div>

              <button
                onClick={() => console.log('Assinar com PKI-Local')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
              >
                Assinar com PKI-Local
              </button>
            </div>
          </TabsContent>

          {/* Gov.br (Legal Recognition) */}
          <TabsContent value="gov_br" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-green-900">Gov.br (ICP-Brasil)</h4>
                <p className="text-sm text-green-800 mt-1">
                  Assinatura digital com reconhecimento legal em todo o Brasil
                </p>
              </div>

              <div className="space-y-2 text-sm text-green-800">
                <p>✅ Reconhecimento legal total</p>
                <p>✅ Válido para Cartório e SUS</p>
                <p>✅ Segurança de nível máximo</p>
                <p>⚠️ Requer redirecionamento para Gov.br</p>
              </div>

              <div className="bg-white p-3 rounded border border-green-300 space-y-2 text-sm">
                <p><strong>Certificado ID:</strong> {certificateId}</p>
                <p><strong>Número:</strong> {certificateNumber}</p>
                <p><strong>Paciente:</strong> {patientName}</p>
                <p><strong>Método:</strong> OAuth 2.0 + Gov.br</p>
              </div>

              <GovBrSignatureButton
                certificateId={certificateId}
                onSuccess={(data) => {
                  console.log('Assinatura bem-sucedida:', data)
                  // Recarregar página ou atualizar estado
                  window.location.href = `/certificates/${certificateId}`
                }}
                onError={(error) => {
                  console.error('Erro na assinatura:', error)
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Comparação */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold text-gray-900 mb-3">Comparação de Métodos</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900">PKI-Local</p>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>⚡ Rápido</li>
                <li>🔒 Seguro (local)</li>
                <li>📱 Offline possível</li>
                <li>🏢 Interno apenas</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Gov.br</p>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>⚖️ Legal</li>
                <li>🇧🇷 Nacional</li>
                <li>🏛️ Cartório/SUS</li>
                <li>🔐 Máxima segurança</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
