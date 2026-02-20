/**
 * Hooks para eventos em tempo real
 * 
 * Usa Server-Sent Events (SSE) para receber notificações do servidor.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'

// ============ TIPOS ============

export type EventType =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'appointment.reminder'
  | 'patient.checkin'
  | 'patient.waiting'
  | 'prescription.created'
  | 'prescription.signed'
  | 'medical_record.updated'
  | 'exam.result'
  | 'notification.new'
  | 'vital_signs.alert'
  | 'queue.updated'
  | 'heartbeat'

export interface RealtimeEvent {
  type: EventType
  payload?: Record<string, unknown>
  userId?: string
  role?: string
  patientId?: string
  timestamp: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface UseRealtimeEventsOptions {
  types?: EventType[]
  patientId?: string
  showToasts?: boolean
  onEvent?: (event: RealtimeEvent) => void
  autoReconnect?: boolean
  enabled?: boolean
}

interface UseRealtimeEventsReturn {
  isConnected: boolean
  lastEvent: RealtimeEvent | null
  events: RealtimeEvent[]
  connectionError: string | null
  reconnect: () => void
}

// ============ HOOK PRINCIPAL ============

/**
 * Hook para receber eventos em tempo real via SSE
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}): UseRealtimeEventsReturn {
  const {
    types,
    patientId,
    showToasts = true,
    onEvent,
    autoReconnect = true,
    enabled = true
  } = options

  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)

  // Função para exibir toast de evento
  const showEventToast = useCallback((event: RealtimeEvent) => {
    if (!showToasts || event.type === 'heartbeat') return

    const toastConfig = getToastConfig(event)
    if (toastConfig) {
      toast(toastConfig)
    }
  }, [showToasts, toast])

  // Função de conexão
  const connect = useCallback(() => {
    if (!enabled) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Construir URL com parâmetros
    const params = new URLSearchParams()
    if (types?.length) params.set('types', types.join(','))
    if (patientId) params.set('patientId', patientId)

    const url = `/api/realtime/events${params.toString() ? `?${params}` : ''}`

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttempts.current = 0
      }

      eventSource.onmessage = (e) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data)
          
          // Ignorar heartbeats para o estado
          if (event.type !== 'heartbeat') {
            setLastEvent(event)
            setEvents(prev => [event, ...prev].slice(0, 100)) // Manter últimos 100
            showEventToast(event)
            onEvent?.(event)
          }
        } catch (error) {
          console.error('[Realtime] Erro ao processar evento:', error)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        setConnectionError('Conexão perdida')
        eventSource.close()

        // Reconectar automaticamente
        if (autoReconnect && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }
    } catch (error) {
      setConnectionError('Erro ao conectar')
      console.error('[Realtime] Erro ao criar EventSource:', error)
    }
  }, [enabled, types, patientId, showEventToast, onEvent, autoReconnect])

  // Função de reconexão manual
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0
    connect()
  }, [connect])

  // Efeito de conexão
  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    isConnected,
    lastEvent,
    events,
    connectionError,
    reconnect
  }
}

// ============ HOOKS ESPECIALIZADOS ============

/**
 * Hook para notificações de consultas
 */
export function useAppointmentNotifications(onAppointmentChange?: (event: RealtimeEvent) => void) {
  return useRealtimeEvents({
    types: ['appointment.created', 'appointment.updated', 'appointment.cancelled', 'patient.checkin'],
    onEvent: onAppointmentChange
  })
}

/**
 * Hook para fila de atendimento
 */
export function useQueueNotifications(onQueueChange?: (event: RealtimeEvent) => void) {
  return useRealtimeEvents({
    types: ['queue.updated', 'patient.checkin', 'patient.waiting'],
    onEvent: onQueueChange
  })
}

/**
 * Hook para alertas de sinais vitais
 */
export function useVitalSignsAlerts(patientId?: string, onAlert?: (event: RealtimeEvent) => void) {
  return useRealtimeEvents({
    types: ['vital_signs.alert'],
    patientId,
    onEvent: onAlert,
    showToasts: true
  })
}

/**
 * Hook para atualizações de prontuário de um paciente específico
 */
export function usePatientRecordUpdates(patientId: string, onUpdate?: (event: RealtimeEvent) => void) {
  return useRealtimeEvents({
    types: ['medical_record.updated', 'prescription.created', 'exam.result'],
    patientId,
    onEvent: onUpdate
  })
}

// ============ HELPERS ============

/**
 * Retorna configuração do toast baseado no tipo de evento
 */
function getToastConfig(event: RealtimeEvent): {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
} | null {
  const payload = event.payload || {}

  switch (event.type) {
    case 'appointment.created':
      return {
        title: '📅 Nova consulta agendada',
        description: payload.patientName ? `Paciente: ${payload.patientName}` : undefined
      }
    
    case 'appointment.cancelled':
      return {
        title: '❌ Consulta cancelada',
        description: payload.patientName ? `Paciente: ${payload.patientName}` : undefined,
        variant: 'destructive'
      }

    case 'patient.checkin':
      return {
        title: '✅ Check-in realizado',
        description: payload.patientName ? `${payload.patientName} chegou` : 'Paciente na recepção'
      }

    case 'vital_signs.alert':
      return {
        title: '⚠️ Alerta de Sinais Vitais',
        description: payload.message as string || 'Valores fora do normal',
        variant: 'destructive'
      }

    case 'exam.result':
      return {
        title: '🔬 Resultado de Exame',
        description: `Novo resultado disponível: ${payload.examType || 'Exame'}`
      }

    case 'prescription.created':
      return {
        title: '💊 Nova Prescrição',
        description: 'Prescrição criada com sucesso'
      }

    case 'queue.updated':
      return {
        title: '📋 Fila Atualizada',
        description: payload.queuePosition ? `Posição: ${payload.queuePosition}` : undefined
      }

    default:
      return null
  }
}
