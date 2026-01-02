'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
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
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { UploadA1Certificate } from '@/components/upload-a1-certificate'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Dados do perfil
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    crmNumber: '',
  })

  // Senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Certificados digitais
  const [certificates, setCertificates] = useState<any[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(false)

  // Notificações
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    newPatient: true,
    appointment: true,
    prescription: true,
    examResults: true,
  })

  // Carregar dados
  useEffect(() => {
    loadProfile()
    loadCertificates()
    loadNotifications()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          specialty: data.specialty || '',
          crmNumber: data.crmNumber || '',
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCertificates = async () => {
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
  }

  const loadNotifications = () => {
    // TODO: Carregar do banco
    const saved = localStorage.getItem('notifications')
    if (saved) {
      setNotifications(JSON.parse(saved))
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!response.ok) throw new Error('Falha ao salvar')

      toast({
        title: 'Salvo com sucesso!',
        description: 'Suas informações foram atualizadas',
      })
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar suas informações',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 8 caracteres',
        variant: 'destructive',
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

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso',
      })
    } catch (error) {
      toast({
        title: 'Erro ao alterar senha',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveNotifications = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
    toast({
      title: 'Preferências salvas',
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
                Gerencie suas preferências e configurações da conta
              </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
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
              </TabsList>

              {/* Aba Perfil */}
              <TabsContent value="profile" className="space-y-4">
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
              </TabsContent>

              {/* Aba Certificados */}
              <TabsContent value="certificates" className="space-y-4">
                {/* Upload de novo certificado */}
                <UploadA1Certificate onSuccess={loadCertificates} />

                {/* Lista de certificados */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meus Certificados</CardTitle>
                    <CardDescription>
                      Certificados digitais ativos na sua conta
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
                        <p>Nenhum certificado cadastrado</p>
                        <p className="text-sm mt-2">
                          Faça upload do seu certificado A1 acima
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {certificates.map((cert) => (
                          <div
                            key={cert.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{cert.subject}</h4>
                                {cert.isActive && (
                                  <Badge variant="default">Ativo</Badge>
                                )}
                                {new Date(cert.notAfter) < new Date() && (
                                  <Badge variant="destructive">Expirado</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {cert.issuer}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  Válido até:{' '}
                                  {new Date(cert.notAfter).toLocaleDateString('pt-BR')}
                                </span>
                                <span>
                                  Usado {cert.usageCount} vezes
                                </span>
                                {cert.lastUsedAt && (
                                  <span>
                                    Última vez:{' '}
                                    {new Date(cert.lastUsedAt).toLocaleDateString(
                                      'pt-BR'
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            {cert.isActive && new Date(cert.notAfter) > new Date() && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        ))}
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
