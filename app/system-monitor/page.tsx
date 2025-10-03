'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Activity, 
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Minus
} from 'lucide-react'

type MetricStatus = 'good' | 'warning' | 'critical'
type ServiceStatus = 'online' | 'offline' | 'maintenance'
type LogLevel = 'info' | 'warning' | 'error' | 'critical'
type LogLevelFilter = 'all' | LogLevel
type ServiceFilter = 'all' | 'API' | 'Database' | 'Cache' | 'Storage' | 'Email'
const AUTO_REFRESH_INTERVAL_MS = 30_000

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
    status: MetricStatus
  }
  memory: {
    used: number
    total: number
    percentage: number
    status: MetricStatus
  }
  storage: {
    used: number
    total: number
    percentage: number
    status: MetricStatus
  }
  database: {
    connections: number
    maxConnections: number
    queryTime: number
    status: MetricStatus
  }
  network: {
    latency: number
    uptime: number
    status: MetricStatus
  }
  services: {
    api: ServiceStatus
    database: ServiceStatus
    cache: ServiceStatus
    storage: ServiceStatus
    email: ServiceStatus
  }
}

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  service: string
  message: string
  details?: string
  userId?: string
  ip?: string
}

export default function SystemMonitorPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [logLevel, setLogLevel] = useState<LogLevelFilter>('all')
  const [selectedService, setSelectedService] = useState<ServiceFilter>('all')

  const fetchSystemData = useCallback(() => {
    // Simular dados do sistema
    const mockMetrics: SystemMetrics = {
      cpu: {
        usage: Math.random() * 100,
        cores: 8,
        temperature: 45 + Math.random() * 20,
        status: 'good'
      },
      memory: {
        used: 6.4,
        total: 16,
        percentage: 40 + Math.random() * 30,
        status: 'good'
      },
      storage: {
        used: 245,
        total: 500,
        percentage: 49 + Math.random() * 20,
        status: 'good'
      },
      database: {
        connections: Math.floor(15 + Math.random() * 10),
        maxConnections: 100,
        queryTime: 12 + Math.random() * 8,
        status: 'good'
      },
      network: {
        latency: 8 + Math.random() * 5,
        uptime: 99.8,
        status: 'good'
      },
      services: {
        api: 'online',
        database: 'online',
        cache: 'online',
        storage: 'online',
        email: 'online'
      }
    }

    // Determinar status baseado nos valores
    if (mockMetrics.cpu.usage > 80) mockMetrics.cpu.status = 'warning'
    if (mockMetrics.cpu.usage > 95) mockMetrics.cpu.status = 'critical'
    
    if (mockMetrics.memory.percentage > 70) mockMetrics.memory.status = 'warning'
    if (mockMetrics.memory.percentage > 85) mockMetrics.memory.status = 'critical'
    
    if (mockMetrics.storage.percentage > 75) mockMetrics.storage.status = 'warning'
    if (mockMetrics.storage.percentage > 90) mockMetrics.storage.status = 'critical'

    setMetrics(mockMetrics)

    // Simular logs apenas na primeira carga
    setLogs((previousLogs) => {
      if (previousLogs.length > 0) {
        return previousLogs
      }
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          level: 'info',
          service: 'API',
          message: 'Sistema iniciado com sucesso',
          details: 'Todos os serviços estão funcionais',
          ip: '192.168.1.100'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          level: 'warning',
          service: 'Database',
          message: 'Tempo de consulta elevado detectado',
          details: 'Query executada em 2.5s - acima do limite de 2s',
          userId: 'user_123'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          level: 'info',
          service: 'Cache',
          message: 'Cache limpo automaticamente',
          details: '1.2GB de dados removidos do cache'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          level: 'error',
          service: 'Email',
          message: 'Falha ao enviar email de notificação',
          details: 'SMTP timeout após 30s',
          userId: 'user_456',
          ip: '192.168.1.101'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          level: 'info',
          service: 'Storage',
          message: 'Backup automatico concluído',
          details: 'Backup de 2.1GB salvo com sucesso'
        },
        {
          id: '6',
          timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
          level: 'critical',
          service: 'API',
          message: 'Tentativa de acesso não autorizado',
          details: 'Múltiplas tentativas de login falharam',
          ip: '203.45.67.89'
        },
        {
          id: '7',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          level: 'warning',
          service: 'Database',
          message: 'Conexões próximas do limite',
          details: '85/100 conexões ativas'
        },
        {
          id: '8',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          level: 'info',
          service: 'API',
          message: 'Nova versão implantada',
          details: 'Sistema atualizado para v2.1.0',
          userId: 'admin'
        }
      ]
      return mockLogs
    })

    setLoading(false)
  }, [])

  const filterLogs = useCallback(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filtered = logs.filter((log) => {
      if (logLevel !== 'all' && log.level !== logLevel) {
        return false
      }
      if (selectedService !== 'all' && log.service.toLowerCase() !== selectedService.toLowerCase()) {
        return false
      }
      if (!normalizedSearch) {
        return true
      }
      const detailsMatch = log.details?.toLowerCase().includes(normalizedSearch) ?? false
      const userMatch = log.userId?.toLowerCase().includes(normalizedSearch) ?? false
      const ipMatch = log.ip?.toLowerCase().includes(normalizedSearch) ?? false
      return (
        log.message.toLowerCase().includes(normalizedSearch) ||
        log.service.toLowerCase().includes(normalizedSearch) ||
        detailsMatch ||
        userMatch ||
        ipMatch
      )
    })

    setFilteredLogs(filtered)
  }, [logs, logLevel, searchTerm, selectedService])

  useEffect(() => {
    fetchSystemData()
  }, [fetchSystemData])

  useEffect(() => {
    if (!autoRefresh) {
      return undefined
    }
    const intervalId = window.setInterval(() => {
      fetchSystemData()
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [autoRefresh, fetchSystemData])

  useEffect(() => {
    filterLogs()
  }, [filterLogs])

  const getStatusColor = (status: MetricStatus | ServiceStatus) => {
    switch (status) {
      case 'good':
      case 'online':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
      case 'offline':
        return 'text-red-600 bg-red-100'
      case 'maintenance':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: MetricStatus | ServiceStatus) => {
    switch (status) {
      case 'good':
      case 'online':
        return <CheckCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'critical':
      case 'offline':
        return <AlertTriangle className="h-4 w-4" />
      case 'maintenance':
        return <Clock className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'critical':
        return 'text-red-600 bg-red-200 border-red-300'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const services: ServiceFilter[] = ['all', 'API', 'Database', 'Cache', 'Storage', 'Email']
  const logLevels: LogLevelFilter[] = ['all', 'info', 'warning', 'error', 'critical']

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitor do Sistema</h1>
            <p className="text-sm text-gray-500">
              Monitoramento em tempo real da infraestrutura
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`flex items-center space-x-2 ${
              autoRefresh ? 'bg-green-50 border-green-200' : ''
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}</span>
          </Button>

          <Button onClick={() => fetchSystemData()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status dos Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-blue-600" />
            <span>Status dos Serviços</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(metrics.services).map(([service, status]) => (
              <div key={service} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </div>
                <h3 className="font-medium text-gray-900 capitalize">{service}</h3>
                <Badge className={`${getStatusColor(status)} border-0 text-xs capitalize`}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                <span>CPU</span>
              </div>
              <Badge className={getStatusColor(metrics.cpu.status)}>
                {metrics.cpu.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Uso</span>
                  <span>{metrics.cpu.usage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.cpu.status === 'critical' ? 'bg-red-500' :
                      metrics.cpu.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.cpu.usage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Cores: {metrics.cpu.cores}</p>
                <p>Temp: {metrics.cpu.temperature.toFixed(1)}°C</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memória */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-5 w-5 text-purple-600" />
                <span>Memória</span>
              </div>
              <Badge className={getStatusColor(metrics.memory.status)}>
                {metrics.memory.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Uso</span>
                  <span>{metrics.memory.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.memory.status === 'critical' ? 'bg-red-500' :
                      metrics.memory.status === 'warning' ? 'bg-yellow-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${metrics.memory.percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>{metrics.memory.used.toFixed(1)} / {metrics.memory.total} GB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Armazenamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-orange-600" />
                <span>Armazenamento</span>
              </div>
              <Badge className={getStatusColor(metrics.storage.status)}>
                {metrics.storage.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Uso</span>
                  <span>{metrics.storage.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.storage.status === 'critical' ? 'bg-red-500' :
                      metrics.storage.status === 'warning' ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${metrics.storage.percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>{metrics.storage.used} / {metrics.storage.total} GB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banco de Dados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-green-600" />
                <span>Database</span>
              </div>
              <Badge className={getStatusColor(metrics.database.status)}>
                {metrics.database.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs text-gray-500">
              <p>Conexões: {metrics.database.connections}/{metrics.database.maxConnections}</p>
              <p>Query time: {metrics.database.queryTime.toFixed(1)}ms</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${(metrics.database.connections / metrics.database.maxConnections) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs do Sistema */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                <span>Logs do Sistema</span>
              </CardTitle>
              <CardDescription>
                Últimas atividades e eventos do sistema
              </CardDescription>
            </div>

            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={logLevel}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setLogLevel(event.target.value as LogLevelFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {logLevels.map(level => (
                <option key={level} value={level}>
                  {level === 'all' ? 'Todos os níveis' : level.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={selectedService}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedService(event.target.value as ServiceFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {services.map(service => (
                <option key={service} value={service}>
                  {service === 'all' ? 'Todos os serviços' : service}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Logs */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum log encontrado</h3>
                <p className="text-gray-500">
                  Ajuste os filtros para ver mais resultados
                </p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge className={getLogLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {log.service}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-1">
                        {log.message}
                      </h4>

                      {log.details && (
                        <p className="text-sm text-gray-600 mb-2">
                          {log.details}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {log.userId && <span>User: {log.userId}</span>}
                        {log.ip && <span>IP: {log.ip}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
