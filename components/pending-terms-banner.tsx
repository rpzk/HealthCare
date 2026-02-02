'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PendingTerm {
  id: string
  title: string
  version: string
}

/**
 * Banner de notificação para termos pendentes (LGPD)
 * Mostra um alerta quando há termos que precisam ser aceitos
 */
export function PendingTermsBanner() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [pendingTerms, setPendingTerms] = useState<PendingTerm[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return
    }

    // Não mostrar em páginas de termos/auth
    const excludedPaths = ['/auth/', '/terms/', '/api/']
    if (excludedPaths.some(path => pathname?.startsWith(path))) {
      return
    }

    // Verificar se já foi dismissado nesta sessão
    const dismissKey = `terms-banner-dismissed-${session.user.id}`
    if (sessionStorage.getItem(dismissKey)) {
      setDismissed(true)
      return
    }

    const fetchPendingTerms = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/terms/pending')
        if (res.ok) {
          const data = await res.json()
          setPendingTerms(data.terms || [])
        }
      } catch (error) {
        console.error('Erro ao verificar termos pendentes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingTerms()
  }, [session, status, pathname])

  const handleDismiss = () => {
    if (session?.user?.id) {
      sessionStorage.setItem(`terms-banner-dismissed-${session.user.id}`, 'true')
    }
    setDismissed(true)
  }

  if (loading || dismissed || pendingTerms.length === 0) {
    return null
  }

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <FileText className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Termos Pendentes
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-yellow-700 dark:text-yellow-300">
          {pendingTerms.length === 1 
            ? `O termo "${pendingTerms[0].title}" requer sua aceitação.`
            : `${pendingTerms.length} termos requerem sua aceitação.`
          }
        </span>
        <div className="flex items-center gap-2">
          <Link href={`/terms/accept?returnTo=${encodeURIComponent(pathname || '/')}`}>
            <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
              Revisar Termos
            </Button>
          </Link>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDismiss}
            className="text-yellow-600 hover:bg-yellow-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
