'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Hook que verifica se o usuário tem termos pendentes e redireciona para /terms/accept
 * Não verifica nas rotas de autenticação, termos e APIs
 */
export function useTermsEnforcement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // Ignorar se não autenticado ou ainda carregando
    if (status !== 'authenticated' || !session?.user?.id) {
      return
    }

    // Não verificar em rotas excluídas
    const excludedPaths = [
      '/auth/',
      '/terms/',
      '/api/',
      '/privacy',
      '/help',
      '/register/',
      '/invite/',
    ]

    if (excludedPaths.some((path) => pathname?.startsWith(path))) {
      return
    }

    // Já está na página de aceite
    if (pathname === '/terms/accept') {
      return
    }

    const checkTerms = async () => {
      try {
        setChecking(true)
        const res = await fetch('/api/terms/pending')
        if (!res.ok) return

        const data = await res.json()
        const pending = Array.isArray(data?.terms) ? data.terms : []

        if (pending.length > 0) {
          // Redirecionar para página de aceite com returnTo
          const returnTo = encodeURIComponent(pathname || '/')
          router.push(`/terms/accept?returnTo=${returnTo}`)
        }
      } catch (error) {
        console.error('Erro ao verificar termos pendentes:', error)
      } finally {
        setChecking(false)
      }
    }

    void checkTerms()
  }, [session, status, pathname, router])

  return { checking }
}
