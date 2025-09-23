'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  RefreshCw
} from 'lucide-react'

interface Notification {
  id: string
  type: 'appointment' | 'exam' | 'alert' | 'system' | 'patient'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
  relatedId?: string
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

    // Filtrar por tipo
    if (filter !== 'all') {
      if (filter === 'unread') {
        filtered = filtered.filter(n => !n.read)
      } else {
        filtered = filtered.filter(n => n.type === filter)
      }
    }

    // Filtrar por termo de busca
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
    // Simular carregamento de notificações
    setTimeout(() => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'appointment',
          title: 'Consulta Agendada',
          message: 'Consulta com Dr. Silva agendada para hoje às 14:30',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
          read: false,
          priority: 'high',
          actionUrl: '/consultations/today',
          relatedId: 'cons_123'
        },
        {
          id: '2',
          type: 'exam',
          title: 'Resultado de Exame Disponível',
          message: 'Resultado do exame de sangue de Maria Santos já está disponível',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h atrás
          read: false,
          priority: 'medium',
          actionUrl: '/exams/results',
          relatedId: 'exam_456'
        },
        {
          id: '3',
          type: 'alert',
          title: 'Paciente com Alergia',
          message: 'ATENÇÃO: João Silva possui alergia a penicilina',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h atrás
          read: true,
          priority: 'high',
          relatedId: 'patient_789'
        },
        {
          id: '4',
          type: 'system',
          title: 'Backup Concluído',
          message: 'Backup automático do sistema realizado com sucesso',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12h atrás
          read: true,
          priority: 'low'
        },
        {
          id: '5',
          type: 'appointment',
          title: 'Consulta Cancelada',
          message: 'Paciente Ana Costa cancelou a consulta de amanhã',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
          read: false,
          priority: 'medium',
          actionUrl: '/consultations',
          relatedId: 'cons_321'
        },
        {
          id: '6',
          type: 'patient',
          title: 'Novo Cadastro',
          message: 'Novo paciente cadastrado: Roberto Santos',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 dias atrás
          read: true,
          priority: 'low',
          actionUrl: '/patients',
          relatedId: 'patient_654'
        },
        {
          id: '7',
          type: 'exam',
          title: 'Exame Urgente',
          message: 'Solicitação de exame urgente para Paulo Lima',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 dias atrás
          read: true,
          priority: 'high',
          actionUrl: '/exams/new',
          relatedId: 'exam_987'
        },
        {
          id: '8',
          type: 'system',
          title: 'Atualização Disponível',
          message: 'Nova versão do sistema disponível para instalação',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 dias atrás
          read: false,
          priority: 'medium'
        }
      ]
      
      setNotifications(mockNotifications)
      setLoading(false)
    }, 1000)
  }

  

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />
      case 'exam':
        return <FileText className="h-5 w-5 text-green-600" />
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />
      case 'patient':
        return <User className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      appointment: { label: 'Consulta', color: 'bg-blue-100 text-blue-800' },
      exam: { label: 'Exame', color: 'bg-green-100 text-green-800' },
      alert: { label: 'Alerta', color: 'bg-red-100 text-red-800' },
      system: { label: 'Sistema', color: 'bg-gray-100 text-gray-800' },
      patient: { label: 'Paciente', color: 'bg-purple-100 text-purple-800' }
    }
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: 'Outros', color: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge className={`${typeInfo.color} border-0 text-xs`}>
        {typeInfo.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Alta</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Média</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Baixa</Badge>
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}min atrás`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours}h atrás`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days}d atrás`
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filterOptions = [
    { value: 'all', label: 'Todas', count: notifications.length },
    { value: 'unread', label: 'Não Lidas', count: unreadCount },
    { value: 'appointment', label: 'Consultas', count: notifications.filter(n => n.type === 'appointment').length },
    { value: 'exam', label: 'Exames', count: notifications.filter(n => n.type === 'exam').length },
    { value: 'alert', label: 'Alertas', count: notifications.filter(n => n.type === 'alert').length },
    { value: 'system', label: 'Sistema', count: notifications.filter(n => n.type === 'system').length },
    { value: 'patient', label: 'Pacientes', count: notifications.filter(n => n.type === 'patient').length }
  ]

  const handleNavigate = (url?: string) => {
    if (!url) return
    window.location.href = url
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6 pt-24">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Notificações"
            description={unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas as notificações lidas'}
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Notificações', href: '/notifications' }
            ]}
            actions={(
              <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            )}
          />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Marcar Todas como Lidas</span>
            </Button>
          )}
        </div>
      </div>

      {/* Controles de Filtro */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar notificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === option.value
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {option.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma notificação encontrada</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? `Não há notificações que correspondam ao termo "${searchTerm}"`
                  : 'Você não possui notificações neste momento.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map(notification => (
            <Card 
              key={notification.id} 
              className={`transition-colors ${
                !notification.read 
                  ? 'border-blue-200 bg-blue-50/30' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>

                      <p className={`text-sm mb-3 ${
                        !notification.read ? 'text-gray-700' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>

                      <div className="flex items-center space-x-3">
                        {getTypeBadge(notification.type)}
                        {getPriorityBadge(notification.priority)}
                        <span className="text-xs text-gray-500 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(notification.timestamp)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {notification.actionUrl && (
                      <Button variant="outline" onClick={() => handleNavigate(notification.actionUrl)} className="h-7 px-2 text-xs">
                        Abrir
                      </Button>
                    )}

                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-500 hover:text-red-700"
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
        </div>
        </main>
      </div>
    </div>
  )
}
