'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Target, 
  Award, 
  TrendingDown,
  Calendar,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Filter,
  User,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DevelopmentAlert {
  id: string
  type: 'reassessment' | 'goal_deadline' | 'streak' | 'achievement' | 'milestone'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  userId?: string
  userName?: string
  dueDate?: string
  daysRemaining?: number
  actionUrl?: string
  metadata?: Record<string, unknown>
}

interface AlertSummary {
  total: number
  byPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  byType: {
    reassessment: number
    goal_deadline: number
    milestone: number
    streak: number
    achievement: number
  }
}

const priorityConfig = {
  urgent: { label: 'Urgente', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  high: { label: 'Alta', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  medium: { label: 'Média', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  low: { label: 'Baixa', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' }
}

const typeConfig = {
  reassessment: { 
    label: 'Reavaliação', 
    icon: Calendar,
    description: 'Reavaliações de stratum ou forças pendentes'
  },
  goal_deadline: { 
    label: 'Prazos', 
    icon: Clock,
    description: 'Metas com prazos próximos ou vencidos'
  },
  milestone: { 
    label: 'Marcos', 
    icon: Target,
    description: 'Marcos de desenvolvimento próximos'
  },
  streak: { 
    label: 'Engajamento', 
    icon: TrendingDown,
    description: 'Pacientes com baixo engajamento'
  },
  achievement: { 
    label: 'Conquistas', 
    icon: Award,
    description: 'Conquistas prestes a serem desbloqueadas'
  }
}

export function DevelopmentAlerts() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<DevelopmentAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [scope, setScope] = useState<'personal' | 'team' | 'all'>('all')
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      const response = await fetch(`/api/development/alerts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')
      
      const data = await response.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os alertas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [scope])

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
    toast({
      title: 'Alerta dispensado',
      description: 'O alerta foi removido da lista'
    })
  }

  const handleAction = (alert: DevelopmentAlert) => {
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (dismissedAlerts.has(alert.id)) return false
    if (selectedTab === 'all') return true
    return alert.type === selectedTab
  })

  const renderAlertCard = (alert: DevelopmentAlert) => {
    const priority = priorityConfig[alert.priority]
    const type = typeConfig[alert.type]
    const TypeIcon = type.icon

    return (
      <Card 
        key={alert.id} 
        className={`border-l-4 ${
          alert.priority === 'urgent' ? 'border-l-red-500' :
          alert.priority === 'high' ? 'border-l-orange-500' :
          alert.priority === 'medium' ? 'border-l-yellow-500' :
          'border-l-green-500'
        } hover:shadow-md transition-shadow`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${priority.bgLight}`}>
              <TypeIcon className={`h-5 w-5 ${priority.textColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <Badge variant="outline" className={`text-xs ${priority.textColor}`}>
                  {priority.label}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {alert.message}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {alert.userName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {alert.userName}
                  </span>
                )}
                {alert.daysRemaining !== undefined && (
                  <span className={`flex items-center gap-1 ${
                    alert.daysRemaining < 0 ? 'text-red-600 font-medium' :
                    alert.daysRemaining <= 7 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    <Clock className="h-3 w-3" />
                    {alert.daysRemaining < 0 
                      ? `${Math.abs(alert.daysRemaining)} dias atrasado`
                      : `${alert.daysRemaining} dias restantes`
                    }
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {alert.actionUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(alert)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-purple-600" />
            Central de Alertas
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Acompanhe reavaliações, prazos e engajamento dos pacientes
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'personal' | 'team' | 'all')}
            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value="personal">Meus Pacientes</option>
            <option value="team">Minha Equipe</option>
            <option value="all">Toda Organização</option>
          </select>
          
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Urgente</p>
                <p className="text-2xl font-bold text-red-600">{summary?.byPriority.urgent || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alta Prioridade</p>
                <p className="text-2xl font-bold text-orange-600">{summary?.byPriority.high || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Média</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.byPriority.medium || 0}</p>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Baixa</p>
                <p className="text-2xl font-bold text-green-600">{summary?.byPriority.low || 0}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-purple-600">{summary?.total || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alertas Ativos</CardTitle>
              <CardDescription>
                {filteredAlerts.length} alertas pendentes de ação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Todos ({alerts.filter(a => !dismissedAlerts.has(a.id)).length})
              </TabsTrigger>
              {Object.entries(typeConfig).map(([key, config]) => {
                const TypeIcon = config.icon
                const count = alerts.filter(a => a.type === key && !dismissedAlerts.has(a.id)).length
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4" />
                    {config.label} ({count})
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-3 mt-0">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Nenhum alerta pendente
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Todos os alertas foram resolvidos ou dispensados
                  </p>
                </div>
              ) : (
                filteredAlerts.map(renderAlertCard)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/development/analytics')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Ver Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Visão agregada do desenvolvimento
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/patients')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Gerenciar Pacientes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ver e editar perfis de desenvolvimento
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/hr')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Dashboard RH</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Visão geral de recursos humanos
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
