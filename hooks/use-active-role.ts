'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Helper para ler cookies no cliente
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

export function useActiveRole() {
  const { data: session, status } = useSession()
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    // Primeiro tentar ler do cookie
    const cookieRole = getCookie('active_role')
    
    if (cookieRole) {
      setActiveRole(cookieRole)
    } else if (session?.user?.role) {
      // Fallback para o papel da sessão
      setActiveRole(session.user.role as string)
    }
    
    setIsLoading(false)
  }, [session, status])

  return {
    activeRole,
    sessionRole: session?.user?.role as string | undefined,
    isLoading: status === 'loading' || isLoading
  }
}
