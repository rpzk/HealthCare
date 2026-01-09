'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Download, Trash2, RotateCcw, Lock, CheckCircle2, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Backup {
  id: string
  filename: string
  size: number
  sizeHuman: string
  createdAt: string
  hasLog: boolean
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [gdriveConfigured, setGdriveConfigured] = useState(false)
  const [gdriveFolderId, setGdriveFolderId] = useState('')
  const [gdriveJson, setGdriveJson] = useState('')

  useEffect(() => {
    loadBackups()
    loadConfig()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/backups')
      const data = await res.json()

      if (data.success) {
        setBackups(data.backups || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar backups')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/backups/config')
      const data = await res.json()

      if (data.success) {
        setGdriveConfigured(Boolean(data.configured))
        setGdriveFolderId(data.folderId || '')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleSaveGdrive = async () => {
    if (!gdriveJson || !gdriveFolderId) {
      toast.error('Informe o JSON da service account e o Folder ID')
      return
    }

    try {
      setSavingConfig(true)
      const res = await fetch('/api/admin/backups/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: gdriveJson, folderId: gdriveFolderId }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Google Drive configurado')
        setGdriveConfigured(true)
        setGdriveJson('')
      } else {
        toast.error(data.error || 'Erro ao salvar credenciais')
      }
    } catch (error) {
      toast.error('Erro ao salvar credenciais')
      console.error(error)
    } finally {
      setSavingConfig(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      const res = await fetch('/api/admin/backups', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || 'Backup criado com sucesso!')
        setTimeout(loadBackups, 2000)
      } else {
        toast.error(data.error || 'Erro ao criar backup')
      }
    } catch (error) {
      toast.error('Erro ao criar backup')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      window.location.href = `/api/admin/backups/download?filename=${encodeURIComponent(filename)}`
    } catch (error) {
      toast.error('Erro ao baixar backup')
      console.error(error)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('Tem certeza que deseja deletar este backup?')) return

    try {
      const res = await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Backup deletado com sucesso')
        loadBackups()
      } else {
        toast.error(data.error || 'Erro ao deletar backup')
      }
    } catch (error) {
      toast.error('Erro ao deletar backup')
      console.error(error)
    }
  }

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm('⚠️ AVISO: Restaurar um backup irá SOBRESCREVER todos os dados atuais!\n\nDeseja realmente continuar?')) {
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Backup restaurado com sucesso. Atualizando página...')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        toast.error(data.error || 'Erro ao restaurar backup')
      }
    } catch (error) {
      toast.error('Erro ao restaurar backup')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Backups</h1>
        <p className="text-muted-foreground mt-2">
          Banco de dados + certificados digitais (A1/A3/A4)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Backup</CardTitle>
          <CardDescription>
            Inclui banco de dados completo e todas as configurações críticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateBackup}
            disabled={creating}
            size="lg"
            className="w-full sm:w-auto"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? 'Criando backup...' : 'Criar Backup Manual Agora'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Drive (cópia externa)</CardTitle>
          <CardDescription>
            Usa conta de serviço + Folder ID. Valores são salvos criptografados em System Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {gdriveConfigured ? (
              <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-green-700">Configurado</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-amber-600" /><span className="text-amber-700">Não configurado</span></>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gdrive-folder">Folder ID (pasta de destino)</Label>
            <Input
              id="gdrive-folder"
              placeholder="Ex: 1AbcDefG..."
              value={gdriveFolderId}
              onChange={(e) => setGdriveFolderId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gdrive-json">Service Account JSON</Label>
            <Textarea
              id="gdrive-json"
              placeholder="Cole aqui o JSON completo da service account"
              value={gdriveJson}
              onChange={(e) => setGdriveJson(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">O JSON é salvo criptografado e não será exibido novamente.</p>
          </div>
          <Button onClick={handleSaveGdrive} disabled={savingConfig}>
            {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {savingConfig ? 'Salvando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backups Disponíveis</CardTitle>
          <CardDescription>{backups.length} backup(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum backup encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie o primeiro backup para proteger seus dados
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium">{backup.filename}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{backup.sizeHuman}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(backup.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {backup.hasLog && (
                        <Badge variant="outline" className="text-xs">
                          ✓ Log disponível
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.filename)}
                      title="Baixar backup"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.filename)}
                      title="Restaurar de este backup"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.filename)}
                      title="Deletar backup"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que está protegido?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✓ Banco de dados PostgreSQL completo (pacientes, consultas, etc)</li>
            <li>✓ TODAS as configurações críticas (env, docker-compose, prisma)</li>
            <li>✓ Configurações salvas no sistema (SMTP, email, segurança)</li>
            <li>✓ Certificados digitais (A1, A3, A4) do filesystem</li>
            <li>✓ Arquivo de fallback (data/settings.json)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
