'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { 
  Bell, 
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Pill,
  RefreshCw,
  Inbox,
  Check
} from 'lucide-react'
import Link from 'next/link'
import { parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  priority: string
  metadata?: Record<string, unknown>
}

const typeIcons: Record<string, typeof Bell> = {
  CONSULTATION: Calendar,
  EXAM: FileText,
  PRESCRIPTION: Pill,
  ALERT: AlertCircle,
  SYSTEM: Bell,
  default: Bell
}

const typeColors: Record<string, string> = {
  CONSULTATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  EXAM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  PRESCRIPTION: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  ALERT: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  SYSTEM: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
}

export default function NotificacoesPacientePage() {
  const { data: _session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setNotifications(data)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })
      if (!response.ok) throw new Error('Falha ao marcar')
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível marcar como lida', 
        variant: 'destructive' 
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Falha')
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast({ title: 'Sucesso', description: 'Todas marcadas como lidas' })
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível marcar todas', 
        variant: 'destructive' 
      })
    }
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/minha-saude">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Notificações</h1>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Ler todas
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={fetchNotifications}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="rounded-full"
          >
            Todas
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            className="rounded-full"
          >
            Não lidas
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Lista de notificações */}
      <div className="max-w-2xl mx-auto px-4 space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Inbox className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Nenhuma notificação
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'unread' 
                  ? 'Você não tem notificações não lidas'
                  : 'Você não tem notificações no momento'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type] || typeIcons.default
            const colorClass = typeColors[notification.type] || typeColors.SYSTEM

            return (
              <Card 
                key={notification.id} 
                className={`border-0 shadow-md rounded-2xl overflow-hidden transition-all ${
                  !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={`p-2.5 rounded-xl ${colorClass} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(parseISO(notification.createdAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </div>
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
