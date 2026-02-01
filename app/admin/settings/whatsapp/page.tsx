'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { 
  Loader2, Save, Eye, EyeOff, MessageSquare, Server, 
  Send, CheckCircle2, AlertCircle, Info, Smartphone, QrCode
} from 'lucide-react'

interface WhatsAppSettings {
  whatsapp_enabled: boolean
  whatsapp_provider: 'evolution' | 'z-api' | 'chatpro' | 'wppconnect'
  whatsapp_api_url: string
  whatsapp_api_key: string
  whatsapp_instance_id: string
  whatsapp_phone: string
  // Automações
  whatsapp_send_appointment_confirmation: boolean
  whatsapp_send_appointment_reminder: boolean
  whatsapp_reminder_hours_before: string
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  whatsapp_enabled: false,
  whatsapp_provider: 'evolution',
  whatsapp_api_url: '',
  whatsapp_api_key: '',
  whatsapp_instance_id: '',
  whatsapp_phone: '',
  whatsapp_send_appointment_confirmation: true,
  whatsapp_send_appointment_reminder: true,
  whatsapp_reminder_hours_before: '24',
}

const PROVIDER_INFO = {
  evolution: {
    name: 'Evolution API',
    description: 'API open-source auto-hospedada',
    defaultPort: '8080',
    docs: 'https://doc.evolution-api.com/',
  },
  'z-api': {
    name: 'Z-API',
    description: 'Serviço em nuvem brasileiro',
    defaultPort: '',
    docs: 'https://developer.z-api.io/',
  },
  chatpro: {
    name: 'ChatPro',
    description: 'Plataforma de automação',
    defaultPort: '',
    docs: 'https://chatpro.com.br/',
  },
  wppconnect: {
    name: 'WPPConnect',
    description: 'Biblioteca open-source',
    defaultPort: '21465',
    docs: 'https://wppconnect.io/',
  },
}

