'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'

function AuthErrorInner() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') ?? null

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Login falhou. Verifique os detalhes fornecidos.'
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
      case 'SessionRequired':
        return 'Você precisa estar logado para acessar esta página.'
      default:
        return 'Ocorreu um erro inesperado durante a autenticação.'
    }
  }

  return (
    <AuthCard
      title="Erro de Autenticação"
      description={getErrorMessage(error)}
      variant="error"
    >
      <div className="space-y-4">
        <Link href="/auth/signin">
          <Button className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </Link>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Ir para página inicial
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando…</div>}>
      <AuthErrorInner />
    </Suspense>
  )
}
