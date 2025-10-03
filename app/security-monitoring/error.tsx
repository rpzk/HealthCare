'use client'
import React from 'react'

interface SecurityMonitoringErrorProps {
  error: unknown
  reset: () => void
}

function getErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export default function SecurityMonitoringError({ error, reset }: SecurityMonitoringErrorProps) {
  React.useEffect(() => {
    console.error('[SecurityMonitoring] Boundary captured error:', error)
  }, [error])
  const message = React.useMemo(() => getErrorMessage(error), [error])
  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded p-6 space-y-4">
        <h2 className="text-xl font-semibold text-red-800">Falha ao renderizar o dashboard de segurança</h2>
        <p className="text-sm text-red-700 break-all">{message}</p>
        <button
          onClick={() => { reset() }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >Tentar novamente</button>
      </div>
    </div>
  )
}
