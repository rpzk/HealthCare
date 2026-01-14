'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Eye,
  Download,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ResetRecord {
  id: string
  timestamp: string
  initiatedBy: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  exported: number
  deleted: number
  restored: number
  error?: string
}

export default function DatabaseResetPage() {
  const [history, setHistory] = useState<ResetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/database-reset')
      const data = await res.json()

      if (data.success) {
        setHistory(data.history || [])
      } else {
        toast.error('Erro ao carregar histórico')
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirmReset) {
      toast.error('Confirme que entende o que será deletado')
      return
    }

    try {
      setResetting(true)
      const res = await fetch('/api/admin/database-reset', {
        method: 'POST',
      })

      const data = await res.json()

      if (data.success) {
        toast.success(
          `✅ Reset concluído! ${data.stats.deleted} registros deletados, ${data.stats.preserved.total} dados mestres preservados`
        )
        setConfirmReset(false)
        setTimeout(loadHistory, 1000)
      } else {
        toast.error(data.error || 'Erro ao fazer reset')
      }
    } catch (error) {
      toast.error('Erro ao fazer reset')
      console.error(error)
    } finally {
      setResetting(false)
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('⚠️ Tem certeza que deseja limpar o histórico de resets?')) return

    try {
      const res = await fetch('/api/admin/database-reset', {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Histórico limpo')
        setHistory([])
      } else {
        toast.error('Erro ao limpar histórico')
      }
    } catch (error) {
      toast.error('Erro ao limpar histórico')
      console.error(error)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reset de Banco de Dados</h1>
        <p className="text-muted-foreground mt-2">
          Limpe dados transacionais preservando dados mestres (CBO, CID, medicações)
        </p>
      </div>

      <Tabs defaultValue="reset" className="w-full">
        <TabsList>
          <TabsTrigger value="reset">Realizar Reset</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        {/* TAB: RESET */}
        <TabsContent value="reset" className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-900">⚠️ Operação Irreversível</AlertTitle>
            <AlertDescription className="text-red-800 mt-2">
              Esta operação é irreversível. Tenha certeza de fazer um backup antes de continuar.
            </AlertDescription>
          </Alert>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Reset Inteligente
              </CardTitle>
              <CardDescription>
                Remove dados transacionais mas preserva dados mestres
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* O que será deletado */}
              <div>
                <h3 className="font-semibold text-red-700 mb-2">🗑️ Será DELETADO:</h3>
                <ul className="space-y-1 text-sm text-red-600 ml-4">
                  <li>✗ Pacientes</li>
                  <li>✗ Consultas</li>
                  <li>✗ Prescrições</li>
                  <li>✗ Pedidos de Exame</li>
                  <li>✗ Registros Médicos</li>
                  <li>✗ Resultados de Exame</li>
                  <li>✗ Atestados</li>
                  <li>✗ Usuários (exceto ADMIN)</li>
                </ul>
              </div>

              {/* O que será preservado */}
              <div className="pt-4">
                <h3 className="font-semibold text-green-700 mb-2">✅ Será PRESERVADO:</h3>
                <ul className="space-y-1 text-sm text-green-600 ml-4">
                  <li>✓ CBO (Ocupações) - 2.500+ registros</li>
                  <li>✓ Códigos Médicos - 10.000+ registros</li>
                  <li>✓ Medicações - 359+ registros</li>
                  <li>✓ Configurações do Sistema</li>
                  <li>✓ Usuários ADMIN</li>
                </ul>
              </div>

              {/* Confirmar */}
              <div className="pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmReset}
                    onChange={(e) => setConfirmReset(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    Entendo que isto vai deletar todos os dados transacionais e não pode ser revertido
                  </span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleReset}
                  disabled={!confirmReset || resetting}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                >
                  {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {resetting ? 'Resetando...' : 'Realizar Reset'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informação sobre processo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Processo de Reset</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>O reset seguro executa os seguintes passos:</p>
              <ol className="space-y-1 ml-4 list-decimal text-muted-foreground">
                <li>Exporta dados mestres para backup</li>
                <li>Deleta todos os dados transacionais</li>
                <li>Recria usuário administrador padrão</li>
                <li>Restaura dados mestres automaticamente</li>
                <li>Registra o reset no histórico</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: HISTÓRICO */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Resets</CardTitle>
                <CardDescription>Últimos 50 resets executados</CardDescription>
              </div>
              {history.length > 0 && (
                <Button
                  onClick={handleClearHistory}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum reset realizado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice().reverse().map((record) => (
                    <div
                      key={record.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {record.id}
                          </span>
                          <Badge className={statusColor(record.status)}>
                            {statusIcon(record.status)}
                            <span className="ml-1 capitalize">{record.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm">
                          Por: <span className="font-medium">{record.initiatedBy}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(record.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="text-right text-sm space-y-1">
                        {record.status === 'completed' && (
                          <>
                            <div>
                              🗑️ <span className="font-medium">{record.deleted}</span> deletados
                            </div>
                            <div>
                              ✅ <span className="font-medium">{record.restored}</span> restaurados
                            </div>
                          </>
                        )}
                        {record.status === 'failed' && (
                          <div className="text-red-600 text-xs max-w-xs">
                            {record.error || 'Erro desconhecido'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: INFORMAÇÕES */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados Mestres Preservados</CardTitle>
              <CardDescription>
                Estes dados são mantidos após cada reset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dados mestres */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-700">2.500+</p>
                      <p className="text-sm text-blue-600 mt-1">CBO (Ocupações)</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-700">10.000+</p>
                      <p className="text-sm text-green-600 mt-1">Diagnósticos (CID)</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-700">359+</p>
                      <p className="text-sm text-purple-600 mt-1">Medicações</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scripts de Linha de Comando</CardTitle>
              <CardDescription>
                Para automação ou backup adicional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-mono text-sm bg-muted p-2 rounded mb-1">
                  npm run export:master-data
                </p>
                <p className="text-sm text-muted-foreground">
                  Exporta CBO, CID e medicações para JSON
                </p>
              </div>
              <div>
                <p className="font-mono text-sm bg-muted p-2 rounded mb-1">
                  npm run db:reset:safe
                </p>
                <p className="text-sm text-muted-foreground">
                  Reset interativo com confirmação
                </p>
              </div>
              <div>
                <p className="font-mono text-sm bg-muted p-2 rounded mb-1">
                  npm run db:reset:safe:confirm
                </p>
                <p className="text-sm text-muted-foreground">
                  Reset automatizado (pula confirmações)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Passos Após Reset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                1. <strong>Login:</strong> admin@healthcare.com / admin123
              </p>
              <p>
                2. <strong>Importe dados:</strong>
              </p>
              <p className="font-mono text-xs bg-muted p-2 ml-4">
                npm run import:medications -- --file medicamentos_reais.csv
              </p>
              <p className="font-mono text-xs bg-muted p-2 ml-4 mt-1">
                npm run import:patients -- --file pacientes_reais.csv --assignToUserId &lt;userId&gt;
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
