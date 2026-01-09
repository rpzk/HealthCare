'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Archive,
  Filter,
  Mail,
  MessageSquare,
  User,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface QuestionnaireNotification {
  id: string
  type: 'QUESTIONNAIRE_SENT' | 'QUESTIONNAIRE_COMPLETED' | 'QUESTIONNAIRE_EXPIRED' | 'AI_ANALYSIS_READY'
  title: string
  message: string
  patientName: string
  patientId: string
  questionnaireName: string
  questionnaireId: string
  status: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

interface Props {
  userId: string
}

export function QuestionnaireNotificationsPanel({ userId }: Props) {
  const [notifications, setNotifications] = useState<QuestionnaireNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/questionnaires/notifications?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      void fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/questionnaires/notifications/${id}/mark-read`, {
        method: 'PATCH',
      })
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Erro ao marcar como lido:', error)
    }
  }

  async function deleteNotification(id: string) {
    try {
      await fetch(`/api/questionnaires/notifications/${id}`, {
        method: 'DELETE',
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Erro ao deletar notificação:', error)
    }
  }

  async function markAllAsRead() {
    try {
      await fetch(`/api/questionnaires/notifications/mark-all-read`, {
        method: 'PATCH',
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'QUESTIONNAIRE_COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'QUESTIONNAIRE_SENT':
        return <Mail className="h-5 w-5 text-blue-600" />
      case 'QUESTIONNAIRE_EXPIRED':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'AI_ANALYSIS_READY':
        return <MessageSquare className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'QUESTIONNAIRE_COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'QUESTIONNAIRE_SENT':
        return 'bg-blue-50 border-blue-200'
      case 'QUESTIONNAIRE_EXPIRED':
        return 'bg-red-50 border-red-200'
      case 'AI_ANALYSIS_READY':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case 'QUESTIONNAIRE_COMPLETED':
        return 'Questionário Respondido'
      case 'QUESTIONNAIRE_SENT':
        return 'Questionário Enviado'
      case 'QUESTIONNAIRE_EXPIRED':
        return 'Questionário Expirado'
      case 'AI_ANALYSIS_READY':
        return 'Análise IA Pronta'
      default:
        return 'Notificação'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header com Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Centro de Notificações
              </CardTitle>
              <CardDescription>
                {unreadCount > 0 
                  ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''} notificação${unreadCount > 1 ? 's' : ''}`
                  : 'Todas as notificações lidas'
                }
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unread">
            Não Lidas {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="read">
            Lidas
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas
          </TabsTrigger>
        </TabsList>

        {/* Notifications List */}
        <TabsContent value={filter} className="space-y-3">
          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-all ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">
                            {notification.title}
                          </h4>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getNotificationLabel(notification.type)}
                          </Badge>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <User className="h-3 w-3" />
                        <span>{notification.patientName}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {notification.actionUrl && (
                          <Button
                            size="sm"
                            variant="default"
                            asChild
                          >
                            <a href={notification.actionUrl}>
                              Ver Detalhes
                            </a>
                          </Button>
                        )}

                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Marcar como lido
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'unread'
                    ? 'Nenhuma notificação não lida'
                    : filter === 'read'
                    ? 'Nenhuma notificação lida'
                    : 'Nenhuma notificação'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
