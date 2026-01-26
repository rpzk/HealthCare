import { Suspense } from 'react'
import SchedulePageClient from './schedule-page-client'

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando...</div>}>
      <SchedulePageClient />
    </Suspense>
  )
}
