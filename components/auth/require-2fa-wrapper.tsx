'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle } from 'lucide-react'

interface Require2FAWrapperProps {
  children: React.ReactNode
  roles?: string[] // Roles que exigem 2FA (default: ADMIN, DOCTOR)
}

/**
 * Wrapper que verifica se o usuário precisa configurar 2FA obrigatório
 * antes de acessar a página protegida
 */
export function Require2FAWrapper({ 
  children, 
  roles = ['ADMIN', 'DOCTOR'] 
}: Require2FAWrapperProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [requires2FA, setRequires2FA] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const userRole = session.user.role
    const twoFactorEnabled = (session.user as any)?.twoFactorEnabled

    // Verificar se a role do usuário exige 2FA
    if (roles.includes(userRole)) {
      if (!twoFactorEnabled) {
        setRequires2FA(true)
      }
    }

    setChecking(false)
  }, [session, status, roles, router])

  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full border-orange-500">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-orange-100 dark:bg-orange-950 rounded-full">
                <AlertTriangle className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">
                  Autenticação em Dois Fatores Obrigatória
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Para garantir a segurança do sistema e proteger os dados dos pacientes, 
                  {session?.user.role === 'ADMIN' && ' administradores'}
                  {session?.user.role === 'DOCTOR' && ' médicos'}
                  {' '}devem habilitar a autenticação em dois fatores (2FA).
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta é uma medida de segurança essencial que adiciona uma camada extra 
                  de proteção à sua conta.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  size="lg"
                  onClick={() => router.push('/profile?force2fa=true')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-5 w-5" />
                  Configurar 2FA Agora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  Voltar ao Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Você precisará de um aplicativo autenticador (Google Authenticator, Authy, etc.)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
