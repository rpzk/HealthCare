'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { DevelopmentAnalytics } from '@/components/hr/development-analytics'

export default function DevelopmentAnalyticsPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user has manager role
  const allowedRoles = ['ADMIN', 'MANAGER', 'DOCTOR', 'NURSE']
  if (!allowedRoles.includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-32">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="max-w-2xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
              <p className="text-gray-600">
                Esta página é restrita a gestores e profissionais de saúde.
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Analytics de Desenvolvimento"
            description="Visão agregada do desenvolvimento humano na organização"
            breadcrumbs={[
              { label: 'Desenvolvimento', href: '/development' },
              { label: 'Analytics' }
            ]}
            showBackButton={true}
            showHomeButton={true}
          />
          <div className="mt-6">
            <DevelopmentAnalytics />
          </div>
        </main>
      </div>
    </div>
  )
}
