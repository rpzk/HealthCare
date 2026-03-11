'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { startRegistration } from '@simplewebauthn/browser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Shield,
  Bell,
  FileSignature,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Server,
  Send,
  Settings as SettingsIcon,
  Calendar,
  Database,
  PowerOff,
  Trash2,
  Users,
  Activity,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import { UploadA1Certificate } from '@/components/upload-a1-certificate'
import { CloudCertificateConfig } from '@/components/cloud-certificate-config'
import { PatientBookingConfig } from '@/components/patient-booking-config'
import { ScheduleBlockingConfig } from '@/components/schedule-blocking-config'
import { AdvancedScheduleBlockingConfig } from '@/components/advanced-schedule-blocking-config'
import { ClinicScheduleConfig } from '@/components/admin/clinic-schedule-config'
import { ScheduleRequestsManager } from '@/components/admin/schedule-requests-manager'
import { ProfessionalScheduleRequest } from '@/components/professional-schedule-request'
import { ScheduleSummaryCard } from '@/components/schedule-summary-card'
import { BackupManager } from '@/components/admin/backup-manager'

interface PasskeyInfo {
  id: string
  nickname?: string | null
  createdAt: string
  lastUsedAt?: string | null
  deviceType?: string | null
  backedUp: boolean
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  // Dados do perfil
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    crmNumber: '',
  })

  // Perfil completo (stats, 2FA) para aba Perfil
  const [profileFull, setProfileFull] = useState<{
    role?: string
    joinDate?: string
    twoFactorEnabled?: boolean
    stats?: { totalPatients: number; totalConsultations: number; totalPrescriptions: number; totalExams: number }
  } | null>(null)

  // Passkeys
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [deletingPasskey, setDeletingPasskey] = useState<string | null>(null)

  // Senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Certificados digitais
  const [certificates, setCertificates] = useState<any[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(false)
  const [certificateActionId, setCertificateActionId] = useState<string | null>(null)

  // Configurações de Email/SMTP
  const [emailConfig, setEmailConfig] = useState({
    EMAIL_ENABLED: 'false',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    SMTP_FROM_NAME: 'HealthCare',
  })

  // Notificações
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    newPatient: true,
    appointment: true,
    prescription: true,
    examResults: true,
  })

  const loadNotifications = useCallback(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      setNotifications(JSON.parse(saved))
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          specialty: data.specialty || '',
          crmNumber: data.licenseState && data.crmNumber
            ? `${data.crmNumber}/${data.licenseState}`
            : data.crmNumber || '',
        })
        setProfileFull({
          role: data.role,
          joinDate: data.joinDate,
          twoFactorEnabled: data.twoFactorEnabled,
          stats: data.stats,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPasskeys = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/webauthn/credentials')
      if (res.ok) {
        const data = await res.json()
        setPasskeys(data.credentials || [])
      }
    } catch (err) {
      console.error('Erro ao carregar passkeys', err)
    }
  }, [])

  const formatPasskeyError = (err: unknown): string => {
    const e = err as Error & { name?: string }
    let msg = e?.message ?? (typeof e === 'string' ? e : String(e ?? 'Erro desconhecido'))
    if (!msg || msg === '[object Object]') {
      msg = e?.name === 'NotAllowedError'
        ? 'A operação foi cancelada ou não permitida pelo navegador.'
        : e?.name === 'InvalidStateError'
          ? 'Esta passkey já está cadastrada neste dispositivo.'
          : 'Não foi possível registrar a passkey.'
    }
    if (msg.includes('not allowed') || msg.includes('user denied') || msg.includes('denied permission') || msg.includes('cancel')) {
      return 'A operação foi cancelada ou bloqueada. Certifique-se de permitir a criação da passkey.'
    }
    return msg
  }

  const registerPasskey = async () => {
    setPasskeyError(null)
    setPasskeyLoading(true)
    try {
      const optionsRes = await fetch('/api/auth/webauthn/register/options', { method: 'POST' })
      if (!optionsRes.ok) {
        const data = await optionsRes.json()
        throw new Error(data.error || 'Não foi possível iniciar o registro de passkey')
      }
      const options = await optionsRes.json()
      const attestation = await startRegistration(options)
      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation })
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}))
        throw new Error(data.error || `Falha ao salvar passkey (${verifyRes.status})`)
      }
      await fetchPasskeys()
      setPasskeyError(null)
      toast.success('Passkey cadastrada com sucesso!')
    } catch (err: Error | unknown) {
      const msg = formatPasskeyError(err)
      setPasskeyError(msg)
      toast.error(msg)
    } finally {
      setPasskeyLoading(false)
    }
  }

  const deletePasskey = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta passkey?')) return
    setDeletingPasskey(id)
    setPasskeyError(null)
    try {
      const res = await fetch(`/api/auth/webauthn/credentials?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover passkey')
      }
      await fetchPasskeys()
      toast.success('Passkey removida')
    } catch (err: any) {
      setPasskeyError(err?.message || 'Erro ao remover passkey')
      toast.error(err?.message || 'Erro ao remover passkey')
    } finally {
      setDeletingPasskey(null)
    }
  }

  const loadCertificates = useCallback(async () => {
    try {
      setCertificatesLoading(true)
      const response = await fetch('/api/certificates/upload-a1')
      if (response.ok) {
        const data = await response.json()
        setCertificates(data.certificates || [])
      }
    } catch (error) {
      console.error('Erro ao carregar certificados:', error)
    } finally {
      setCertificatesLoading(false)
    }
  }, [])

  const loadEmailConfig = useCallback(async () => {
    try {
      if ((session?.user as any)?.role !== 'ADMIN') return
      const response = await fetch('/api/system/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          const emailSettings: any = {}
          data.settings.forEach((s: any) => {
            if (s.key.startsWith('EMAIL') || s.key.startsWith('SMTP')) {
              if (s.key === 'SMTP_PASS' || s.key === 'SMTP_PASSWORD') {
                // Nunca carregar senha real via list (pode vir mascarada como ********)
                emailSettings['SMTP_PASS'] = '••••••••'
              } else {
                emailSettings[s.key] = s.value
              }
            }
          })
          setEmailConfig((prev) => {
            const updated = { ...prev, ...emailSettings }
            return updated
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de e-mail:', error)
    }
  }, [session])

  // Tab inicial da URL
  const tabParam = searchParams.get('tab') || (searchParams.get('force2fa') === 'true' ? 'security' : 'profile')
  const force2FA = searchParams.get('force2fa') === 'true'
  const validTabs = ['profile', 'security', 'certificates', 'notifications', 'scheduling', 'email', 'backups', 'system']
  const activeTab = validTabs.includes(tabParam) ? tabParam : 'profile'

  // Carregar dados
  useEffect(() => {
    void loadProfile()
    void loadCertificates()
    void fetchPasskeys()
    loadNotifications()
  }, [loadCertificates, loadNotifications, loadProfile, fetchPasskeys])

  useEffect(() => {
    void loadEmailConfig()
  }, [loadEmailConfig])

  const saveProfile = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!response.ok) throw new Error('Falha ao salvar')

      toast.success('Salvo com sucesso!', {
        description: 'Suas informações foram atualizadas',
      })
    } catch (error) {
      toast.error('Erro ao salvar', {
        description: 'Não foi possível atualizar suas informações',
      })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Senhas não conferem', {
        description: 'A nova senha e a confirmação devem ser iguais',
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Senha muito curta', {
        description: 'A senha deve ter pelo menos 8 caracteres',
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao alterar senha')
      }

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      toast.success('Senha alterada!', {
        description: 'Sua senha foi atualizada com sucesso',
      })
    } catch (error) {
      toast.error('Erro ao alterar senha', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveEmailConfig = async () => {
    try {
      if ((session?.user as any)?.role !== 'ADMIN') {
        toast.error('Acesso negado', {
          description: 'Apenas administradores podem alterar a configuração de e-mail do sistema',
        })
        return
      }
      setSaving(true)

      const isMaskedSecret = (val: unknown) => {
        if (typeof val !== 'string') return false
        const trimmed = val.trim()
        return trimmed.length > 0 && (/^[*•]+$/.test(trimmed) || trimmed === '********')
      }
      
      // Só enviar SMTP_PASS se o user digitou uma senha nova (não é máscara)
      const newPassword = emailConfig.SMTP_PASS
      const hasNewPassword = !!newPassword && !isMaskedSecret(newPassword)
      
      const configToSave = Object.entries(emailConfig)
        .filter(([key]) => key !== 'SMTP_PASS') // Remover campo de senha temporariamente
        .concat(hasNewPassword ? [['SMTP_PASS', newPassword.replace(/\s+/g, '')]] : []) // Adicionar só se houver nova

      const promises = configToSave.map(([key, value]) =>
        fetch('/api/system/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value,
            category: 'EMAIL',
          }),
        })
      )

      const results = await Promise.all(promises)
      const firstError = results.find((r) => !r.ok)
      if (firstError) {
        const data = await firstError.json().catch(() => null)
        throw new Error(data?.error || 'Falha ao salvar configurações de e-mail')
      }

      toast.success('Configurações de e-mail salvas!', {
        description: 'As configurações SMTP foram atualizadas',
      })
      
      // Recarregar configurações após salvar (para atualizar a máscara)
      loadEmailConfig()
    } catch (error) {
      toast.error('Erro ao salvar configurações de e-mail', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if ((session?.user as any)?.role !== 'ADMIN') {
      toast.error('Acesso negado', {
        description: 'Apenas administradores podem testar o envio de e-mails',
      })
      return
    }
    if (!emailConfig.EMAIL_ENABLED || emailConfig.EMAIL_ENABLED === 'false') {
      toast.error('E-mail desabilitado', {
        description: 'Ative o envio de e-mails antes de testar',
      })
      return
    }

    const testAddress = prompt(
      'Digite o e-mail para receber o teste (certifique-se de ter SALVADO as configurações antes):',
      emailConfig.SMTP_USER || ''
    )
    if (!testAddress) return

    if (emailConfig.EMAIL_PROVIDER === 'smtp' && !emailConfig.SMTP_HOST) {
      toast.error('Configuração incompleta', {
        description: 'Configure o servidor SMTP antes de testar',
      })
      return
    }

    try {
      setTestingEmail(true)
      const sanitizedConfig = {
        ...emailConfig,
        SMTP_PASS: (emailConfig.SMTP_PASS || '').replace(/\s+/g, ''),
      }
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testAddress,
          config: sanitizedConfig,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('E-mail de teste enviado!', {
          description: `Verifique a caixa de entrada de ${testAddress}`,
        })
      } else {
        toast.error('Falha ao enviar e-mail', {
          description: data.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      toast.error('Erro ao enviar e-mail de teste', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setTestingEmail(false)
    }
  }

  const saveNotifications = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
    toast.success('Preferências salvas', {
      description: 'Suas preferências de notificação foram atualizadas',
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </main>
        </div>
      </div>
    )
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seu perfil, segurança e preferências do sistema
              </p>
            </div>

            {/* Banner 2FA obrigatório */}
            {force2FA && !profileFull?.twoFactorEnabled && (profileFull?.role === 'ADMIN' || profileFull?.role === 'DOCTOR') && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <span className="font-medium">Autenticação em Dois Fatores Obrigatória.</span>{' '}
                  {profileFull?.role === 'ADMIN' ? 'Administradores' : 'Médicos'} devem habilitar 2FA. Configure na aba Segurança abaixo.
                </AlertDescription>
              </Alert>
            )}

            <Tabs
              value={activeTab}
              onValueChange={(v) => router.replace(`/settings?tab=${v}`, { scroll: false })}
              className="space-y-6"
            >
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-8' : 'grid-cols-6'}`}>
                <TabsTrigger value="profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  Segurança
                </TabsTrigger>
                <TabsTrigger value="certificates">
                  <FileSignature className="mr-2 h-4 w-4" />
                  Certificados
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="scheduling">
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendamento
                </TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="mr-2 h-4 w-4" />
                  E-mail
                </TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="backups">
                      <Database className="mr-2 h-4 w-4" />
                      Backups
                    </TabsTrigger>
                    <TabsTrigger value="system">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Sistema
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Aba Perfil */}
              <TabsContent value="profile" className="space-y-4">
                {/* Estatísticas */}
                {profileFull?.stats && (profileFull.role === 'ADMIN' || profileFull.role === 'DOCTOR' || profileFull.role === 'NURSE') && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-2xl font-bold">{profileFull.stats.totalPatients}</p>
                        <p className="text-sm text-muted-foreground">Pacientes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Activity className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-2xl font-bold">{profileFull.stats.totalConsultations}</p>
                        <p className="text-sm text-muted-foreground">Consultas</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <FileSignature className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                        <p className="text-2xl font-bold">{profileFull.stats.totalPrescriptions}</p>
                        <p className="text-sm text-muted-foreground">Prescrições</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Award className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                        <p className="text-2xl font-bold">{profileFull.stats.totalExams}</p>
                        <p className="text-sm text-muted-foreground">Exames</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>
                      Atualize seus dados pessoais e profissionais
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email não pode ser alterado
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialty">Especialidade</Label>
                        <Input
                          id="specialty"
                          value={profile.specialty}
                          onChange={(e) =>
                            setProfile({ ...profile, specialty: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="crm">CRM</Label>
                        <Input
                          id="crm"
                          value={profile.crmNumber}
                          onChange={(e) =>
                            setProfile({ ...profile, crmNumber: e.target.value })
                          }
                          placeholder="12345/UF"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button onClick={saveProfile} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Segurança */}
              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                      Mantenha sua conta segura com uma senha forte
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Senha Atual</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        A senha deve ter pelo menos 8 caracteres e incluir letras e
                        números
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-end">
                      <Button onClick={savePassword} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Alterar Senha
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 2FA e Passkeys */}
                <Card id="seguranca">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Autenticação em Dois Fatores e Passkeys
                    </CardTitle>
                    <CardDescription>
                      Proteja sua conta com 2FA (TOTP) e passkeys (Face ID, Touch ID, Windows Hello)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <TwoFactorSetup
                      isEnabled={profileFull?.twoFactorEnabled || false}
                      onStatusChange={loadProfile}
                      embedded
                    />
                    <Separator />
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <div>
                          <h4 className="font-semibold">Passkeys</h4>
                          <p className="text-sm text-muted-foreground">
                            Face ID, Touch ID, Windows Hello ou chave FIDO2
                          </p>
                        </div>
                        <Button onClick={registerPasskey} disabled={passkeyLoading} variant="outline" size="sm">
                          {passkeyLoading ? 'Registrando...' : 'Adicionar Passkey'}
                        </Button>
                      </div>
                      {passkeyError && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-md p-2 mb-3">
                          {passkeyError}
                        </div>
                      )}
                      {passkeys.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma passkey cadastrada.</p>
                      ) : (
                        <div className="space-y-2">
                          {passkeys.map((pk) => (
                            <div key={pk.id} className="flex items-center justify-between border rounded-md p-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{pk.nickname || 'Passkey'}</p>
                                <p className="text-xs text-muted-foreground">
                                  Criada em {new Date(pk.createdAt).toLocaleDateString('pt-BR')} · {pk.deviceType || 'dispositivo'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePasskey(pk.id)}
                                disabled={deletingPasskey === pk.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                {deletingPasskey === pk.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Recomendamos pelo menos 2 passkeys (celular e notebook) para evitar bloqueio.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Certificados */}
              <TabsContent value="certificates" className="space-y-4">
                <CloudCertificateConfig />
                <UploadA1Certificate onSuccess={loadCertificates} />

                <Card>
                  <CardHeader>
                    <CardTitle>Meus Certificados</CardTitle>
                    <CardDescription>
                      Certificados digitais cadastrados na sua conta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {certificatesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : certificates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Nenhum certificado cadastrado</p>
                        <p className="text-sm mt-2">
                          Faça upload do seu certificado A1 acima para assinar documentos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {certificates.map((cert) => {
                          const isExpired = new Date(cert.notAfter) < new Date()
                          const isActive = cert.isActive && !isExpired
                          const needsReupload = !cert.isActive && !isExpired
                          
                          return (
                            <div
                              key={cert.id}
                              className={`p-4 border-2 rounded-lg ${
                                isActive 
                                  ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' 
                                  : isExpired
                                  ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                                  : 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Status Principal */}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {isActive ? (
                                        <Badge className="bg-green-600 hover:bg-green-700">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Ativo e Pronto para Uso
                                        </Badge>
                                      ) : isExpired ? (
                                        <Badge variant="destructive">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Expirado
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-yellow-600 hover:bg-yellow-700">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Inativo - Recarregue o certificado
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {cert.certificateType || 'A1'}
                                      </Badge>
                                    </div>
                                  </div>
                                  {isActive && (
                                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                                  )}
                                  {isExpired && (
                                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                                  )}
                                  {needsReupload && (
                                    <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                                  )}
                                </div>

                                {/* Nome do Certificado */}
                                <div>
                                  <h4 className="font-semibold text-sm line-clamp-2 break-all">
                                    {cert.subject}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 break-all">
                                    {cert.issuer}
                                  </p>
                                </div>

                                {/* Informações */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Válido até</p>
                                    <p className="font-medium">
                                      {new Date(cert.notAfter).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Uso</p>
                                    <p className="font-medium">{cert.usageCount} vezes</p>
                                  </div>
                                  {cert.lastUsedAt && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Último uso</p>
                                      <p className="font-medium">
                                        {new Date(cert.lastUsedAt).toLocaleDateString('pt-BR')} às{' '}
                                        {new Date(cert.lastUsedAt).toLocaleTimeString('pt-BR', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Mensagem de Status */}
                                {isActive && (
                                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800 dark:text-green-300 text-xs">
                                      ✅ Certificado carregado e pronto para assinar documentos
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {isExpired && (
                                  <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-800 dark:text-red-300 text-xs">
                                      ❌ Certificado expirado. Faça upload de um novo certificado válido.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {needsReupload && (
                                  <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-xs">
                                      ⚠️ Este certificado está inativo. Faça upload novamente usando o formulário acima para ativá-lo.
                                    </AlertDescription>
                                  </Alert>
                                )}

                                {/* Ações: Desativar / Excluir */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                  {isActive && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={certificateActionId === cert.id}
                                      onClick={async () => {
                                        if (!confirm('Desativar este certificado? Você poderá ativar outro fazendo novo upload.')) return
                                        setCertificateActionId(cert.id)
                                        try {
                                          const res = await fetch(`/api/digital-signatures/certificates/${cert.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ isActive: false }),
                                          })
                                          if (!res.ok) throw new Error((await res.json()).error || 'Falha ao desativar')
                                          toast.success('Certificado desativado')
                                          loadCertificates()
                                        } catch (e: any) {
                                          toast.error(e?.message || 'Erro ao desativar')
                                        } finally {
                                          setCertificateActionId(null)
                                        }
                                      }}
                                    >
                                      {certificateActionId === cert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                                      <span className="ml-1">Desativar</span>
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    disabled={certificateActionId === cert.id}
                                    onClick={async () => {
                                      if (!confirm('Remover este certificado? O arquivo .pfx será excluído. Você pode fazer upload de outro depois.')) return
                                      setCertificateActionId(cert.id)
                                      try {
                                        const res = await fetch(`/api/digital-signatures/certificates/${cert.id}`, { method: 'DELETE' })
                                        if (!res.ok) throw new Error((await res.json()).error || 'Falha ao remover')
                                        toast.success('Certificado removido')
                                        loadCertificates()
                                      } catch (e: any) {
                                        toast.error(e?.message || 'Erro ao remover')
                                      } finally {
                                        setCertificateActionId(null)
                                      }
                                    }}
                                  >
                                    {certificateActionId === cert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span className="ml-1">Excluir</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Notificações */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferências de Notificação</CardTitle>
                    <CardDescription>
                      Escolha como deseja receber notificações
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-4">Canais</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="email-notifications">
                              Notificações por Email
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Receba atualizações no seu email
                            </p>
                          </div>
                          <Switch
                            id="email-notifications"
                            checked={notifications.email}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, email: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="push-notifications">
                              Notificações Push
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Receba alertas no navegador
                            </p>
                          </div>
                          <Switch
                            id="push-notifications"
                            checked={notifications.push}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, push: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Eventos</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="new-patient">Novo Paciente</Label>
                          <Switch
                            id="new-patient"
                            checked={notifications.newPatient}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                newPatient: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="appointment">Consultas Agendadas</Label>
                          <Switch
                            id="appointment"
                            checked={notifications.appointment}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                appointment: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="prescription">Prescrições</Label>
                          <Switch
                            id="prescription"
                            checked={notifications.prescription}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                prescription: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="exam-results">
                            Resultados de Exames
                          </Label>
                          <Switch
                            id="exam-results"
                            checked={notifications.examResults}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                examResults: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button onClick={saveNotifications}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Preferências
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Agendamento */}
              <TabsContent value="scheduling" className="space-y-4">
                {/* Resumo da agenda (profissionais) */}
                <ScheduleSummaryCard />
                <Separator className="my-6" />

                {/* Admin/Secretária: Configuração da Clínica */}
                {(session?.user?.role === 'ADMIN' || session?.user?.role === 'RECEPTIONIST') && (
                  <>
                    <ClinicScheduleConfig />
                    <Separator className="my-6" />
                    <ScheduleRequestsManager />
                    <Separator className="my-6" />
                  </>
                )}

                {/* Profissionais: Solicitação de mudanças */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Minha Agenda</h3>
                    <p className="text-sm text-gray-600">
                      Solicite mudanças na sua agenda que serão avaliadas pela administração
                    </p>
                  </div>
                  <ProfessionalScheduleRequest />
                </div>

                <PatientBookingConfig />
                <Separator className="my-6" />
                <AdvancedScheduleBlockingConfig />
                <Separator className="my-6" />
                <ScheduleBlockingConfig />
              </TabsContent>

              {/* Aba E-mail/SMTP */}
              <TabsContent value="email" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuração de E-mail (SMTP)</CardTitle>
                    <CardDescription>
                      Configure o servidor SMTP para envio de e-mails do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isAdmin ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Esta configuração é global do sistema e pode ser alterada apenas por administradores.
                          O envio de convites usa a configuração definida pelo admin.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-enabled">Habilitar envio de e-mails</Label>
                        <p className="text-sm text-muted-foreground">
                          Ative para permitir o envio de e-mails
                        </p>
                      </div>
                      <Switch
                        id="email-enabled"
                        checked={emailConfig.EMAIL_ENABLED === 'true'}
                        onCheckedChange={(checked) =>
                          setEmailConfig({
                            ...emailConfig,
                            EMAIL_ENABLED: checked ? 'true' : 'false',
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Servidor SMTP</Label>
                      <Input
                        id="smtp-host"
                        placeholder="smtp.gmail.com"
                        value={emailConfig.SMTP_HOST}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, SMTP_HOST: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp-port">Porta</Label>
                        <Input
                          id="smtp-port"
                          placeholder="587"
                          value={emailConfig.SMTP_PORT}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              SMTP_PORT: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-user">Usuário</Label>
                        <Input
                          id="smtp-user"
                          placeholder="seu@email.com"
                          value={emailConfig.SMTP_USER}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              SMTP_USER: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">Senha ou App Password</Label>
                      <Input
                        id="smtp-password"
                        type="password"
                        placeholder="••••••••"
                        value={emailConfig.SMTP_PASS}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            SMTP_PASS: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp-from">E-mail remetente</Label>
                        <Input
                          id="smtp-from"
                          placeholder="noreply@healthcare.com"
                          value={emailConfig.SMTP_FROM}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              SMTP_FROM: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-from-name">Nome remetente</Label>
                        <Input
                          id="smtp-from-name"
                          placeholder="HealthCare"
                          value={emailConfig.SMTP_FROM_NAME}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              SMTP_FROM_NAME: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <Alert>
                      <Server className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Gmail:</strong> Use smtp.gmail.com (porta 587) e gere uma
                        senha de aplicativo em https://myaccount.google.com/apppasswords
                      </AlertDescription>
                    </Alert>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                      >
                        {testingEmail ? (
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

                      <Button onClick={saveEmailConfig} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Configurações
                          </>
                        )}
                      </Button>
                    </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Backups (Admin only) */}
              {isAdmin && (
                <TabsContent value="backups" className="space-y-4">
                  <BackupManager />
                </TabsContent>
              )}

              {/* Aba Sistema (Admin only) */}
              {isAdmin && (
                <TabsContent value="system" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações do Sistema</CardTitle>
                      <CardDescription>
                        Gerenciar configurações avançadas do sistema (Admin)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Para configurações avançadas de sistema (Redis, Storage,
                            WebRTC, etc.), acesse{' '}
                            <a
                              href="/admin/settings"
                              className="font-medium underline"
                            >
                              Painel de Administração → Configurações
                            </a>
                          </AlertDescription>
                        </Alert>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => (window.location.href = '/admin/settings')}
                          >
                            <Server className="mr-2 h-4 w-4" />
                            Ir para Configurações Avançadas
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
