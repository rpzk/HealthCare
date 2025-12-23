/**
 * Página: Sucesso na Assinatura com Gov.br
 */

import { Suspense } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function SuccessContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Assinatura Realizada!
        </h1>

        {/* Mensagem */}
        <p className="text-center text-gray-600 mb-6">
          Seu documento foi assinado com sucesso utilizando Gov.br
        </p>

        {/* Detalhes da assinatura */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Método:</span>
            <span className="font-semibold text-gray-900">Gov.br OAuth 2.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Algoritmo:</span>
            <span className="font-semibold text-gray-900">SHA-256</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Data/Hora:</span>
            <span className="font-semibold text-gray-900">
              {new Date().toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Próximos passos:</strong> Você pode agora baixar, compartilhar ou validar seu documento assinado.
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-3">
          <Link href="/certificates" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Ver Atestados
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-6">
          🔒 Assinatura realizada com segurança através da plataforma Gov.br
        </p>
      </div>
    </div>
  )
}

export default function GovBrSuccessPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  )
}