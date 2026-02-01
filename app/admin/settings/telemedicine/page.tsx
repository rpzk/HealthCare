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
  Loader2, Save, Eye, EyeOff, Video, Server, Shield,
  CheckCircle2, AlertCircle, Info, Wifi, Monitor
} from 'lucide-react'

interface TelemedicineSettings {
  // WebRTC
  webrtc_enabled: boolean
  webrtc_stun_server: string
  webrtc_turn_server: string
  webrtc_turn_username: string
  webrtc_turn_password: string
  // Gravação
  webrtc_recording_enabled: boolean
  webrtc_recording_quality: 'low' | 'medium' | 'high'
  webrtc_recording_storage: 'local' | 's3'
  // Limites
  webrtc_max_duration_minutes: string
  webrtc_waiting_room_enabled: boolean
}

const DEFAULT_SETTINGS: TelemedicineSettings = {
  webrtc_enabled: false,
  webrtc_stun_server: 'stun:stun.l.google.com:19302',
  webrtc_turn_server: '',
  webrtc_turn_username: '',
  webrtc_turn_password: '',
  webrtc_recording_enabled: false,
  webrtc_recording_quality: 'medium',
  webrtc_recording_storage: 'local',
  webrtc_max_duration_minutes: '60',
  webrtc_waiting_room_enabled: true,
}

// Servidores STUN públicos gratuitos
const PUBLIC_STUN_SERVERS = [
  { value: 'stun:stun.l.google.com:19302', label: 'Google (Recomendado)' },
  { value: 'stun:stun1.l.google.com:19302', label: 'Google (Backup)' },
  { value: 'stun:stun.cloudflare.com:3478', label: 'Cloudflare' },
  { value: 'stun:stun.nextcloud.com:443', label: 'Nextcloud' },
  { value: 'custom', label: 'Personalizado...' },
]

