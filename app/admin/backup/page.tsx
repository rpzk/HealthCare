'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { Loader2, Download, Trash2, RotateCcw, Lock, CheckCircle2, XCircle, CloudUpload, Database, FileText, AlertCircle, Info, HardDrive, Clock, Shield } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Backup {
  id: string
  filename: string
  size: number
  sizeHuman: string
  createdAt: string
  hasLog: boolean
  googleDriveUploaded?: boolean
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [gdriveConfigured, setGdriveConfigured] = useState(false)
  const [gdriveFolderId, setGdriveFolderId] = useState('')
  const [gdriveJson, setGdriveJson] = useState('')
  const [gdriveImpersonate, setGdriveImpersonate] = useState('')
  const [partialLoading, setPartialLoading] = useState(false)
  const [partialItems, setPartialItems] = useState<any[]>([])
  const [domains, setDomains] = useState<{terms:boolean; cid:boolean; cbo:boolean; medications:boolean}>({terms:false,cid:false,cbo:false,medications:false})
  const [domainsExtra, setDomainsExtra] = useState<{ciap2:boolean; nursing:boolean; procedures:boolean; formulaTemplates:boolean}>({ciap2:false,nursing:false,procedures:false,formulaTemplates:false})
  const [entityPatient, setEntityPatient] = useState<{id:string; cpf:string; email:string; name:string}>({id:'', cpf:'', email:'', name:''})
  const [entityUser, setEntityUser] = useState<{id:string; email:string; licenseNumber:string; name:string; role:string}>({id:'', email:'', licenseNumber:'', name:'', role:''})
  const [entityFiles, setEntityFiles] = useState<Array<{filename:string; sizeHuman:string; createdAt:string; type:string}>>([])
  const [pdfExportJobs, setPdfExportJobs] = useState<Record<string, {status:string; progress:number; filename?:string; errorMessage?:string}>>({})
  const [lastBackupSuccess, setLastBackupSuccess] = useState(false)
  const [lastBackupMessage, setLastBackupMessage] = useState('')
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDialogFilename, setEmailDialogFilename] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Estatísticas calculadas
  const backupStats = useMemo(() => {
    const now = Date.now()
    const lastBackup = backups.length > 0 ? new Date(backups[0].createdAt).getTime() : null
    const daysSinceLastBackup = lastBackup ? Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24)) : null
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0)
    const totalSizeHuman = (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
    const driveBackupsCount = backups.filter(b => b.googleDriveUploaded === true).length
    
    return {
      total: backups.length,
      lastBackup: lastBackup ? format(new Date(lastBackup), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : null,
      daysSinceLastBackup,
      totalSizeHuman,
      driveBackupsCount,
      hasRecentBackup: daysSinceLastBackup !== null && daysSinceLastBackup < 1,
      isHealthy: daysSinceLastBackup !== null && daysSinceLastBackup < 7,
    }
  }, [backups])

  useEffect(() => {
    loadBackups()
    loadConfig()
    loadPartial()
    loadEntityFiles()
  }, [])

  // Poll PDF export job status
  useEffect(() => {
    const jobIds = Object.keys(pdfExportJobs)
    if (jobIds.length === 0) return

    const interval = setInterval(() => {
      jobIds.forEach(async (exportId) => {
        try {
          const res = await fetch(`/api/admin/backups/entity/patient/pdf/status?exportId=${encodeURIComponent(exportId)}`)
          const data = await res.json()
          if (res.ok && data.success) {
            setPdfExportJobs(prev => ({
              ...prev,
              [exportId]: {
                status: data.export.status,
                progress: data.export.progress || 0,
                filename: data.export.filename,
                errorMessage: data.export.errorMessage,
              },
            }))
            // Auto-remove completed jobs after 10 seconds
            if (data.export.status === 'COMPLETED' || data.export.status === 'FAILED') {
              setTimeout(() => {
                setPdfExportJobs(prev => {
                  const newJobs = { ...prev }
                  delete newJobs[exportId]
                  return newJobs
                })
              }, 10000)
            }
          }
        } catch (e) {
          console.error('Error polling PDF export status:', e)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [pdfExportJobs])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/backups')
      const data = await res.json()

      if (!res.ok) {
        toastApiError(data, 'Erro ao carregar backups')
        setBackups([])
        return
      }

      if (data.success) {
        setBackups((data.backups || []).map((b: any) => ({
          ...b,
          createdAt: b.createdAt,
        })))
      } else {
        toastApiError(data, 'Erro ao carregar backups')
      }
    } catch (error) {
      toast.error('Erro ao carregar backups')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadPartial = async () => {
    try {
      setPartialLoading(true)
      const res = await fetch('/api/admin/backups/partial')
      const data = await res.json()
      if (res.ok && data.success) {
        setPartialItems(data.items || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setPartialLoading(false)
    }
  }

  const loadEntityFiles = async () => {
    try {
      const res = await fetch('/api/admin/backups/files')
      const data = await res.json()
      if (res.ok && data.success) {
        setEntityFiles((data.items || []).map((it: any) => ({
          filename: it.filename,
          sizeHuman: it.sizeHuman,
          createdAt: it.createdAt,
        })))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/backups/config')
      const data = await res.json()

      if (!res.ok) {
        toastApiError(data, 'Erro ao carregar configuração do Google Drive')
        return
      }

      if (data.success) {
        setGdriveConfigured(Boolean(data.configured))
        setGdriveFolderId(data.folderId || '')
        setGdriveImpersonate(data.impersonateEmail || '')
      } else {
        toastApiError(data, 'Erro ao carregar configuração do Google Drive')
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
        body: JSON.stringify({ serviceAccountJson: gdriveJson, folderId: gdriveFolderId, impersonateEmail: gdriveImpersonate || undefined }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Google Drive configurado')
        setGdriveConfigured(true)
        setGdriveJson('')
      } else {
        toastApiError(data, 'Erro ao salvar credenciais')
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
      setLastBackupSuccess(false)
      setLastBackupMessage('')
      const res = await fetch('/api/admin/backups', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        const uploaded = data.backup?.googleDriveUploaded
        const message = `${data.message || 'Backup criado com sucesso!'}${uploaded === true ? ' 📤 Enviado ao Drive' : uploaded === false ? ' ⚠️ Falha no Drive' : ''}`
        toast.success(message)
        setLastBackupSuccess(true)
        setLastBackupMessage(message)
        setTimeout(() => {
          loadBackups()
          setLastBackupSuccess(false)
          setLastBackupMessage('')
        }, 5000)
      } else {
        toastApiError(data, 'Erro ao criar backup')
        setLastBackupSuccess(false)
        setLastBackupMessage('Falha ao criar backup')
      }
    } catch (error) {
      toast.error('Erro ao criar backup')
      console.error(error)
      setLastBackupSuccess(false)
      setLastBackupMessage('Erro ao criar backup')
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
        toastApiError(data, 'Erro ao deletar backup')
      }
    } catch (error) {
      toast.error('Erro ao deletar backup')
      console.error(error)
    }
  }

  const handleReupload = async (filename: string) => {
    try {
      const res = await fetch('/api/admin/backups/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Reenvio ao Google Drive concluído')
        setTimeout(loadBackups, 1500)
      } else {
        toastApiError(data, 'Falha ao reenviar ao Drive')
      }
    } catch (e) {
      toast.error('Erro ao reenviar ao Drive')
      console.error(e)
    }
  }

  const handlePartialCreate = async () => {
    const selected = [
      ...Object.entries(domains).filter(([,v]) => v).map(([k]) => k),
      ...Object.entries(domainsExtra).filter(([,v]) => v).map(([k]) => k),
    ]
    if (selected.length === 0) { toast.error('Selecione ao menos um domínio'); return }
    try {
      const res = await fetch('/api/admin/backups/partial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: selected }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Backup parcial criado')
        loadPartial()
      } else {
        toastApiError(data, 'Erro ao criar backup parcial')
      }
    } catch (e) {
      toast.error('Erro ao criar backup parcial')
    }
  }

  const handlePartialRestore = async (id: string) => {
    // Restaura todos os domínios existentes neste snapshot
    const item = partialItems.find(x => x.id === id)
    const domainsToRestore: string[] = item?.domains || []
    if (!confirm(`Restaurar domínios: ${domainsToRestore.join(', ')} de ${id}?`)) return
    try {
      const res = await fetch('/api/admin/backups/partial/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, domains: domainsToRestore }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Restauração parcial concluída')
      } else {
        toastApiError(data, 'Erro ao restaurar backup parcial')
      }
    } catch (e) {
      toast.error('Erro ao restaurar backup parcial')
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
        toastApiError(data, 'Erro ao restaurar backup')
      }
    } catch (error) {
      toast.error('Erro ao restaurar backup')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteExportedFile = async (filename: string) => {
    if (!confirm(`Deletar arquivo ${filename}?`)) return
    try {
      const res = await fetch('/api/admin/backups/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Arquivo deletado')
        loadEntityFiles()
      } else {
        toastApiError(data, 'Erro ao deletar')
      }
    } catch (error) {
      toast.error('Erro ao deletar arquivo')
      console.error(error)
    }
  }

  const handleSendEmail = async () => {
    if (!emailValue.trim()) {
      toast.error('Insira um email')
      return
    }
    setSendingEmail(true)
    try {
      const res = await fetch('/api/admin/backups/files/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: emailDialogFilename, email: emailValue.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('PDF enviado com sucesso')
        setEmailDialogOpen(false)
        setEmailValue('')
      } else {
        toastApiError(data, 'Erro ao enviar email')
      }
    } catch (error) {
      toast.error('Erro ao enviar email')
      console.error(error)
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5"/>
            Criar Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateBackup}
            disabled={creating}
            size="lg"
            className="w-full"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? 'Criando...' : 'Criar Backup'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5"/>
            Exportar PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Autocomplete
            endpoint="/api/admin/backups/autocomplete/patients"
            placeholder="Digite nome ou CPF..."
            onSelect={(option) => {
              if (option) {
                setEntityPatient({
                  id: option.id,
                  cpf: option.cpf || '',
                  email: option.email || '',
                  name: option.name || '',
                })
              }
            }}
            emptyMessage="Paciente não encontrado"
          />
          {entityPatient.id && (
            <div className="text-sm text-green-700">✓ {entityPatient.name}</div>
          )}
          <Button 
            onClick={async () => {
              if (!entityPatient.id) { 
                toast.error('Selecione um paciente'); 
                return 
              }
              const res = await fetch('/api/admin/backups/entity/patient/pdf-jspdf', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ id: entityPatient.id }) 
              })
              const data = await res.json()
              if (res.ok && data.success) {
                toast.success('PDF gerado com sucesso!')
                setEntityPatient({id:'', cpf:'', email:'', name:''})
                loadEntityFiles()
              } else {
                toastApiError(data, 'Erro ao gerar PDF')
              }
            }}
            disabled={!entityPatient.id}
            className="w-full"
          >
            Gerar PDF
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <RotateCcw className="h-5 w-5"/>
            Restaurar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-900">Clique no botão <RotateCcw className="inline h-3 w-3"/> nos backups abaixo</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
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
            <Label htmlFor="gdrive-folder">Folder ID</Label>
            <Input
              id="gdrive-folder"
              placeholder="Ex: 1AbcDefG..."
              value={gdriveFolderId}
              onChange={(e) => setGdriveFolderId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gdrive-imp">Impersonate (opcional)</Label>
            <Input
              id="gdrive-imp"
              placeholder="usuario@seudominio.com"
              value={gdriveImpersonate}
              onChange={(e) => setGdriveImpersonate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gdrive-json">Service Account JSON</Label>
            <Textarea
              id="gdrive-json"
              placeholder="Cole aqui o JSON"
              value={gdriveJson}
              onChange={(e) => setGdriveJson(e.target.value)}
              rows={6}
            />
          </div>
          <Button onClick={handleSaveGdrive} disabled={savingConfig}>
            {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {savingConfig ? 'Salvando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backups Granulares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domains.terms} onChange={e=>setDomains(s=>({...s,terms:e.target.checked}))} /> Termos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domains.cid} onChange={e=>setDomains(s=>({...s,cid:e.target.checked}))} /> CID10
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domains.cbo} onChange={e=>setDomains(s=>({...s,cbo:e.target.checked}))} /> CBO
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domains.medications} onChange={e=>setDomains(s=>({...s,medications:e.target.checked}))} /> Medicamentos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domainsExtra.ciap2} onChange={e=>setDomainsExtra(s=>({...s,ciap2:e.target.checked}))} /> CIAP2
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domainsExtra.nursing} onChange={e=>setDomainsExtra(s=>({...s,nursing:e.target.checked}))} /> Enfermagem
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domainsExtra.procedures} onChange={e=>setDomainsExtra(s=>({...s,procedures:e.target.checked}))} /> Procedimentos (SIGTAP)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={domainsExtra.formulaTemplates} onChange={e=>setDomainsExtra(s=>({...s,formulaTemplates:e.target.checked}))} /> Fórmulas Magistrais
            </label>
          </div>
          <Button onClick={handlePartialCreate}>Criar backup granular</Button>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Snapshots</div>
            {partialLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : partialItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum snapshot granular</div>
            ) : (
              <div className="space-y-2">
                {partialItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="text-sm">
                      <div className="font-medium">{it.id}</div>
                      <div className="text-muted-foreground">{(it.domains || []).join(', ')}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePartialRestore(it.id)}>Restaurar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5"/>
            Exportar Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Autocomplete
              endpoint="/api/admin/backups/autocomplete/patients"
              placeholder="Paciente..."
              onSelect={(option) => {
                if (option) {
                  setEntityPatient({
                    id: option.id,
                    cpf: option.cpf || '',
                    email: option.email || '',
                    name: option.name || '',
                  })
                }
              }}
              emptyMessage="Não encontrado"
            />
            {entityPatient.id && <div className="text-xs text-green-700">✓ {entityPatient.name}</div>}
            <Button 
              onClick={async () => {
                if (!entityPatient.id) { 
                  toast.error('Selecione um paciente'); 
                  return 
                }
                const res = await fetch('/api/admin/backups/entity/patient', { 
                  method: 'POST', 
                  headers: {'Content-Type': 'application/json'}, 
                  body: JSON.stringify({ id: entityPatient.id }) 
                })
                const data = await res.json()
                if (res.ok && data.success) {
                  toast.success('Exportado')
                  setEntityPatient({id:'', cpf:'', email:'', name:''})
                  loadEntityFiles()
                }
                else toastApiError(data, 'Erro')
              }}
              disabled={!entityPatient.id}
              variant="outline"
              className="w-full text-sm"
            >
              Paciente JSON
            </Button>
          </div>

          <div className="space-y-2">
            <Autocomplete
              endpoint="/api/admin/backups/autocomplete/users"
              placeholder="Profissional..."
              onSelect={(option) => {
                if (option) {
                  setEntityUser({
                    id: option.id,
                    email: option.email || '',
                    licenseNumber: option.licenseNumber || '',
                    name: option.name || '',
                    role: option.role || '',
                  })
                }
              }}
              emptyMessage="Não encontrado"
            />
            {entityUser.id && <div className="text-xs text-green-700">✓ {entityUser.name}</div>}
            <Button 
              onClick={async () => {
                if (!entityUser.id) { 
                  toast.error('Selecione um usuário'); 
                  return 
                }
                const res = await fetch('/api/admin/backups/entity/users', { 
                  method: 'POST', 
                  headers: {'Content-Type': 'application/json'}, 
                  body: JSON.stringify({ id: entityUser.id }) 
                })
                const data = await res.json()
                if (res.ok && data.success) {
                  toast.success('Exportado')
                  setEntityUser({id:'', email:'', licenseNumber:'', name:'', role:''})
                  loadEntityFiles()
                }
                else toastApiError(data, 'Erro')
              }}
              disabled={!entityUser.id}
              variant="outline"
              className="w-full text-sm"
            >
              Profissional JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* EXPORTAÇÕES PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5"/>
            Progresso de Exportações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(pdfExportJobs).length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">Nenhuma exportação</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(pdfExportJobs).map(([exportId, job]) => (
                <div key={exportId} className="border rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Prontuário</span>
                    <Badge variant={
                      job.status === 'COMPLETED' ? 'default' :
                      job.status === 'FAILED' ? 'destructive' :
                      'secondary'
                    }>
                      {job.status === 'PENDING' ? 'Aguardando' :
                       job.status === 'PROCESSING' ? 'Processando' :
                       job.status === 'COMPLETED' ? 'Concluído' :
                       'Erro'}
                    </Badge>
                  </div>
                  
                  {(job.status === 'PROCESSING' || job.status === 'PENDING') && (
                    <div>
                      <div className="w-full bg-muted h-2 rounded">
                        <div 
                          className="bg-blue-500 h-2 rounded transition-all" 
                          style={{width: `${job.progress}%`}}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{job.progress}%</div>
                    </div>
                  )}
                  
                  {job.errorMessage && (
                    <div className="text-xs text-red-600">{job.errorMessage}</div>
                  )}
                  
                  {job.status === 'COMPLETED' && job.filename && (
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = `/api/admin/backups/files/download?filename=${encodeURIComponent(job.filename!)}`
                      }}
                      className="w-full"
                    >
                      Baixar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ARQUIVOS EXPORTADOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5"/>
            Arquivos Exportados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entityFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
              Nenhum arquivo exportado ainda
            </div>
          ) : (
            <div className="space-y-4">
              {/* PDFS DE PACIENTES */}
              {entityFiles.filter(f => f.filename.startsWith('patient_') && f.filename.endsWith('.pdf')).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-blue-600">📄</span> Prontuários (PDF)
                  </h4>
                  {entityFiles.filter(f => f.filename.startsWith('patient_') && f.filename.endsWith('.pdf')).map((f) => {
                    const patientName = f.filename.replace('patient_', '').replace('.pdf', '').replace(/_/g, ' ')
                    return (
                      <div key={f.filename} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{patientName}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{f.sizeHuman}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Enviar por Email"
                            onClick={() => {
                              setEmailDialogFilename(f.filename)
                              setEmailValue('')
                              setEmailDialogOpen(true)
                            }}
                          >
                            <span className="text-sm">📧</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Baixar"
                            onClick={() => window.location.href = `/api/admin/backups/files/download?filename=${encodeURIComponent(f.filename)}`}
                          >
                            <Download className="w-4 h-4"/>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Deletar"
                            onClick={() => handleDeleteExportedFile(f.filename)}
                            className="text-red-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* JSONS DE PACIENTES */}
              {entityFiles.filter(f => f.filename.startsWith('patient_') && f.filename.endsWith('.json')).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-green-600">📊</span> Dados de Pacientes (JSON)
                  </h4>
                  {entityFiles.filter(f => f.filename.startsWith('patient_') && f.filename.endsWith('.json')).map((f) => {
                    const patientName = f.filename.replace('patient_', '').replace('.json', '').replace(/_/g, ' ')
                    return (
                      <div key={f.filename} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{patientName}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{f.sizeHuman}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Compartilhar"
                            onClick={() => {
                              const url = window.location.href
                              const shareData = { title: patientName, text: `Dados: ${patientName}`, url }
                              if (navigator.share) navigator.share(shareData)
                              else {
                                navigator.clipboard.writeText(url)
                                toast.success('Link copiado')
                              }
                            }}
                          >
                            <span className="text-sm">📤</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Baixar"
                            onClick={() => window.location.href = `/api/admin/backups/files/download?filename=${encodeURIComponent(f.filename)}`}
                          >
                            <Download className="w-4 h-4"/>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Deletar"
                            onClick={() => handleDeleteExportedFile(f.filename)}
                            className="text-red-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* JSONS DE PROFISSIONAIS */}
              {entityFiles.filter(f => f.filename.startsWith('user_') && f.filename.endsWith('.json')).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-purple-600">👨‍⚕️</span> Dados de Profissionais (JSON)
                  </h4>
                  {entityFiles.filter(f => f.filename.startsWith('user_') && f.filename.endsWith('.json')).map((f) => {
                    const userName = f.filename.replace('user_', '').replace('.json', '').replace(/_/g, ' ')
                    return (
                      <div key={f.filename} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{userName}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{f.sizeHuman}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Compartilhar"
                            onClick={() => {
                              const url = window.location.href
                              const shareData = { title: userName, text: `Dados: ${userName}`, url }
                              if (navigator.share) navigator.share(shareData)
                              else {
                                navigator.clipboard.writeText(url)
                                toast.success('Link copiado')
                              }
                            }}
                          >
                            <span className="text-sm">📤</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Baixar"
                            onClick={() => window.location.href = `/api/admin/backups/files/download?filename=${encodeURIComponent(f.filename)}`}
                          >
                            <Download className="w-4 h-4"/>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Deletar"
                            onClick={() => handleDeleteExportedFile(f.filename)}
                            className="text-red-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LISTA DE BACKUPS - MELHORADA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5"/>
              Backups Disponíveis
            </div>
            <Badge variant="outline" className="text-sm">
              {backups.length} backup{backups.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <CardDescription>
            Lista completa de todos os backups do sistema. Use o botão <RotateCcw className="inline h-3 w-3"/> para restaurar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Carregando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum backup encontrado</p>
              <p className="text-sm text-muted-foreground mb-6">
                Crie o primeiro backup para proteger seus dados
              </p>
              <Button onClick={handleCreateBackup} disabled={creating}>
                {creating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
                ) : (
                  '✨ Criar Primeiro Backup'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup, index) => (
                <div
                  key={backup.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition ${
                    index === 0 ? 'border-blue-200 bg-blue-50/50' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {index === 0 && (
                        <Badge className="bg-blue-600">Mais recente</Badge>
                      )}
                      <p className="font-medium truncate">{backup.filename}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <HardDrive className="w-3 h-3 mr-1"/>
                        {backup.sizeHuman}
                      </Badge>
                      
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1"/>
                        {format(new Date(backup.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </Badge>
                      
                      <span className="text-xs text-muted-foreground flex items-center">
                        ({formatDistanceToNow(new Date(backup.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })})
                      </span>
                      
                      {backup.hasLog && (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                          ✓ Log OK
                        </Badge>
                      )}
                      
                      {gdriveConfigured && (
                        backup.googleDriveUploaded === true ? (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                            <CloudUpload className="w-3 h-3 mr-1"/>
                            Drive ✓
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                            <CloudUpload className="w-3 h-3 mr-1"/>
                            Drive ✗
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {gdriveConfigured && backup.googleDriveUploaded !== true && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReupload(backup.filename)}
                        title="Reenviar este backup ao Google Drive"
                      >
                        <CloudUpload className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.filename)}
                      title="Baixar backup"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.filename)}
                      title="Restaurar este backup"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.filename)}
                      title="Deletar backup"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar PDF por Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
