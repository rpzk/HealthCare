'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Download,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  FileCode,
  HelpCircle,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============ TIPOS ============

interface ESUSConfig {
  configured: boolean
  cnes: string
  ine: string
  ibgeCode: string
  errors: string[]
}

interface ESUSStats {
  [key: string]: number
}

interface ESUSBatch {
  id: string
  batchId: string | null
  status: string
  submittedAt: string
  processedAt: string | null
  fichaType: string
}

interface ESUSFicha {
  id: string
  fichaType: string
  localResourceId: string
  protocolo: string | null
  status: string
  error: string | null
  submittedAt: string
  processedAt: string | null
}

// ============ COMPONENTES ============

function HelpGuide() {
  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200">
      <HelpCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>e-SUS AB (Atenção Básica)</strong> - Sistema do Ministério da Saúde para registro
        de produção ambulatorial na Atenção Primária. As fichas CDS (Coleta de Dados Simplificada)
        geradas aqui podem ser importadas diretamente no PEC e-SUS AB da sua UBS ou enviadas via
        centralizador municipal.
      </AlertDescription>
    </Alert>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    GENERATED: { variant: 'secondary', icon: <FileCode className="h-3 w-3 mr-1" /> },
    PENDING: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
    SUBMITTED: { variant: 'default', icon: <RefreshCw className="h-3 w-3 mr-1" /> },
    ACCEPTED: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    REJECTED: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> }
  }

  const { variant, icon } = variants[status] || { variant: 'outline' as const, icon: null }

  return (
    <Badge variant={variant} className="flex items-center w-fit">
      {icon}
      {status}
    </Badge>
  )
}

function StatsCards({ stats, pendingCount }: { stats: ESUSStats; pendingCount: number }) {
  const totalGenerated = stats.GENERATED || 0
  const totalAccepted = stats.ACCEPTED || 0
  const totalRejected = stats.REJECTED || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consultas Pendentes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fichas Geradas</p>
              <p className="text-2xl font-bold">{totalGenerated}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aceitas</p>
              <p className="text-2xl font-bold text-green-600">{totalAccepted}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejeitadas</p>
              <p className="text-2xl font-bold text-red-600">{totalRejected}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ExportDialog({
  onExport,
  loading
}: {
  onExport: (startDate: string, endDate: string) => void
  loading: boolean
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Default: último mês
  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }, [])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Exportar Lote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Fichas CDS</DialogTitle>
          <DialogDescription>
            Selecione o período para gerar o lote de fichas de atendimento individual no formato e-SUS AB.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => onExport(startDate, endDate)}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileCode className="h-4 w-4 mr-2" />
                Gerar XML
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ PÁGINA PRINCIPAL ============

