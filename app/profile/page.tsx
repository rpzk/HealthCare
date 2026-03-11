'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * Redireciona /profile para /settings (unificado).
 * Preserva ?force2fa=true como ?tab=security&force2fa=true
 */
export default function ProfileRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const force2fa = searchParams?.get('force2fa') === 'true'
    const tab = force2fa ? 'security' : 'profile'
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (force2fa) params.set('force2fa', 'true')
    router.replace(`/settings?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
