'use client'
import React from 'react'

export default function PatientsError({ error, reset }: { error: any, reset: () => void }) {
  React.useEffect(() => {
    console.error('[Patients] Boundary captured error:', error)
  }, [error])
  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-red-800">Falha ao carregar pacientes</h2>
        <p className="text-sm text-red-700 break-all">{String(error?.message || error)}</p>
        <button
          onClick={() => { reset() }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >Tentar novamente</button>
      </div>
    </div>
  )
}
