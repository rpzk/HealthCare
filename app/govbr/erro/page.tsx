/**
 * Página: Erro na Assinatura com Gov.br
 */

import { Suspense } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function ErrorContent() {
  const errorMessages: Record<string, string> = {
    'access_denied': 'Acesso negado. Você precisa autorizar para continuar.',
    'invalid_scope': 'Escopo inválido solicitado.',
    'server_error': 'Erro no servidor do Gov.br. Tente novamente mais tarde.',
    'temporarily_unavailable': 'Serviço temporariamente indisponível.',
    'invalid_request': 'Requisição inválida.',
    'unauthorized_client': 'Cliente não autorizado.',
    'unsupported_response_type': 'Tipo de resposta não suportado.',
    'invalid_grant': 'Código de autorização inválido ou expirado.'
  }

  const displayError = 'UNKNOWN_ERROR'
  const displayDescription = 'Ocorreu um erro desconhecido durante o processo de assinatura.'

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Ícone de erro */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-4">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Erro na Assinatura
        </h1>

        {/* Código de erro */}
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Código de Erro</p>
          <p className="font-mono text-sm text-red-700 break-all">{displayError}</p>
        </div>

        {/* Descrição do erro */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-900">
            <strong>Detalhes:</strong> {displayDescription}
          </p>
        </div>

        {/* Troubleshooting */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">O que fazer:</p>
          <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
            <li>Verifique sua conexão com a internet</li>
            <li>Tente novamente em alguns minutos</li>
            <li>Certifique-se de estar autenticado no Gov.br</li>
            <li>Verifique permissões do navegador</li>
          </ul>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-3">
          <Link href="/certificates" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Voltar aos Atestados
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </Link>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            Precisa de ajuda? Contate o suporte técnico com o código de erro acima.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function GovBrErrorPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
