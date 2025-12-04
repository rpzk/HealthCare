/**
 * Serviço de integração com Google Calendar
 * 
 * Funcionalidades:
 * - Sincronizar consultas com Google Calendar do médico
 * - Criar eventos de calendário automaticamente
 * - Enviar convites para pacientes
 */

import { google, calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/prisma'

// Configuração do cliente OAuth2
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/google/callback`
  )
}

// Escopos necessários
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

// Gerar URL de autorização
export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CALENDAR_SCOPES,
    state: userId, // Passar userId para associar após callback
    prompt: 'consent', // Forçar consentimento para obter refresh_token
  })
}

// Trocar código por tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: Date
}> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Falha ao obter tokens do Google')
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
  }
}

// Obter cliente autenticado para um usuário
async function getAuthenticatedClient(userId: string): Promise<calendar_v3.Calendar | null> {
  // Buscar tokens do usuário no banco
  const integration = await prisma.userIntegration.findFirst({
    where: {
      userId,
      provider: 'google_calendar',
      active: true,
    },
  })
  
  if (!integration) {
    return null
  }
  
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.expiresAt?.getTime(),
  })
  
  // Verificar se token expirou e renovar se necessário
  if (integration.expiresAt && new Date() > integration.expiresAt) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      // Atualizar tokens no banco
      await prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      })
      
      oauth2Client.setCredentials(credentials)
    } catch (error) {
      console.error('Erro ao renovar token Google:', error)
      // Desativar integração se não conseguir renovar
      await prisma.userIntegration.update({
        where: { id: integration.id },
        data: { active: false },
      })
      return null
    }
  }
  
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Interface para dados do evento
interface CalendarEventData {
  consultationId: string
  summary: string
  description: string
  startTime: Date
  endTime: Date
  location?: string
  attendeeEmail?: string
  attendeeName?: string
  type: 'IN_PERSON' | 'TELEMEDICINE' | 'HOME_VISIT'
  meetingLink?: string
}

// Criar evento no Google Calendar
export async function createGoogleCalendarEvent(
  userId: string,
  eventData: CalendarEventData
): Promise<{ eventId: string; htmlLink: string } | null> {
  const calendar = await getAuthenticatedClient(userId)
  
  if (!calendar) {
    console.log('Google Calendar não configurado para usuário:', userId)
    return null
  }
  
  try {
    // Configurar conferência se for teleconsulta
    const conferenceData = eventData.type === 'TELEMEDICINE' ? {
      createRequest: {
        requestId: eventData.consultationId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    } : undefined
    
    // Preparar lista de participantes
    const attendees: calendar_v3.Schema$EventAttendee[] = []
    if (eventData.attendeeEmail) {
      attendees.push({
        email: eventData.attendeeEmail,
        displayName: eventData.attendeeName,
        responseStatus: 'needsAction',
      })
    }
    
    const event: calendar_v3.Schema$Event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      location: eventData.location,
      attendees: attendees.length > 0 ? attendees : undefined,
      conferenceData,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      // Metadados para identificar evento criado pelo sistema
      extendedProperties: {
        private: {
          consultationId: eventData.consultationId,
          source: 'healthcare-system',
        },
      },
    }
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: eventData.type === 'TELEMEDICINE' ? 1 : undefined,
      sendUpdates: attendees.length > 0 ? 'all' : 'none',
    })
    
    // Salvar referência do evento no banco
    await prisma.consultation.update({
      where: { id: eventData.consultationId },
      data: {
        notes: JSON.stringify({
          ...JSON.parse((await prisma.consultation.findUnique({ where: { id: eventData.consultationId } }))?.notes || '{}'),
          googleCalendarEventId: response.data.id,
          googleCalendarLink: response.data.htmlLink,
          meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri || eventData.meetingLink,
        }),
      },
    })
    
    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!,
    }
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error)
    return null
  }
}

// Atualizar evento existente
export async function updateGoogleCalendarEvent(
  userId: string,
  eventId: string,
  eventData: Partial<CalendarEventData>
): Promise<boolean> {
  const calendar = await getAuthenticatedClient(userId)
  
  if (!calendar) {
    return false
  }
  
  try {
    const updateData: calendar_v3.Schema$Event = {}
    
    if (eventData.summary) updateData.summary = eventData.summary
    if (eventData.description) updateData.description = eventData.description
    if (eventData.startTime) {
      updateData.start = {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      }
    }
    if (eventData.endTime) {
      updateData.end = {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      }
    }
    if (eventData.location) updateData.location = eventData.location
    
    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updateData,
      sendUpdates: 'all',
    })
    
    return true
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error)
    return false
  }
}

// Cancelar evento
export async function cancelGoogleCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const calendar = await getAuthenticatedClient(userId)
  
  if (!calendar) {
    return false
  }
  
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    })
    
    return true
  } catch (error) {
    console.error('Erro ao cancelar evento no Google Calendar:', error)
    return false
  }
}

// Sincronizar consultas existentes com Google Calendar
export async function syncConsultationsToGoogleCalendar(
  userId: string,
  fromDate: Date = new Date()
): Promise<{ synced: number; errors: number }> {
  const calendar = await getAuthenticatedClient(userId)
  
  if (!calendar) {
    return { synced: 0, errors: 0 }
  }
  
  let synced = 0
  let errors = 0
  
  // Buscar consultas futuras do médico
  const consultations = await prisma.consultation.findMany({
    where: {
      doctorId: userId,
      scheduledDate: { gte: fromDate },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
    include: {
      patient: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  })
  
  for (const consultation of consultations) {
    // Verificar se já tem evento criado
    let existingEventId: string | null = null
    try {
      const notes = JSON.parse(consultation.notes || '{}')
      existingEventId = notes.googleCalendarEventId
    } catch {}
    
    if (existingEventId) {
      continue // Já sincronizado
    }
    
    const result = await createGoogleCalendarEvent(userId, {
      consultationId: consultation.id,
      summary: `Consulta: ${consultation.patient.name}`,
      description: `Consulta médica com ${consultation.patient.name}\n\nTipo: ${consultation.type}\nTelefone: ${consultation.patient.phone || 'Não informado'}`,
      startTime: consultation.scheduledDate,
      endTime: new Date(consultation.scheduledDate.getTime() + (consultation.duration || 30) * 60000),
      attendeeEmail: consultation.patient.email || undefined,
      attendeeName: consultation.patient.name,
      type: consultation.type,
      meetingLink: consultation.meetingLink || undefined,
    })
    
    if (result) {
      synced++
    } else {
      errors++
    }
  }
  
  return { synced, errors }
}
