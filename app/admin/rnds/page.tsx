'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Send,
  FileText,
  Activity,
  Users,
  Loader2,
  Info,
  BookOpen,
  Shield,
  Building2,
  ExternalLink
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Tipos
interface RNDSStatus {
  status: {
    connected: boolean
    environment: string
    message: string
  }
  config: {
    clientId: string
    clientSecret: string
    cnes: string
    environment: 'homologation' | 'production'
  } | null
  statistics: {
    byType: Record<string, number>
    errors: number
    pending: number
  }
  recentSubmissions: Array<{
    id: string
    type: string
    localResourceId: string
    rndsResourceId: string | null
    status: string
    error: string | null
    submittedAt: string
  }>
}

interface Submission {
  id: string
  type: string
  localResourceId: string
  rndsResourceId: string | null
  status: string
  error: string | null
  submittedAt: string
  consultation?: {
    id: string
    scheduledAt: string
    patient: { name: string }
    doctor: { user: { name: string } }
  }
}

// Componente de Guia
function HelpGuide() {
  const [expanded, setExpanded] = useState(false)

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <BookOpen className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">📖 Guia - RNDS (Rede Nacional de Dados em Saúde)</AlertTitle>
      <AlertDescription className="text-blue-700 mt-2">
        <div className="space-y-3">
          <p>
            A RNDS é a plataforma nacional de interoperabilidade de dados em saúde do SUS,
            permitindo o compartilhamento seguro de informações entre estabelecimentos de saúde.
          </p>
          
          {expanded && (
            <>
              <div className="bg-white/70 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-3">🔄 Recursos Suportados:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>RAC</strong> - Registro de Atendimento Clínico (consultas)</li>
                  <li><strong>REL</strong> - Resultado de Exame Laboratorial</li>
                  <li><strong>RIA</strong> - Registro de Imunobiológico Administrado</li>
                  <li><strong>Sumário do Paciente</strong> - Consulta de histórico</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Requisitos para Integração
                </h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Certificado digital ICP-Brasil (e-CNPJ ou e-CPF)</li>
                  <li>Cadastro no Portal de Serviços RNDS</li>
                  <li>CNES do estabelecimento ativo</li>
                  <li>Credenciais OAuth2 do gov.br</li>
                </ul>
              </div>

              <div className="flex gap-2 mt-4">
                <a 
                  href="https://rnds.saude.gov.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Portal RNDS <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://simplifier.net/redenacionaldedadosemsaude" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Perfis FHIR BR Core <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
          >
            {expanded ? 'Mostrar menos' : 'Saiba mais...'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Cards de Estatísticas
function StatsCards({ stats }: { stats: RNDSStatus['statistics'] | null }) {
  const total = stats ? Object.values(stats.byType).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-900">{total}</p>
            <p className="text-xs text-green-700">Enviados</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-200 rounded-lg">
            <Activity className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{stats?.byType['ENCOUNTER'] || 0}</p>
            <p className="text-xs text-blue-700">Atendimentos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-200 rounded-lg">
            <FileText className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">{stats?.byType['DIAGNOSTIC_REPORT'] || 0}</p>
            <p className="text-xs text-purple-700">Exames</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-200 rounded-lg">
            <XCircle className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-900">{stats?.errors || 0}</p>
            <p className="text-xs text-red-700">Erros</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Modal de Configuração
function ConfigDialog({
  open,
  onClose,
  currentConfig,
  onSaved
}: {
  open: boolean
  onClose: () => void
  currentConfig: RNDSStatus['config'] | null
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    cnes: '',
    environment: 'homologation' as 'homologation' | 'production'
  })

  useEffect(() => {
    if (currentConfig) {
      setFormData({
        clientId: currentConfig.clientId.includes('****') ? '' : currentConfig.clientId,
        clientSecret: '',
        cnes: currentConfig.cnes,
        environment: currentConfig.environment
      })
    }
  }, [currentConfig])

  const handleSave = async () => {
    if (!formData.clientId || !formData.clientSecret || !formData.cnes) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/rnds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        onSaved()
        onClose()
      } else {
        toast.error(data.error || 'Erro ao salvar configuração')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração RNDS
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais de acesso à Rede Nacional de Dados em Saúde
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              Obtenha as credenciais no Portal de Serviços RNDS após cadastro do estabelecimento.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="cnes">CNES do Estabelecimento *</Label>
            <Input
              id="cnes"
              value={formData.cnes}
              onChange={(e) => setFormData(prev => ({ ...prev, cnes: e.target.value }))}
              placeholder="0000000"
              maxLength={7}
            />
          </div>

          <div>
            <Label htmlFor="clientId">Client ID (OAuth2) *</Label>
            <Input
              id="clientId"
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder={currentConfig?.clientId || 'Seu Client ID'}
            />
          </div>

          <div>
            <Label htmlFor="clientSecret">Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              value={formData.clientSecret}
              onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="••••••••"
            />
            {currentConfig?.clientSecret && (
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para manter o secret atual
              </p>
            )}
          </div>

          <div>
            <Label>Ambiente</Label>
            <Select
              value={formData.environment}
              onValueChange={(v) => setFormData(prev => ({ 
                ...prev, 
                environment: v as 'homologation' | 'production' 
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homologation">🧪 Homologação (testes)</SelectItem>
                <SelectItem value="production">🚀 Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e Testar Conexão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Página Principal
export default function RNDSPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [rndsData, setRndsData] = useState<RNDSStatus | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [configOpen, setConfigOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/rnds')
      if (response.ok) {
        const data = await response.json()
        setRndsData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados RNDS:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/rnds/encounters')
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions)
      }
    } catch (error) {
      console.error('Erro ao carregar submissões:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchSubmissions()
  }, [fetchData, fetchSubmissions])

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Apenas administradores podem acessar as configurações da RNDS.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Cloud className="h-8 w-8 text-blue-600" />
            RNDS
          </h1>
          <p className="text-muted-foreground">
            Rede Nacional de Dados em Saúde - Integração com o SUS
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status de Conexão */}
          {rndsData?.status.connected ? (
            <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Conectado ({rndsData.status.environment})
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
              <CloudOff className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      <HelpGuide />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <StatsCards stats={rndsData?.statistics || null} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                <Activity className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="submissions">
                <Send className="h-4 w-4 mr-2" />
                Envios
              </TabsTrigger>
              <TabsTrigger value="patients">
                <Users className="h-4 w-4 mr-2" />
                Consultar Paciente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status da Integração</CardTitle>
                  <CardDescription>
                    Informações sobre a conexão e configuração da RNDS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Estabelecimento (CNES)</p>
                          <p className="text-sm text-muted-foreground">
                            {rndsData?.config?.cnes || 'Não configurado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Cloud className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Ambiente</p>
                          <p className="text-sm text-muted-foreground">
                            {rndsData?.config?.environment === 'production' 
                              ? '🚀 Produção' 
                              : '🧪 Homologação'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {rndsData?.status.connected ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">Conexão</p>
                          <p className="text-sm text-muted-foreground">
                            {rndsData?.status.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Últimos Envios */}
                  {rndsData?.recentSubmissions && rndsData.recentSubmissions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Últimos Envios</h4>
                      <div className="space-y-2">
                        {rndsData.recentSubmissions.slice(0, 5).map(sub => (
                          <div 
                            key={sub.id} 
                            className="flex items-center justify-between p-3 border rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {sub.type}
                              </Badge>
                              <span className="text-muted-foreground">
                                {format(new Date(sub.submittedAt), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {sub.status === 'SUCCESS' ? (
                              <Badge variant="outline" className="border-green-500 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-red-500 text-red-700">
                                <XCircle className="h-3 w-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Envios</CardTitle>
                  <CardDescription>
                    Atendimentos e exames enviados à RNDS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum envio realizado ainda</p>
                      <p className="text-sm">
                        Os atendimentos finalizados podem ser enviados à RNDS
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Data Envio</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>ID RNDS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map(sub => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <Badge variant="outline">{sub.type}</Badge>
                            </TableCell>
                            <TableCell>
                              {sub.consultation?.patient.name || '-'}
                            </TableCell>
                            <TableCell>
                              {sub.consultation?.doctor.user.name || '-'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(sub.submittedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {sub.status === 'SUCCESS' ? (
                                <Badge variant="outline" className="border-green-500 text-green-700">
                                  Sucesso
                                </Badge>
                              ) : sub.status === 'PENDING' ? (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                  Pendente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-red-500 text-red-700">
                                  Erro
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {sub.rndsResourceId 
                                ? sub.rndsResourceId.substring(0, 20) + '...'
                                : sub.error 
                                  ? <span className="text-red-500" title={sub.error}>Erro</span>
                                  : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patients" className="mt-6">
              <PatientLookup />
            </TabsContent>
          </Tabs>
        </>
      )}

      <ConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        currentConfig={rndsData?.config || null}
        onSaved={fetchData}
      />
    </div>
  )
}

// Componente de Consulta de Paciente
function PatientLookup() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    found: boolean
    cns?: string
    name?: string
    summary?: object
    error?: string
  } | null>(null)

  const handleSearch = async (action: 'cns' | 'summary') => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite um CPF válido com 11 dígitos')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(
        `/api/admin/rnds/patient?cpf=${cpf.replace(/\D/g, '')}&action=${action}`
      )
      const data = await response.json()
      setResult(data)

      if (data.error) {
        toast.error(data.error)
      } else if (data.found) {
        toast.success(action === 'cns' ? 'CNS encontrado!' : 'Sumário carregado')
      } else {
        toast.info('Paciente não encontrado na RNDS')
      }
    } catch {
      toast.error('Erro ao consultar RNDS')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultar Paciente na RNDS</CardTitle>
        <CardDescription>
          Verifique o CNS ou consulte o sumário de saúde de um paciente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="cpf">CPF do Paciente</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleSearch('cns')}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar CNS
            </Button>
            <Button 
              onClick={() => handleSearch('summary')}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buscar Sumário
            </Button>
          </div>
        </div>

        {result && (
          <div className="border rounded-lg p-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : result.found ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Paciente encontrado</span>
                </div>
                {result.name && (
                  <p><strong>Nome:</strong> {result.name}</p>
                )}
                {result.cns && (
                  <p><strong>CNS:</strong> {result.cns}</p>
                )}
                {result.summary && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Sumário de Saúde:</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result.summary, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-5 w-5" />
                <span>Paciente não encontrado na base da RNDS</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
