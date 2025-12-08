'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MainContent } from '@/components/layout/main-content'
import { DashboardOverview } from '@/components/dashboard/overview'

export function ClientDashboard() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <MainContent>
          <DashboardOverview />
        </MainContent>
      </div>
    </div>
  )
}
