'use client'

import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, HeartPulse, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Credenciais inválidas. Verifique seu email e senha.'
      case 'OAuthSignin':
        return 'Erro ao fazer login com provedor externo.'
      case 'OAuthCallback':
        return 'Erro no callback do provedor de autenticação.'
      case 'OAuthCreateAccount':
        return 'Erro ao criar conta com provedor externo.'
      case 'EmailCreateAccount':
        return 'Erro ao criar conta com email.'
      case 'Callback':
        return 'Erro no callback de autenticação.'
      case 'OAuthAccountNotLinked':
        return 'Para confirmar sua identidade, faça login com a mesma conta usada originalmente.'
      case 'EmailSignin':
        return 'Erro ao enviar email de login.'
      case 'CredentialsSignin':
        return 'Login falhou. Verifique os detalhes fornecidos.'
      case 'SessionRequired':
        return 'Você precisa estar logado para acessar esta página.'
      default:
        return 'Ocorreu um erro inesperado durante a autenticação.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-red-600 rounded-full">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Erro de Autenticação</h1>
            <p className="text-gray-600 mt-2">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/auth/signin">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </Link>

          <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              Ir para página inicial
            </Link>
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <HeartPulse className="w-4 h-4" />
            <span>Sistema HealthCare</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
