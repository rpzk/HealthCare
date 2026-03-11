"use client"
import { Suspense } from 'react'
import { ConsultationsList } from '@/components/consultations/consultations-list'
import { Require2FAWrapper } from '@/components/auth/require-2fa-wrapper'

export function ConsultationsPageClient() {
  return (
    <Require2FAWrapper>
      <>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Consultas</h1>
          <p className="text-muted-foreground">Gerencie todas as consultas médicas do sistema</p>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando consultas…</div>}>
          <ConsultationsList />
        </Suspense>
      </>
    </Require2FAWrapper>
  )
}
