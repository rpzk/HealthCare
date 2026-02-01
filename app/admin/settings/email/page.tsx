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
  Loader2, Save, Eye, EyeOff, Mail, Server, Lock, 
  Send, CheckCircle2, AlertCircle, Info
} from 'lucide-react'

interface EmailSettings {
  smtp_host: string
  smtp_port: string
  smtp_secure: 'true' | 'false'
  smtp_user: string
  smtp_pass: string
  smtp_from_name: string
  smtp_from_email: string
}

const DEFAULT_SETTINGS: EmailSettings = {
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: 'false',
  smtp_user: '',
  smtp_pass: '',
  smtp_from_name: '',
  smtp_from_email: '',
}

// Presets de provedores populares
const PROVIDER_PRESETS: Record<string, Partial<EmailSettings>> = {
  gmail: {
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_secure: 'false',
  },
  outlook: {
    smtp_host: 'smtp-mail.outlook.com',
    smtp_port: '587',
    smtp_secure: 'false',
  },
  zoho: {
    smtp_host: 'smtp.zoho.com',
    smtp_port: '587',
    smtp_secure: 'false',
  },
  sendgrid: {
    smtp_host: 'smtp.sendgrid.net',
    smtp_port: '587',
    smtp_secure: 'false',
  },
  amazon_ses: {
    smtp_host: 'email-smtp.us-east-1.amazonaws.com',
    smtp_port: '587',
    smtp_secure: 'false',
  },
  custom: {},
}

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('custom')

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/system/settings?category=EMAIL')
      const data = await res.json()
      
      if (data.success && data.settings) {
        const loaded: Partial<EmailSettings> = {}
        for (const s of data.settings) {
          const key = s.key.toLowerCase() as keyof EmailSettings
          loaded[key] = s.value
        }
        setSettings(prev => ({ ...prev, ...loaded }))
        
        // Detectar preset baseado no host
        const host = loaded.smtp_host || ''
        if (host.includes('gmail')) setSelectedPreset('gmail')
        else if (host.includes('outlook')) setSelectedPreset('outlook')
        else if (host.includes('zoho')) setSelectedPreset('zoho')
        else if (host.includes('sendgrid')) setSelectedPreset('sendgrid')
        else if (host.includes('amazonaws')) setSelectedPreset('amazon_ses')
        else setSelectedPreset('custom')
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações de e-mail')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    const presetData = PROVIDER_PRESETS[preset]
    if (presetData) {
      setSettings(prev => ({ ...prev, ...presetData }))
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key: key.toUpperCase(),
        value: String(value || ''),
        category: 'EMAIL',
        encrypted: key === 'smtp_pass',
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configurações de e-mail salvas!')
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

  const handleTestEmail = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.smtp_from_email || settings.smtp_user,
        }),
      })

      const data = await res.json()
      
      setTestResult({
        success: data.success,
        message: data.success 
          ? 'E-mail de teste enviado com sucesso!' 
          : (data.error || 'Falha ao enviar e-mail de teste'),
      })
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erro ao testar envio',
      })
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      smtp_host: 'Servidor SMTP para envio de e-mails',
      smtp_port: 'Porta do servidor SMTP',
      smtp_user: 'Usuário para autenticação',
      smtp_pass: 'Senha ou App Password',
      smtp_from_name: 'Nome que aparece como remetente',
      smtp_from_email: 'E-mail do remetente',
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
            <Mail className="h-8 w-8" />
            Configurações de E-mail
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o envio de confirmações, lembretes e notificações
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

      {/* Seleção de Provedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Provedor de E-mail
          </CardTitle>
          <CardDescription>
            Selecione um provedor para preencher automaticamente as configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione um provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
              <SelectItem value="outlook">Outlook / Office 365</SelectItem>
              <SelectItem value="zoho">Zoho Mail</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="amazon_ses">Amazon SES</SelectItem>
              <SelectItem value="custom">Configuração Manual</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPreset === 'gmail' && (
            <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Gmail / Google Workspace</AlertTitle>
              <AlertDescription className="text-sm">
                Para usar Gmail, você precisa criar uma &quot;Senha de App&quot;:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Acesse <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Segurança da Conta Google</a></li>
                  <li>Ative a Verificação em 2 etapas (se não estiver ativa)</li>
                  <li>Vá em &quot;Senhas de app&quot; e crie uma nova</li>
                  <li>Use essa senha no campo &quot;Senha&quot; abaixo</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configurações do Servidor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Servidor SMTP
          </CardTitle>
          <CardDescription>
            Configurações técnicas do servidor de e-mail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Servidor (Host)</Label>
              <Input
                id="smtp_host"
                value={settings.smtp_host}
                onChange={(e) => updateSetting('smtp_host', e.target.value)}
                placeholder="smtp.exemplo.com"
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp_port">Porta</Label>
                <Select
                  value={settings.smtp_port}
                  onValueChange={(v) => updateSetting('smtp_port', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 (Padrão)</SelectItem>
                    <SelectItem value="465">465 (SSL)</SelectItem>
                    <SelectItem value="587">587 (TLS) ✓</SelectItem>
                    <SelectItem value="2525">2525 (Alt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_secure">Segurança</Label>
                <Select
                  value={settings.smtp_secure}
                  onValueChange={(v) => updateSetting('smtp_secure', v as 'true' | 'false')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">STARTTLS</SelectItem>
                    <SelectItem value="true">SSL/TLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Autenticação
          </CardTitle>
          <CardDescription>
            Credenciais para acessar o servidor SMTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Usuário / E-mail</Label>
              <Input
                id="smtp_user"
                type="email"
                value={settings.smtp_user}
                onChange={(e) => updateSetting('smtp_user', e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_pass">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="smtp_pass"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.smtp_pass}
                  onChange={(e) => updateSetting('smtp_pass', e.target.value)}
                  placeholder="Senha ou App Password"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remetente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Remetente
          </CardTitle>
          <CardDescription>
            Como os e-mails aparecerão para os destinatários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp_from_name">Nome do Remetente</Label>
              <Input
                id="smtp_from_name"
                value={settings.smtp_from_name}
                onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                placeholder="Clínica Saúde"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_from_email">E-mail do Remetente</Label>
              <Input
                id="smtp_from_email"
                type="email"
                value={settings.smtp_from_email}
                onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
                placeholder="noreply@clinica.com"
              />
              <p className="text-xs text-muted-foreground">
                Geralmente deve ser o mesmo do usuário SMTP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Testar Configurações
          </CardTitle>
          <CardDescription>
            Envie um e-mail de teste para verificar se está funcionando
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testResult && (
            <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
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
            onClick={handleTestEmail} 
            disabled={testing || !settings.smtp_host || !settings.smtp_user}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar E-mail de Teste
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