export default function WhatsAppSettingsPage() {
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/system/settings?category=WHATSAPP')
      const data = await res.json()
      
      if (data.success && data.settings) {
        const loaded: Partial<WhatsAppSettings> = {}
        for (const s of data.settings) {
          const key = s.key.toLowerCase() as keyof WhatsAppSettings
          if (s.value === 'true') {
            (loaded as any)[key] = true
          } else if (s.value === 'false') {
            (loaded as any)[key] = false
          } else {
            (loaded as any)[key] = s.value
          }
        }
        setSettings(prev => ({ ...prev, ...loaded }))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações de WhatsApp')
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
        value: String(value),
        category: 'WHATSAPP',
        encrypted: key === 'whatsapp_api_key',
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configurações de WhatsApp salvas!')
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
      
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.whatsapp_provider,
          apiUrl: settings.whatsapp_api_url,
          apiKey: settings.whatsapp_api_key,
          instanceId: settings.whatsapp_instance_id,
        }),
      })

      const data = await res.json()
      
      setConnectionStatus(data.success ? 'connected' : 'disconnected')
      setTestResult({
        success: data.success,
        message: data.success 
          ? 'Conexão estabelecida com sucesso!' 
          : (data.error || 'Falha ao conectar'),
      })
    } catch (error: any) {
      setConnectionStatus('disconnected')
      setTestResult({
        success: false,
        message: error.message || 'Erro ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = <K extends keyof WhatsAppSettings>(key: K, value: WhatsAppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      whatsapp_enabled: 'Habilitar integração com WhatsApp',
      whatsapp_provider: 'Provedor de API do WhatsApp',
      whatsapp_api_url: 'URL da API',
      whatsapp_api_key: 'Chave de API',
      whatsapp_instance_id: 'ID da instância',
      whatsapp_phone: 'Número conectado',
    }
    return descriptions[key] || ''
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return `+${numbers}`
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`
    if (numbers.length <= 9) return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`
    return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const providerInfo = PROVIDER_INFO[settings.whatsapp_provider]

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8" />
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure notificações e lembretes via WhatsApp
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

      {/* Ativar/Desativar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Integração WhatsApp
              </CardTitle>
              <CardDescription>
                Envie notificações automáticas para os pacientes
              </CardDescription>
            </div>
            <Switch
              checked={settings.whatsapp_enabled}
              onCheckedChange={(v) => updateSetting('whatsapp_enabled', v)}
            />
          </div>
        </CardHeader>
        {!settings.whatsapp_enabled && (
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Funcionalidades disponíveis</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Confirmação automática de agendamentos</li>
                  <li>Lembrete 24h antes da consulta</li>
                  <li>Notificação de reagendamento/cancelamento</li>
                  <li>Envio de receitas e resultados</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Provedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Provedor de API
          </CardTitle>
          <CardDescription>
            Selecione qual serviço de WhatsApp você utiliza
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_provider">Provedor</Label>
            <Select
              value={settings.whatsapp_provider}
              onValueChange={(v) => updateSetting('whatsapp_provider', v as any)}
              disabled={!settings.whatsapp_enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{info.name}</span>
                      <span className="text-xs text-muted-foreground">{info.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {providerInfo && (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertTitle>{providerInfo.name}</AlertTitle>
              <AlertDescription className="text-sm">
                {providerInfo.description}
                <br />
                <a 
                  href={providerInfo.docs} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline mt-1 inline-block"
                >
                  Ver documentação →
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configurações da API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configurações da API
          </CardTitle>
          <CardDescription>
            Dados de conexão com o serviço de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_api_url">URL da API</Label>
            <Input
              id="whatsapp_api_url"
              value={settings.whatsapp_api_url}
              onChange={(e) => updateSetting('whatsapp_api_url', e.target.value)}
              placeholder={`https://api.exemplo.com${providerInfo?.defaultPort ? ':' + providerInfo.defaultPort : ''}`}
              disabled={!settings.whatsapp_enabled}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_api_key">Chave de API</Label>
              <div className="flex gap-2">
                <Input
                  id="whatsapp_api_key"
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.whatsapp_api_key}
                  onChange={(e) => updateSetting('whatsapp_api_key', e.target.value)}
                  placeholder="Sua chave de API"
                  disabled={!settings.whatsapp_enabled}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_instance_id">ID da Instância</Label>
              <Input
                id="whatsapp_instance_id"
                value={settings.whatsapp_instance_id}
                onChange={(e) => updateSetting('whatsapp_instance_id', e.target.value)}
                placeholder="ID ou nome da instância"
                disabled={!settings.whatsapp_enabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_phone" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Número Conectado
            </Label>
            <Input
              id="whatsapp_phone"
              value={settings.whatsapp_phone}
              onChange={(e) => updateSetting('whatsapp_phone', formatPhone(e.target.value))}
              placeholder="+55 11 99999-9999"
              disabled={!settings.whatsapp_enabled}
            />
            <p className="text-xs text-muted-foreground">
              O número do WhatsApp que será usado para enviar mensagens
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          {testResult && (
            <Alert className={`w-full ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{testResult.success ? 'Conectado!' : 'Erro'}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={handleTestConnection} 
            disabled={testing || !settings.whatsapp_enabled || !settings.whatsapp_api_url}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <QrCode className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Automações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Automações
          </CardTitle>
          <CardDescription>
            Configure quando mensagens são enviadas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Confirmação de Agendamento</Label>
              <p className="text-sm text-muted-foreground">
                Enviar mensagem quando paciente agenda uma consulta
              </p>
            </div>
            <Switch
              checked={settings.whatsapp_send_appointment_confirmation}
              onCheckedChange={(v) => updateSetting('whatsapp_send_appointment_confirmation', v)}
              disabled={!settings.whatsapp_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Lembrete de Consulta</Label>
              <p className="text-sm text-muted-foreground">
                Enviar lembrete antes da consulta
              </p>
            </div>
            <Switch
              checked={settings.whatsapp_send_appointment_reminder}
              onCheckedChange={(v) => updateSetting('whatsapp_send_appointment_reminder', v)}
              disabled={!settings.whatsapp_enabled}
            />
          </div>

          {settings.whatsapp_send_appointment_reminder && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="whatsapp_reminder_hours_before">Enviar lembrete com antecedência de:</Label>
              <Select
                value={settings.whatsapp_reminder_hours_before}
                onValueChange={(v) => updateSetting('whatsapp_reminder_hours_before', v)}
                disabled={!settings.whatsapp_enabled}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora antes</SelectItem>
                  <SelectItem value="2">2 horas antes</SelectItem>
                  <SelectItem value="4">4 horas antes</SelectItem>
                  <SelectItem value="12">12 horas antes</SelectItem>
                  <SelectItem value="24">24 horas antes</SelectItem>
                  <SelectItem value="48">48 horas antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