export default function ESUSAdminPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [config, setConfig] = useState<ESUSConfig | null>(null)
  const [stats, setStats] = useState<ESUSStats>({})
  const [recentBatches, setRecentBatches] = useState<ESUSBatch[]>([])
  const [fichas, setFichas] = useState<ESUSFicha[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/esus')
      if (!response.ok) throw new Error('Erro ao carregar dados')
      
      const data = await response.json()
      setConfig(data.config)
      setStats(data.stats || {})
      setRecentBatches(data.recentBatches || [])
      setPendingCount(data.pendingConsultations || 0)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do e-SUS',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Carregar fichas
  const loadFichas = async () => {
    try {
      const response = await fetch('/api/admin/esus/fichas')
      if (!response.ok) throw new Error('Erro ao carregar fichas')
      
      const data = await response.json()
      setFichas(data.fichas || [])
    } catch (error) {
      console.error('Erro ao carregar fichas:', error)
    }
  }

  // Exportar lote
  const handleExport = async (startDate: string, endDate: string) => {
    try {
      setExportLoading(true)
      
      const response = await fetch('/api/admin/esus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, format: 'xml' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro na exportação')
      }

      // Baixar o XML
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `esus_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Exportação concluída',
        description: 'O arquivo XML foi gerado e baixado com sucesso.',
      })

      loadData()
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setExportLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'fichas') {
      loadFichas()
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">e-SUS Atenção Básica</h1>
          <p className="text-muted-foreground">
            Exportação de fichas CDS para o Sistema de Informação da Atenção Básica (SISAB)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <ExportDialog onExport={handleExport} loading={exportLoading} />
        </div>
      </div>

      <HelpGuide />

      {/* Alerta de configuração */}
      {config && !config.configured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuração Pendente:</strong> {config.errors.join(', ')}
            <br />
            Configure as variáveis de ambiente ESUS_CNES, ESUS_INE e ESUS_IBGE_CODE.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <StatsCards stats={stats} pendingCount={pendingCount} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="batches">Lotes Exportados</TabsTrigger>
          <TabsTrigger value="fichas">Fichas Individuais</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Ficha Suportados</CardTitle>
                <CardDescription>
                  Fichas CDS que podem ser exportadas para o e-SUS AB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Ficha de Atendimento Individual</p>
                        <p className="text-sm text-muted-foreground">Consultas médicas e de enfermagem</p>
                      </div>
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Ficha de Procedimentos</p>
                        <p className="text-sm text-muted-foreground">Procedimentos realizados (SIGTAP)</p>
                      </div>
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Ficha de Visita Domiciliar</p>
                        <p className="text-sm text-muted-foreground">Visitas dos ACS</p>
                      </div>
                    </div>
                    <Badge variant="outline">Em breve</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guia Rápido</CardTitle>
                <CardDescription>
                  Como usar a exportação e-SUS AB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 list-decimal list-inside text-sm">
                  <li>
                    <strong>Configure as credenciais:</strong> Defina ESUS_CNES, ESUS_INE e ESUS_IBGE_CODE
                    nas variáveis de ambiente.
                  </li>
                  <li>
                    <strong>Registre os atendimentos:</strong> Complete as consultas normalmente no sistema,
                    preenchendo CID/CIAP, procedimentos e condutas.
                  </li>
                  <li>
                    <strong>Exporte o lote:</strong> Clique em &quot;Exportar Lote&quot;, selecione o período
                    e baixe o arquivo XML.
                  </li>
                  <li>
                    <strong>Importe no PEC:</strong> No e-SUS AB da sua UBS, vá em &quot;Importar Dados&quot;
                    e selecione o arquivo XML gerado.
                  </li>
                  <li>
                    <strong>Valide os dados:</strong> O PEC irá validar as fichas e mostrar possíveis
                    inconsistências para correção.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Lotes */}
        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Lotes Exportados</CardTitle>
              <CardDescription>
                Histórico de exportações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentBatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum lote exportado ainda</p>
                  <p className="text-sm">Use o botão &quot;Exportar Lote&quot; para gerar o primeiro</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID do Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Geração</TableHead>
                      <TableHead>Processado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-xs">
                          {batch.batchId?.substring(0, 8) || '-'}
                        </TableCell>
                        <TableCell>{batch.fichaType}</TableCell>
                        <TableCell>
                          <StatusBadge status={batch.status} />
                        </TableCell>
                        <TableCell>
                          {format(new Date(batch.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {batch.processedAt
                            ? format(new Date(batch.processedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Fichas */}
        <TabsContent value="fichas">
          <Card>
            <CardHeader>
              <CardTitle>Fichas Individuais</CardTitle>
              <CardDescription>
                Fichas geradas individualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fichas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ficha individual gerada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Recurso Local</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichas.map((ficha) => (
                      <TableRow key={ficha.id}>
                        <TableCell>{ficha.fichaType}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {ficha.localResourceId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{ficha.protocolo || '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={ficha.status} />
                        </TableCell>
                        <TableCell>
                          {format(new Date(ficha.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuração */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do e-SUS AB</CardTitle>
              <CardDescription>
                Parâmetros necessários para exportação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNES (Cadastro Nacional de Estabelecimentos de Saúde)</Label>
                    <Input
                      value={config?.cnes || ''}
                      readOnly
                      className="bg-muted"
                      placeholder="Não configurado"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variável: ESUS_CNES
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>INE (Identificador Nacional de Equipe)</Label>
                    <Input
                      value={config?.ine || ''}
                      readOnly
                      className="bg-muted"
                      placeholder="Não configurado"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variável: ESUS_INE (opcional para UBS sem ESF)
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Código IBGE do Município</Label>
                  <Input
                    value={config?.ibgeCode || ''}
                    readOnly
                    className="bg-muted"
                    placeholder="Não configurado"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variável: ESUS_IBGE_CODE
                  </p>
                </div>

                {config && !config.configured && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Erros de configuração:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {config.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {config?.configured && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Configuração válida! O sistema está pronto para exportar fichas.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
