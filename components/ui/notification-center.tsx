"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Bell, 
  BellRing, 
  CheckCheck, 
  Trash2, 
  AlertTriangle,
  Brain,
  Pill,
  Settings,
  Calendar,
  User
} from 'lucide-react'
import { NotificationService, Notification, NotificationPriority, NotificationType } from '@/lib/notification-service'
import { logger } from '@/lib/logger'

export function NotificationCenter() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      logger.error('Erro ao buscar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      logger.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/stats', {
        method: 'POST'
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      logger.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      logger.error('Erro ao excluir notificação:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Atualizar notificações a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ai_analysis_complete':
        return <Brain className="h-4 w-4 text-blue-600" />
      case 'critical_alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'drug_interaction_warning':
        return <Pill className="h-4 w-4 text-orange-600" />
      case 'system_status':
        return <Settings className="h-4 w-4 text-gray-600" />
      case 'appointment_reminder':
        return <Calendar className="h-4 w-4 text-green-600" />
      case 'patient_update':
        return <User className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityBadgeVariant = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'secondary'
      case 'medium': return 'outline'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getActionUrl = (notification: Notification): string | null => {
    const metadata = notification.metadata as unknown as Record<string, unknown> | null
    const actionUrl = metadata && typeof metadata.actionUrl === 'string' ? metadata.actionUrl : null
    return actionUrl
  }

  const handleNotificationClick = async (notification: Notification) => {
    const actionUrl = getActionUrl(notification)
    if (notification.id && !notification.read) {
      await markAsRead(notification.id)
    }
    if (actionUrl) {
      setIsOpen(false)
      router.push(actionUrl)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 max-h-96 overflow-y-auto" 
        align="end"
        sideOffset={5}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative p-3 hover:bg-muted/50 cursor-pointer border-l-2 ${
                  !notification.read 
                    ? 'bg-muted/30 border-l-blue-500' 
                    : 'border-l-transparent'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getTypeIcon(notification.type as NotificationType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {notification.title}
                      </h4>
                      <Badge 
                        variant={getPriorityBadgeVariant(notification.priority as NotificationPriority)}
                        className="text-xs"
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTimeAgo(notification.createdAt)}</span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id!)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              <span className="text-sm text-muted-foreground">
                Ver todas as notificações
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
