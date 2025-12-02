'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { ReassessmentCalendar } from '@/components/hr/reassessment-calendar'

export default function ReassessmentPage() {
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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Reavaliações Anuais"
            description="Gerencie o calendário de reavaliações de stratum e forças"
            breadcrumbs={[
              { label: 'Desenvolvimento', href: '/development' },
              { label: 'Reavaliações' }
            ]}
            showBackButton={true}
            showHomeButton={true}
          />
          <div className="mt-6">
            <ReassessmentCalendar />
          </div>
        </main>
      </div>
    </div>
  )
}
