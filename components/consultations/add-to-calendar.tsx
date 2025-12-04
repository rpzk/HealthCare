"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Download, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AddToCalendarProps {
  consultationId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

interface CalendarLinks {
  google: string
  outlook: string
  yahoo: string
  downloadICS: string
}

export function AddToCalendar({
  consultationId,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: AddToCalendarProps) {
  const [loading, setLoading] = useState(false)
  const [links, setLinks] = useState<CalendarLinks | null>(null)

  const fetchLinks = async () => {
    if (links) return // Já carregou
    
    setLoading(true)
    try {
      const res = await fetch(`/api/consultations/${consultationId}/calendar`)
      if (!res.ok) throw new Error('Falha ao obter links')
      
      const data = await res.json()
      setLinks(data.calendarLinks)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar os links do calendário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchLinks()
    }
  }

  const handleDownloadICS = () => {
    if (links?.downloadICS) {
      window.open(links.downloadICS, '_blank')
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-2">Adicionar ao Calendário</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Escolha seu calendário</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => links?.google && window.open(links.google, '_blank')}
              disabled={!links?.google}
              className="cursor-pointer"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Calendar
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => links?.outlook && window.open(links.outlook, '_blank')}
              disabled={!links?.outlook}
              className="cursor-pointer"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.355.228-.59.228h-8.16v-6.29l1.404 1.024a.59.59 0 0 0 .348.112.59.59 0 0 0 .384-.14.527.527 0 0 0 .168-.628L13.5 9.12l.001-.004 4.16-.004v4.556h5.924V7.387c0-.234-.076-.43-.228-.588a.802.802 0 0 0-.59-.238H15v.001V4.83l9 5.387v-2.83zM14.5 3v8.5l-7-4.083V3h7zm-7 7.667V21h7v-6.25l-7-4.083zM0 7.5v9a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0-.5.5z"/>
              </svg>
              Outlook
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => links?.yahoo && window.open(links.yahoo, '_blank')}
              disabled={!links?.yahoo}
              className="cursor-pointer"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#6001D2" d="M12.727 12.11l4.91-8.385h-3.09L12 8.4l-2.545-4.676H6.364l4.91 8.386v6.166h1.454V12.11z"/>
              </svg>
              Yahoo Calendar
              <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={handleDownloadICS}
              disabled={!links?.downloadICS}
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar arquivo .ics
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
