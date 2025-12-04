/**
 * Serviço para gerar arquivos iCalendar (.ics)
 * 
 * Permite que pacientes adicionem consultas em qualquer aplicativo de calendário
 */

import { format } from 'date-fns'

interface ICSEventData {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  location?: string
  organizerName: string
  organizerEmail: string
  attendeeName?: string
  attendeeEmail?: string
  meetingLink?: string
}

/**
 * Gera um arquivo .ics para um evento
 */
export function generateICS(event: ICSEventData): string {
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss")
  }
  
  const uid = `${event.id}@healthcare.rafaelpiazenski.com`
  const now = new Date()
  
  // Escapar caracteres especiais
  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }
  
  // Construir descrição com link de reunião se houver
  let description = escapeICS(event.description)
  if (event.meetingLink) {
    description += `\\n\\nLink da Teleconsulta: ${event.meetingLink}`
  }
  
  // Construir localização
  let location = event.location || ''
  if (event.meetingLink && !location) {
    location = event.meetingLink
  }
  
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HealthCare System//Consultas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART;TZID=America/Sao_Paulo:${formatICSDate(event.startTime)}`,
    `DTEND;TZID=America/Sao_Paulo:${formatICSDate(event.endTime)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${description}`,
  ]
  
  if (location) {
    lines.push(`LOCATION:${escapeICS(location)}`)
  }
  
  lines.push(`ORGANIZER;CN=${escapeICS(event.organizerName)}:mailto:${event.organizerEmail}`)
  
  if (event.attendeeEmail) {
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeICS(event.attendeeName || event.attendeeEmail)}:mailto:${event.attendeeEmail}`
    )
  }
  
  // Alarmes/Lembretes
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Consulta em 1 hora',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Consulta em 30 minutos',
    'TRIGGER:-PT30M',
    'END:VALARM'
  )
  
  lines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  )
  
  return lines.join('\r\n')
}

/**
 * Gera um arquivo .ics para cancelamento de evento
 */
export function generateCancellationICS(event: ICSEventData): string {
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss")
  }
  
  const uid = `${event.id}@healthcare.rafaelpiazenski.com`
  const now = new Date()
  
  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }
  
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HealthCare System//Consultas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:CANCEL',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART;TZID=America/Sao_Paulo:${formatICSDate(event.startTime)}`,
    `DTEND;TZID=America/Sao_Paulo:${formatICSDate(event.endTime)}`,
    `SUMMARY:CANCELADO: ${escapeICS(event.title)}`,
    `ORGANIZER;CN=${escapeICS(event.organizerName)}:mailto:${event.organizerEmail}`,
    'STATUS:CANCELLED',
    'SEQUENCE:1',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
  
  return lines.join('\r\n')
}

/**
 * Gera link data URI para download do .ics
 */
export function generateICSDataUri(icsContent: string): string {
  const base64 = Buffer.from(icsContent).toString('base64')
  return `data:text/calendar;charset=utf-8;base64,${base64}`
}

/**
 * Gera links para adicionar evento em diferentes calendários
 */
export function generateCalendarLinks(event: ICSEventData): {
  google: string
  outlook: string
  yahoo: string
  ics: string
} {
  const formatGoogleDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss")
  }
  
  const encodeText = (text: string): string => {
    return encodeURIComponent(text)
  }
  
  // Link para Google Calendar
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`,
    details: event.description + (event.meetingLink ? `\n\nLink: ${event.meetingLink}` : ''),
    location: event.location || event.meetingLink || '',
    ctz: 'America/Sao_Paulo',
  })
  
  // Link para Outlook
  const outlookParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description + (event.meetingLink ? `\n\nLink: ${event.meetingLink}` : ''),
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    location: event.location || event.meetingLink || '',
  })
  
  // Link para Yahoo Calendar
  const yahooParams = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatGoogleDate(event.startTime),
    et: formatGoogleDate(event.endTime),
    desc: event.description + (event.meetingLink ? `\n\nLink: ${event.meetingLink}` : ''),
    in_loc: event.location || event.meetingLink || '',
  })
  
  return {
    google: `https://calendar.google.com/calendar/render?${googleParams}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams}`,
    yahoo: `https://calendar.yahoo.com/?${yahooParams}`,
    ics: generateICSDataUri(generateICS(event)),
  }
}
