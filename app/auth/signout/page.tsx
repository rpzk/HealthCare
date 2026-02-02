'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { HeartPulse } from 'lucide-react'

export default function SignOut() {
  useEffect(() => {
    // Registrar logout na auditoria antes de encerrar sessão (LGPD)
    const performLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch {
        // Continuar com logout mesmo se auditoria falhar
      }
      signOut({ callbackUrl: '/auth/signin' })
    }
    performLogout()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saindo...</h1>
            <p className="text-gray-600">Aguarde enquanto fazemos seu logout</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
