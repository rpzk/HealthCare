'use client'

import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 border px-3 py-2 rounded-md text-sm"
    >
      <RefreshCw className="w-4 h-4" /> Atualizar
    </button>
  )
}
