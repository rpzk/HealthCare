'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Server,
  Database,
  Cpu,
  MemoryStick,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Stethoscope,
  Calendar
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'

interface SystemData {
  system: {
    hostname: string
    platform: string
    arch: string
    nodeVersion: string
    uptime: string
    uptimeSeconds: number
  }
  memory: {
    total: number
    used: number
    free: number
    usage: number
  }
  cpu: {
    count: number
    model: string
    usage: number
  }
  database: {
    users: number
    patients: number
    consultations: number
    status: string
  }
  services: {
    api: { status: string; latency: string }
    database: { status: string; latency: string }
    auth: { status: string }
  }
}

export default function SystemMonitorPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/system')
      if (!response.ok) {
        if (response.status === 429) {
          setAutoRefresh(false)
          throw new Error('Muitas requisições. Auto-atualização pausada por 60s.')
        }
        if (response.status === 403) {
          throw new Error('Acesso restrito a administradores')
        }
        throw new Error('Erro ao carregar dados')
      }
      const result = await response.json()
      setData(result)
      setLastUpdate(new Date())
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(message)
      console.error('Erro ao carregar métricas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!autoRefresh) {
      const t = setTimeout(() => setAutoRefresh(true), 60_000)
      return () => clearTimeout(t)
    }
  }, [autoRefresh])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 10000) // 10 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  const getStatusBadge = (status: string) => {
    if (status === 'healthy' || status === 'connected') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Saudável</Badge>
    }
    if (status === 'warning') {
      return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Atenção</Badge>
    }
    return <Badge variant="destructive">Offline</Badge>
  }

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500'
    if (usage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-xl font-semibold">Acesso Restrito</h2>
                <p className="text-muted-foreground mt-2">
                  Esta página é acessível apenas para administradores.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <PageHeader
            title="Monitor do Sistema"
            description="Acompanhe o status e desempenho do sistema em tempo real"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Sistema' }
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  {autoRefresh ? 'Auto' : 'Manual'}
                </Button>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            }
          />

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                {error}
              </CardContent>
            </Card>
          )}

          {loading && !data ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Carregando métricas...</p>
              </CardContent>
            </Card>
          ) : data && (
            <>
              {/* Status geral */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">API</p>
                        <p className="font-medium">{data.services.api.latency}</p>
                      </div>
                    </div>
                    {getStatusBadge(data.services.api.status)}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Banco de Dados</p>
                        <p className="font-medium">{data.services.database.latency}</p>
                      </div>
                    </div>
                    {getStatusBadge(data.database.status)}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                        <p className="font-medium">{data.system.uptime}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Online</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas de recursos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5" />
                      CPU
                    </CardTitle>
                    <CardDescription>{data.cpu.model}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Uso</span>
                      <span className="font-medium">{data.cpu.usage}%</span>
                    </div>
                    <Progress value={data.cpu.usage} className={getUsageColor(data.cpu.usage)} />
                    <p className="text-xs text-muted-foreground">{data.cpu.count} núcleos disponíveis</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MemoryStick className="h-5 w-5" />
                      Memória
                    </CardTitle>
                    <CardDescription>{data.memory.total} GB total</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Uso</span>
                      <span className="font-medium">{data.memory.usage}%</span>
                    </div>
                    <Progress value={data.memory.usage} className={getUsageColor(data.memory.usage)} />
                    <p className="text-xs text-muted-foreground">
                      {data.memory.used} GB usado / {data.memory.free} GB livre
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Estatísticas do banco */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Estatísticas do Banco de Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Users className="h-10 w-10 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{data.database.users}</p>
                        <p className="text-sm text-muted-foreground">Usuários</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Stethoscope className="h-10 w-10 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{data.database.patients}</p>
                        <p className="text-sm text-muted-foreground">Pacientes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Calendar className="h-10 w-10 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{data.database.consultations}</p>
                        <p className="text-sm text-muted-foreground">Consultas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info do sistema */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hostname</p>
                      <p className="font-medium">{data.system.hostname}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plataforma</p>
                      <p className="font-medium">{data.system.platform}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Arquitetura</p>
                      <p className="font-medium">{data.system.arch}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Node.js</p>
                      <p className="font-medium">{data.system.nodeVersion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {lastUpdate && (
                <p className="text-xs text-muted-foreground text-center">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