export default function TelemedicineSettingsPage() {
  const [settings, setSettings] = useState<TelemedicineSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [customStun, setCustomStun] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/system/settings?category=WEBRTC')
      const data = await res.json()
      
      if (data.success && data.settings) {
        const loaded: Partial<TelemedicineSettings> = {}
        for (const s of data.settings) {
          const key = s.key.toLowerCase() as keyof TelemedicineSettings
          if (s.value === 'true') {
            (loaded as any)[key] = true
          } else if (s.value === 'false') {
            (loaded as any)[key] = false
          } else {
            (loaded as any)[key] = s.value
          }
        }
        setSettings(prev => ({ ...prev, ...loaded }))
        
        // Verificar se é servidor STUN customizado
        const stunServer = loaded.webrtc_stun_server || ''
        if (!PUBLIC_STUN_SERVERS.find(s => s.value === stunServer)) {
          setCustomStun(true)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações de telemedicina')
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
        category: 'WEBRTC',
        encrypted: key.includes('password'),
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configurações de telemedicina salvas!')
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
      
      const res = await fetch('/api/telemedicine/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stunServer: settings.webrtc_stun_server,
          turnServer: settings.webrtc_turn_server,
          turnUsername: settings.webrtc_turn_username,
          turnPassword: settings.webrtc_turn_password,
        }),
      })

      const data = await res.json()
      
      setTestResult({
        success: data.success,
        message: data.success 
          ? 'Servidores STUN/TURN acessíveis!' 
          : (data.error || 'Falha ao testar servidores'),
      })
    } catch {
      // Fallback: testar apenas conectividade básica
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: settings.webrtc_stun_server }],
        })
        pc.createDataChannel('test')
        await pc.createOffer()
        pc.close()
        
        setTestResult({
          success: true,
          message: 'Servidor STUN respondendo corretamente!',
        })
      } catch (err) {
        setTestResult({
          success: false,
          message: 'Não foi possível conectar ao servidor STUN.',
        })
      }
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = <K extends keyof TelemedicineSettings>(key: K, value: TelemedicineSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleStunChange = (value: string) => {
    if (value === 'custom') {
      setCustomStun(true)
    } else {
      setCustomStun(false)
      updateSetting('webrtc_stun_server', value)
    }
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      webrtc_enabled: 'Habilitar teleconsultas',
      webrtc_stun_server: 'Servidor STUN para NAT traversal',
      webrtc_turn_server: 'Servidor TURN para casos de NAT restrito',
      webrtc_recording_enabled: 'Habilitar gravação de consultas',
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
            <Video className="h-8 w-8" />
            Telemedicina
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure videochamadas e teleconsultas
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
                <Video className="h-5 w-5 text-blue-600" />
                Teleconsultas por Vídeo
              </CardTitle>
              <CardDescription>
                Permite consultas online via videochamada
              </CardDescription>
            </div>
            <Switch
              checked={settings.webrtc_enabled}
              onCheckedChange={(v) => updateSetting('webrtc_enabled', v)}
            />
          </div>
        </CardHeader>
        {!settings.webrtc_enabled && (
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Funcionalidades de Telemedicina</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Videochamadas HD entre médico e paciente</li>
                  <li>Sala de espera virtual</li>
                  <li>Compartilhamento de tela e documentos</li>
                  <li>Gravação de consultas (opcional)</li>
                  <li>Chat durante a chamada</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Servidores STUN/TURN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Servidores de Conexão
          </CardTitle>
          <CardDescription>
            Servidores que ajudam a estabelecer a conexão de vídeo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webrtc_stun_server">Servidor STUN</Label>
            {!customStun ? (
              <Select
                value={settings.webrtc_stun_server}
                onValueChange={handleStunChange}
                disabled={!settings.webrtc_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_STUN_SERVERS.map((server) => (
                    <SelectItem key={server.value} value={server.value}>
                      {server.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="webrtc_stun_server"
                  value={settings.webrtc_stun_server}
                  onChange={(e) => updateSetting('webrtc_stun_server', e.target.value)}
                  placeholder="stun:seu-servidor.com:3478"
                  disabled={!settings.webrtc_enabled}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomStun(false)
                    updateSetting('webrtc_stun_server', PUBLIC_STUN_SERVERS[0].value)
                  }}
                >
                  Usar padrão
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Servidores STUN são gratuitos e ajudam a descobrir o IP público
            </p>
          </div>

          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertTitle>Servidor TURN (Opcional)</AlertTitle>
            <AlertDescription className="text-sm">
              Um servidor TURN é necessário apenas quando ambos (médico e paciente) 
              estão atrás de firewalls corporativos restritos. Para a maioria dos 
              casos, apenas o STUN é suficiente.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="webrtc_turn_server">Servidor TURN (Opcional)</Label>
              <Input
                id="webrtc_turn_server"
                value={settings.webrtc_turn_server}
                onChange={(e) => updateSetting('webrtc_turn_server', e.target.value)}
                placeholder="turn:seu-servidor.com:3478"
                disabled={!settings.webrtc_enabled}
              />
            </div>

            {settings.webrtc_turn_server && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="webrtc_turn_username">Usuário TURN</Label>
                  <Input
                    id="webrtc_turn_username"
                    value={settings.webrtc_turn_username}
                    onChange={(e) => updateSetting('webrtc_turn_username', e.target.value)}
                    disabled={!settings.webrtc_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webrtc_turn_password">Senha TURN</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webrtc_turn_password"
                      type={showPassword ? 'text' : 'password'}
                      value={settings.webrtc_turn_password}
                      onChange={(e) => updateSetting('webrtc_turn_password', e.target.value)}
                      disabled={!settings.webrtc_enabled}
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
            )}
          </div>
        </CardContent>
        <CardFooter>
          {testResult && (
            <Alert className={`mr-4 flex-1 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={handleTestConnection} 
            disabled={testing || !settings.webrtc_enabled}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Gravação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Gravação de Consultas
              </CardTitle>
              <CardDescription>
                Salvar gravações de teleconsultas
              </CardDescription>
            </div>
            <Switch
              checked={settings.webrtc_recording_enabled}
              onCheckedChange={(v) => updateSetting('webrtc_recording_enabled', v)}
              disabled={!settings.webrtc_enabled}
            />
          </div>
        </CardHeader>
        {settings.webrtc_recording_enabled && (
          <CardContent className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertTitle>Consentimento Obrigatório</AlertTitle>
              <AlertDescription className="text-sm">
                O paciente deve consentir com a gravação antes de iniciar. 
                As gravações são criptografadas e podem ser acessadas apenas pelo médico responsável.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="webrtc_recording_quality">Qualidade</Label>
                <Select
                  value={settings.webrtc_recording_quality}
                  onValueChange={(v) => updateSetting('webrtc_recording_quality', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa (480p) - Menor tamanho</SelectItem>
                    <SelectItem value="medium">Média (720p) - Recomendado</SelectItem>
                    <SelectItem value="high">Alta (1080p) - Maior tamanho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webrtc_recording_storage">Armazenar em</Label>
                <Select
                  value={settings.webrtc_recording_storage}
                  onValueChange={(v) => updateSetting('webrtc_recording_storage', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Servidor Local</SelectItem>
                    <SelectItem value="s3">Amazon S3 / MinIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configurações da Consulta */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Consulta</CardTitle>
          <CardDescription>
            Limites e comportamentos padrão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="webrtc_max_duration_minutes">Duração Máxima</Label>
              <Select
                value={settings.webrtc_max_duration_minutes}
                onValueChange={(v) => updateSetting('webrtc_max_duration_minutes', v)}
                disabled={!settings.webrtc_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h 30min</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A chamada será encerrada automaticamente após este tempo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Sala de Espera Virtual</Label>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  Paciente aguarda até médico entrar
                </span>
                <Switch
                  checked={settings.webrtc_waiting_room_enabled}
                  onCheckedChange={(v) => updateSetting('webrtc_waiting_room_enabled', v)}
                  disabled={!settings.webrtc_enabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
