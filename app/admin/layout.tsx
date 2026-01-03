'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Verificar se é admin (check simples e direto)
    const userRole = (session.user as any)?.role
    const availableRoles = (session.user as any)?.availableRoles || []
    
    const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')
    
    if (!isAdmin) {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const userRole = (session?.user as any)?.role
  const availableRoles = (session?.user as any)?.availableRoles || []
  const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')

  if (!session || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <AdminHeader />
      <AdminSidebar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
