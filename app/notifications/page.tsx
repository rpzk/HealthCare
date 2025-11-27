'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { 
  Bell, 
  Settings,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  FileText,
  Trash2,
  RefreshCw,
  Inbox
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  priority: string
  metadata?: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const filterNotifications = useCallback(() => {
    let filtered = notifications

    if (filter !== 'all') {
      if (filter === 'unread') {
        filtered = filtered.filter(n => !n.read)
      } else {
        filtered = filtered.filter(n => n.type === filter)
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredNotifications(filtered)
  }, [notifications, filter, searchTerm])

  useEffect(() => {
    filterNotifications()
  }, [filterNotifications])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setNotifications(data)
      setFilteredNotifications(data)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as notificações', variant: 'destructive' })
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
      toast({ title: 'Erro', description: 'Não foi possível marcar como lida', variant: 'destructive' })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!response.ok) throw new Error('Falha')
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast({ title: 'Sucesso', description: 'Todas as notificações foram marcadas como lidas' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível marcar todas como lidas', variant: 'destructive' })
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao excluir')
      
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast({ title: 'Sucesso', description: 'Notificação excluída' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' })
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'appointment_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />
      case 'exam':
        return <FileText className="h-5 w-5 text-purple-500" />
      case 'alert':
      case 'critical_alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'system':
      case 'system_status':
        return <Settings className="h-5 w-5 text-gray-500" />
      case 'patient':
      case 'patient_update':
        return <User className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return <Badge variant="destructive">Alta</Badge>
      case 'medium':
        return <Badge variant="default">Média</Badge>
      default:
        return <Badge variant="secondary">Baixa</Badge>
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `${minutes}min atrás`
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const filters = [
    { id: 'all', label: 'Todas' },
    { id: 'unread', label: 'Não lidas' },
    { id: 'appointment', label: 'Consultas' },
    { id: 'exam', label: 'Exames' },
    { id: 'alert', label: 'Alertas' },
    { id: 'system', label: 'Sistema' }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <PageHeader
            title="Notificações"
            description={`Você tem ${unreadCount} notificação(ões) não lida(s)`}
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Notificações' }
            ]}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchNotifications}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            }
          />

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.map(f => (
                <Button
                  key={f.id}
                  variant={filter === f.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  {f.id === 'unread' && unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="space-y-3">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="mt-2 text-muted-foreground">Carregando...</p>
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma notificação</h3>
                  <p className="text-muted-foreground">
                    {filter === 'all' 
                      ? 'Você não tem notificações no momento'
                      : 'Nenhuma notificação corresponde ao filtro selecionado'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map(notification => (
                <Card 
                  key={notification.id} 
                  className={`transition-colors ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h4>
                          {getPriorityBadge(notification.priority)}
                          {!notification.read && (
                            <span className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(notification.createdAt)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            title="Marcar como lida"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
