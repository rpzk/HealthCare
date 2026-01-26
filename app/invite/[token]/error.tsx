'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Intentionally minimal: avoid leaking internal details to end users
    console.error('[invite] Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Não foi possível abrir o convite</h2>
            <p className="text-gray-600 mt-2">
              Tente atualizar a página. Se estiver abrindo pelo app do e-mail/WhatsApp, tente “Abrir no navegador”.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => reset()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>Ir para o início</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
