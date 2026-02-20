'use client'

import { useRealtimeEvents } from '@/hooks/use-realtime-events'

/**
 * Componente indicador de conexão em tempo real
 */
export function RealtimeConnectionIndicator({ className }: { className?: string }) {
  const { isConnected, connectionError } = useRealtimeEvents({ showToasts: false })

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-muted-foreground">
        {isConnected ? 'Conectado' : connectionError || 'Desconectado'}
      </span>
    </div>
  )
}
