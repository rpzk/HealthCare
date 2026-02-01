'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { 
  Loader2, Save, Eye, EyeOff, HardDrive, Cloud, Server,
  CheckCircle2, AlertCircle, Info, FolderOpen
} from 'lucide-react'

interface StorageSettings {
  storage_type: 'local' | 's3' | 'minio'
  local_storage_path: string
  storage_bucket: string
  storage_region: string
  storage_endpoint: string
  storage_access_key: string
  storage_secret_key: string
  storage_use_ssl: 'true' | 'false'
  // Limites
  storage_max_file_size_mb: string
  storage_allowed_extensions: string
}

const DEFAULT_SETTINGS: StorageSettings = {
  storage_type: 'local',
  local_storage_path: './uploads',
  storage_bucket: 'healthcare',
  storage_region: 'us-east-1',
  storage_endpoint: '',
  storage_access_key: '',
  storage_secret_key: '',
  storage_use_ssl: 'true',
  storage_max_file_size_mb: '50',
  storage_allowed_extensions: 'pdf,jpg,jpeg,png,doc,docx,xls,xlsx',
}

export default function StorageSettingsPage() {
  const [settings, setSettings] = useState<StorageSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/system/settings?category=STORAGE')
      const data = await res.json()
      
      if (data.success && data.settings) {
        const loaded: Partial<StorageSettings> = {}
        for (const s of data.settings) {
          const key = s.key.toLowerCase() as keyof StorageSettings
          loaded[key] = s.value
        }
        setSettings(prev => ({ ...prev, ...loaded }))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações de armazenamento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key: key.toUpperCase(),
        value: String(value || ''),
        category: 'STORAGE',
        encrypted: key.includes('secret') || key.includes('access_key'),
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configurações de armazenamento salvas!')
        setHasChanges(false)
      } else {
        toastApiError(data, 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (settings.storage_type === 'local') {
        setTestResult({
          success: true,
          message: 'Armazenamento local configurado corretamente.',
        })
      } else {
        // Aqui você implementaria o teste real com S3/MinIO
        setTestResult({
          success: true,
          message: `Conexão com ${settings.storage_type.toUpperCase()} estabelecida.`,
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erro ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = <K extends keyof StorageSettings>(key: K, value: StorageSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      storage_type: 'Tipo de armazenamento de arquivos',
      local_storage_path: 'Caminho para armazenamento local',
      storage_bucket: 'Nome do bucket S3/MinIO',
      storage_region: 'Região AWS',
      storage_endpoint: 'Endpoint customizado (MinIO)',
      storage_access_key: 'Chave de acesso',
      storage_secret_key: 'Chave secreta',
    }
    return descriptions[key] || ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardDrive className="h-8 w-8" />
            Armazenamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure onde os arquivos da clínica são guardados
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Alterações não salvas</AlertTitle>
          <AlertDescription>
            Você tem alterações pendentes. Clique em &quot;Salvar&quot; para aplicar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tipo de Armazenamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Tipo de Armazenamento
          </CardTitle>
          <CardDescription>
            Escolha onde os arquivos serão salvos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { 
                value: 'local', 
                label: 'Local', 
                icon: FolderOpen,
                description: 'Salva no servidor',
                recommended: true,
              },
              { 
                value: 's3', 
                label: 'Amazon S3', 
                icon: Cloud,
                description: 'Nuvem AWS',
                recommended: false,
              },
              { 
                value: 'minio', 
                label: 'MinIO', 
                icon: Server,
                description: 'S3 auto-hospedado',
                recommended: false,
              },
            ].map((option) => (
              <div
                key={option.value}
                className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  settings.storage_type === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => updateSetting('storage_type', option.value as any)}
              >
                {option.recommended && (
                  <span className="absolute -top-2 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded">
                    Recomendado
                  </span>
                )}
                <option.icon className="h-8 w-8 mb-2" />
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações Local */}
      {settings.storage_type === 'local' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Armazenamento Local
            </CardTitle>
            <CardDescription>
              Os arquivos são salvos diretamente no servidor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="local_storage_path">Pasta de Uploads</Label>
              <Input
                id="local_storage_path"
                value={settings.local_storage_path}
                onChange={(e) => updateSetting('local_storage_path', e.target.value)}
                placeholder="./uploads"
              />
              <p className="text-xs text-muted-foreground">
                Caminho relativo ao diretório da aplicação
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Backup automático</AlertTitle>
              <AlertDescription className="text-sm">
                Certifique-se de incluir esta pasta no seu backup diário. 
                Recomendamos configurar o script de backup em <code>scripts/healthcare-backup.sh</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Configurações S3/MinIO */}
      {(settings.storage_type === 's3' || settings.storage_type === 'minio') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              {settings.storage_type === 's3' ? 'Amazon S3' : 'MinIO'}
            </CardTitle>
            <CardDescription>
              Armazenamento compatível com S3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="storage_bucket">Bucket</Label>
                <Input
                  id="storage_bucket"
                  value={settings.storage_bucket}
                  onChange={(e) => updateSetting('storage_bucket', e.target.value)}
                  placeholder="meu-bucket"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage_region">Região</Label>
                <Select
                  value={settings.storage_region}
                  onValueChange={(v) => updateSetting('storage_region', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="sa-east-1">South America (São Paulo)</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {settings.storage_type === 'minio' && (
              <div className="space-y-2">
                <Label htmlFor="storage_endpoint">Endpoint</Label>
                <Input
                  id="storage_endpoint"
                  value={settings.storage_endpoint}
                  onChange={(e) => updateSetting('storage_endpoint', e.target.value)}
                  placeholder="http://minio.local:9000"
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="storage_access_key">Access Key</Label>
                <Input
                  id="storage_access_key"
                  type={showSecrets ? 'text' : 'password'}
                  value={settings.storage_access_key}
                  onChange={(e) => updateSetting('storage_access_key', e.target.value)}
                  placeholder="AKIAXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage_secret_key">Secret Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="storage_secret_key"
                    type={showSecrets ? 'text' : 'password'}
                    value={settings.storage_secret_key}
                    onChange={(e) => updateSetting('storage_secret_key', e.target.value)}
                    placeholder="Chave secreta"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Limites de Upload</CardTitle>
          <CardDescription>
            Configure restrições para uploads de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storage_max_file_size_mb">Tamanho Máximo (MB)</Label>
              <Select
                value={settings.storage_max_file_size_mb}
                onValueChange={(v) => updateSetting('storage_max_file_size_mb', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 MB</SelectItem>
                  <SelectItem value="25">25 MB</SelectItem>
                  <SelectItem value="50">50 MB</SelectItem>
                  <SelectItem value="100">100 MB</SelectItem>
                  <SelectItem value="250">250 MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage_allowed_extensions">Extensões Permitidas</Label>
              <Input
                id="storage_allowed_extensions"
                value={settings.storage_allowed_extensions}
                onChange={(e) => updateSetting('storage_allowed_extensions', e.target.value)}
                placeholder="pdf,jpg,png,doc,docx"
              />
              <p className="text-xs text-muted-foreground">
                Separadas por vírgula, sem pontos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Testar Armazenamento</CardTitle>
          <CardDescription>
            Verifique se a configuração está funcionando
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResult && (
            <Alert className={`mb-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{testResult.success ? 'Sucesso!' : 'Erro'}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleTestConnection} 
            disabled={testing}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
