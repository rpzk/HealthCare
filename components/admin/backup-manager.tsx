'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Download, RefreshCw, Trash2, HardDrive, RotateCw } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Backup {
  id: string
  filename: string
  size: number
  sizeHuman: string
  createdAt: string
  hasLog: boolean
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadBackups()
    const interval = setInterval(loadBackups, 30000) // Recarregar a cada 30s
    return () => clearInterval(interval)
  }, [])

  async function loadBackups() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/backups')
      const data = await res.json()

      if (data.success) {
        setBackups(data.backups || [])
      } else {
        setError(data.message || 'Erro ao carregar backups')
      }
    } catch (err) {
      console.error('[BackupManager] Load error:', err)
      setError('Erro ao carregar backups')
    } finally {
      setLoading(false)
    }
  }

  async function createBackup() {
    try {
      setCreating(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/admin/backups', {
        method: 'POST',
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('✓ Backup criado com sucesso! Atualizando lista...')
        setTimeout(() => {
          loadBackups()
          setSuccess(null)
        }, 2000)
      } else {
        setError(data.error || 'Erro ao criar backup')
      }
    } catch (err) {
      console.error('[BackupManager] Create error:', err)
      setError('Erro ao criar backup')
    } finally {
      setCreating(false)
    }
  }

  async function deleteBackup(filename: string) {
    if (!confirm(`Tem certeza que deseja deletar ${filename}?`)) {
      return
    }

    try {
      setError(null)
      const res = await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('✓ Backup deletado com sucesso')
        loadBackups()
      } else {
        setError(data.error || 'Erro ao deletar backup')
      }
    } catch (err) {
      console.error('[BackupManager] Delete error:', err)
      setError('Erro ao deletar backup')
    }
  }

  async function restoreBackup(filename: string) {
    if (
      !confirm(
        `⚠️ ATENÇÃO!\n\nVocê está prestes a RESTAURAR o backup de ${new Date(
          backups.find((b) => b.filename === filename)?.createdAt || ''
        ).toLocaleString('pt-BR')}.\n\nIsso SOBRESCREVERÁ TODOS os dados atuais do banco de dados.\n\nTem certeza?`
      )
    ) {
      return
    }

    try {
      setRestoring(filename)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(`✓ Backup restaurado com sucesso!\n${data.message}`)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError(data.error || 'Erro ao restaurar backup')
      }
    } catch (err) {
      console.error('[BackupManager] Restore error:', err)
      setError('Erro ao restaurar backup')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Gerenciador de Backups
          </CardTitle>
          <CardDescription>
            Banco de dados + certificados digitais (A1/A3/A4)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-600 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">{success}</AlertTitle>
            </Alert>
          )}

          {/* Botão de backup manual */}
          <div className="flex gap-2">
            <Button
              onClick={createBackup}
              disabled={creating || loading}
              size="sm"
              className="gap-2"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Criando backup...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Criar Backup Manual Agora
                </>
              )}
            </Button>

            <Button
              onClick={loadBackups}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Lista de backups */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">
              Backups Disponíveis ({backups.length})
            </h3>

            {backups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-500">
                {loading ? 'Carregando backups...' : 'Nenhum backup encontrado'}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-gray-600 truncate">
                        {backup.filename}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>{backup.sizeHuman}</span>
                        <span className="mx-2">•</span>
                        <span title={format(new Date(backup.createdAt), 'dd/MM/yyyy HH:mm:ss')}>
                          {formatDistanceToNow(new Date(backup.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {backup.hasLog && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Com log
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={restoring === backup.filename}
                        onClick={() => restoreBackup(backup.filename)}
                        title="Restaurar este backup"
                      >
                        {restoring === backup.filename ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          <RotateCw className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = `/api/admin/backups/download?filename=${encodeURIComponent(backup.filename)}`
                          link.download = backup.filename
                          link.click()
                        }}
                        title="Fazer download do backup"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteBackup(backup.filename)}
                        title="Deletar este backup"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informações adicionais */}
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">ℹ️ Sobre os Backups:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>✅ Banco de dados PostgreSQL completo (pacientes, consultas, etc)</li>
              <li>✅ TODAS as configurações críticas (.env, docker-compose, prisma)</li>
              <li>✅ Configurações salvas no sistema (SMTP, email, segurança)</li>
              <li>✅ Certificados digitais (A1, A3, A4) do filesystem</li>
              <li>✅ Arquivo de fallback (data/settings.json)</li>
              <li>✅ Comprimidos com gzip para economizar espaço</li>
              <li>✅ Criados automaticamente diariamente às 02:00 AM</li>
              <li>✅ Armazenados em: /home/umbrel/backups/healthcare/</li>
              <li>📄 Cada backup inclui manifest.json com metadados</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
