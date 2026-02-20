/**
 * API Server-Sent Events (SSE) para notificações em tempo real
 * 
 * GET /api/realtime/events - Stream de eventos SSE
 * 
 * O cliente conecta via EventSource e recebe eventos em tempo real.
 * 
 * Exemplo de uso no cliente:
 * ```javascript
 * const eventSource = new EventSource('/api/realtime/events')
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data)
 *   console.log('Evento recebido:', data)
 * }
 * ```
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RealtimeService, RealtimeEvent, EventType } from '@/lib/realtime-service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verificar autenticação
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Não autenticado', { status: 401 })
  }

  // Buscar role do usuário
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  // Parse de filtros opcionais
  const { searchParams } = new URL(request.url)
  const typesParam = searchParams.get('types')
  const patientIdParam = searchParams.get('patientId')

  const types = typesParam?.split(',') as EventType[] | undefined

  // Configurar stream SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Função para enviar evento
      const sendEvent = (event: RealtimeEvent) => {
        const data = JSON.stringify(event)
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Enviar heartbeat inicial
      const heartbeat = { type: 'heartbeat', timestamp: new Date() }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`))

      // Registrar subscriber
      const subscriptionId = RealtimeService.subscribe(
        session.user.id,
        sendEvent,
        {
          role: user?.role,
          types,
          patientId: patientIdParam || undefined
        }
      )

      // Heartbeat periódico para manter conexão viva
      const heartbeatInterval = setInterval(() => {
        try {
          const hb = { type: 'heartbeat', timestamp: new Date() }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(hb)}\n\n`))
        } catch {
          // Stream foi fechado
          clearInterval(heartbeatInterval)
        }
      }, 30000) // A cada 30 segundos

      // Cleanup quando conexão é fechada
      request.signal.addEventListener('abort', () => {
        RealtimeService.unsubscribe(subscriptionId)
        clearInterval(heartbeatInterval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Para nginx
    }
  })
}
