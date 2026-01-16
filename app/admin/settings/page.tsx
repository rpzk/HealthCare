'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { Loader2, Save, Eye, EyeOff } from 'lucide-react'

interface Setting {
  key: string
  value: string
  description?: string
  category: string
  isPublic: boolean
  encrypted: boolean
}

const CATEGORIES = {
  STORAGE: 'Armazenamento',
  REDIS: 'Redis / Cache',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  WEBRTC: 'WebRTC / Vídeo',
  GENERAL: 'Geral',
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('STORAGE')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/system/settings')
      const data = await res.json()

      if (data.success) {
        setSettings(data.settings)
      } else {
        toastApiError(data, 'Erro ao carregar configurações')
      }
    } catch (error) {
      toast.error('Erro ao carregar configurações')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string, value: string, encrypted: boolean) => {
    try {
      setSaving(true)

      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          encrypted,
          category: activeTab,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configuração salva com sucesso')
        await loadSettings()
      } else {
        toastApiError(data, 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSave = async () => {
    try {
      setSaving(true)

      const settingsToSave = settings.map((s) => ({
        key: s.key,
        value: s.value,
        encrypted: s.encrypted,
        category: s.category,
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(data.message || 'Configurações salvas')
        await loadSettings()
      } else {
        toastApiError(data, 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    )
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getSettingsByCategory = (category: string) => {
    return settings.filter((s) => s.category === category)
  }

  const renderSettingInput = (setting: Setting) => {
    const isSecret = setting.encrypted || setting.key.includes('KEY') || setting.key.includes('SECRET') || setting.key.includes('PASSWORD')
    const show = showSecrets[setting.key]

    return (
      <div key={setting.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={setting.key} className="flex items-center gap-2">
            {setting.key}
            {setting.encrypted && <Badge variant="secondary">Criptografado</Badge>}
          </Label>
          {isSecret && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleShowSecret(setting.key)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <Input
          id={setting.key}
          type={isSecret && !show ? 'password' : 'text'}
          value={setting.value}
          onChange={(e) => updateSetting(setting.key, e.target.value)}
          placeholder={`Digite ${setting.key}`}
        />
        {setting.description && (
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações centralizadas do sistema
          </p>
        </div>
        <Button onClick={handleBulkSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Tudo
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(CATEGORIES).map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{CATEGORIES[category as keyof typeof CATEGORIES]}</CardTitle>
                <CardDescription>
                  Configure as opções de {CATEGORIES[category as keyof typeof CATEGORIES].toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {getSettingsByCategory(category).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma configuração encontrada nesta categoria.
                    <br />
                    <Button
                      variant="link"
                      onClick={() => {
                        // Aqui você pode adicionar lógica para criar novas configurações
                        toast.info('Use a API para criar novas configurações')
                      }}
                    >
                      Criar nova configuração
                    </Button>
                  </div>
                ) : (
                  getSettingsByCategory(category).map(renderSettingInput)
                )}
              </CardContent>
            </Card>

            {/* Configurações predefinidas para facilitar */}
            {category === 'STORAGE' && getSettingsByCategory(category).length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuração Rápida - Storage Local</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => {
                      handleSave('STORAGE_TYPE', 'local', false)
                      handleSave('LOCAL_STORAGE_PATH', './uploads/recordings', false)
                    }}
                  >
                    Configurar Storage Local
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>⚠️ Atenção - Secrets Críticos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As seguintes configurações <strong>não podem</strong> ser gerenciadas via interface
            por questões de segurança e devem permanecer no arquivo <code>.env</code>:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li><code>ENCRYPTION_KEY</code> - Chave mestra de criptografia</li>
            <li><code>NEXTAUTH_SECRET</code> - Secret de autenticação</li>
            <li><code>DATABASE_URL</code> - URL do banco de dados</li>
            <li><code>RECORDING_ENCRYPTION_KEY</code> - Chave para gravações</li>
            <li><code>CRON_SECRET</code> - Secret para jobs cron</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
