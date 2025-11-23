"use client"
import { Suspense } from 'react'
import { ConsultationsList } from '@/components/consultations/consultations-list'

export function ConsultationsPageClient() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Consultas</h1>
          <p className="text-muted-foreground">Gerencie todas as consultas médicas do sistema</p>
        </div>
        <button
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition"
          onClick={() => {
            // Abrir modal de nova consulta
            const evt = new CustomEvent('openNewConsultationModal')
            window.dispatchEvent(evt)
          }}
        >
          <span className="mr-2">Nova Consulta</span>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando consultas…</div>}>
        <ConsultationsList />
      </Suspense>
    </>
  )
}
