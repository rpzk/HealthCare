'use client'

import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/navigation/page-header'
import { User, Shield, Bell, Database, Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: 'Admin Healthcare',
    email: 'admin@healthcare.com',
    phone: '(11) 99999-9999',
    specialty: 'Administração',
    crm: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [systemSettings, setSystemSettings] = useState({
    enableNotifications: true,
    enableSMS: false,
    enableEmail: true,
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    backupFrequency: 'daily',
    maintenanceMode: false
  })

  const [emailConfig, setEmailConfig] = useState({
    EMAIL_ENABLED: 'false',
    EMAIL_PROVIDER: 'console',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_SECURE: 'false',
    EMAIL_FROM: ''
  })

  useEffect(() => {
    if (activeTab === 'system') {
      fetch('/api/settings?category=EMAIL')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const newConfig = { ...emailConfig }
            data.forEach((setting: any) => {
              if (Object.prototype.hasOwnProperty.call(newConfig, setting.key)) {
                // @ts-ignore
                newConfig[setting.key] = setting.value
              }
            })
            setEmailConfig(newConfig)
          }
        })
        .catch(err => console.error('Failed to load settings', err))
    }
  }, [activeTab])

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Simular salvamento
    alert('Perfil atualizado com sucesso!')
  }

  const handleSystemSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Simular salvamento
    alert('Configurações do sistema atualizadas!')
  }

  const handleEmailConfigSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const promises = Object.entries(emailConfig).map(([key, value]) => 
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value,
            category: 'EMAIL',
            description: 'Email Configuration'
          })
        }).then(async res => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || `Erro ${res.status}`)
          }
          return res
        })
      )
      
      await Promise.all(promises)
      alert('Configurações de email salvas com sucesso!')
    } catch (error: any) {
      console.error(error)
      alert(`Erro ao salvar configurações: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleTestEmail = async () => {
    if (!emailConfig.EMAIL_ENABLED || emailConfig.EMAIL_ENABLED === 'false') {
      alert('Habilite o envio de e-mails e SALVE as configurações antes de testar.')
      return
    }

    const testAddress = prompt('Digite o e-mail para receber o teste (certifique-se de ter SALVADO as configurações antes):', emailConfig.SMTP_USER || '')
    if (!testAddress) return

    setTestingEmail(true)
    try {
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: testAddress,
          config: emailConfig
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.')
      } else {
        throw new Error(data.error || 'Falha no envio')
      }
    } catch (error) {
      console.error(error)
      alert(`Erro ao enviar e-mail de teste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setTestingEmail(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'system', label: 'Sistema', icon: Database }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie suas preferências e configurações do sistema"
        breadcrumbs={[
          { label: 'Configurações' }
        ]}
        showBackButton={true}
        showHomeButton={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu lateral */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Conteúdo */}
        <div className="lg:col-span-3 space-y-6">
          {/* Perfil */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e profissionais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Nome Completo
                      </label>
                      <Input
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Telefone
                      </label>
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Especialidade
                      </label>
                      <Input
                        value={profileData.specialty}
                        onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                        placeholder="Sua especialidade"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        CRM (opcional)
                      </label>
                      <Input
                        value={profileData.crm}
                        onChange={(e) => setProfileData(prev => ({ ...prev, crm: e.target.value }))}
                        placeholder="000000/SP"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Salvar Alterações</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Segurança */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Mantenha sua conta segura com uma senha forte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Senha Atual
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Digite sua senha atual"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Nova Senha
                      </label>
                      <Input
                        type="password"
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Digite a nova senha"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Confirmar Nova Senha
                      </label>
                      <Input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirme a nova senha"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Alterar Senha</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Autenticação de Dois Fatores</CardTitle>
                  <CardDescription>
                    Adicione uma camada extra de segurança à sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Autenticação por SMS</p>
                        <p className="text-sm text-muted-foreground">Receba códigos via SMS</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">App Autenticador</p>
                        <p className="text-sm text-muted-foreground">Use Google Authenticator ou similar</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notificações */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como e quando receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações no Sistema</p>
                        <p className="text-sm text-muted-foreground">Notificações dentro da plataforma</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableNotifications}
                        onChange={(e) => setSystemSettings(prev => ({ 
                          ...prev, 
                          enableNotifications: e.target.checked 
                        }))}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por Email</p>
                        <p className="text-sm text-muted-foreground">Receber emails sobre atividades importantes</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableEmail}
                        onChange={(e) => setSystemSettings(prev => ({ 
                          ...prev, 
                          enableEmail: e.target.checked 
                        }))}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por SMS</p>
                        <p className="text-sm text-muted-foreground">Mensagens de texto para alertas críticos</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableSMS}
                        onChange={(e) => setSystemSettings(prev => ({ 
                          ...prev, 
                          enableSMS: e.target.checked 
                        }))}
                        className="rounded"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>Salvar Preferências</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sistema */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações do Sistema</CardTitle>
                  <CardDescription>
                    Configurações gerais do sistema (apenas para administradores)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSystemSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Timeout de Sessão (minutos)
                        </label>
                        <Input
                          type="number"
                          value={systemSettings.sessionTimeout}
                          onChange={(e) => setSystemSettings(prev => ({ 
                            ...prev, 
                            sessionTimeout: parseInt(e.target.value) 
                          }))}
                          min="5"
                          max="480"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Máximo de Tentativas de Login
                        </label>
                        <Input
                          type="number"
                          value={systemSettings.maxLoginAttempts}
                          onChange={(e) => setSystemSettings(prev => ({ 
                            ...prev, 
                            maxLoginAttempts: parseInt(e.target.value) 
                          }))}
                          min="1"
                          max="10"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Frequência de Backup
                        </label>
                        <select
                          value={systemSettings.backupFrequency}
                          onChange={(e) => setSystemSettings(prev => ({ 
                            ...prev, 
                            backupFrequency: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        >
                          <option value="hourly">A cada hora</option>
                          <option value="daily">Diário</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div>
                          <p className="font-medium">Modo Manutenção</p>
                          <p className="text-sm text-muted-foreground">Bloquear acesso de usuários para manutenção</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={systemSettings.maintenanceMode}
                          onChange={(e) => setSystemSettings(prev => ({ 
                            ...prev, 
                            maintenanceMode: e.target.checked 
                          }))}
                          className="rounded"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" className="flex items-center space-x-2">
                        <Database className="h-4 w-4" />
                        <span>Salvar Configurações</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuração de E-mail (SMTP)</CardTitle>
                  <CardDescription>Configure o servidor de e-mail para envio de convites e notificações</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailConfigSave} className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="emailEnabled"
                        checked={emailConfig.EMAIL_ENABLED === 'true'}
                        onChange={(e) => setEmailConfig({ ...emailConfig, EMAIL_ENABLED: e.target.checked ? 'true' : 'false' })}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="emailEnabled" className="text-sm font-medium">Habilitar envio de e-mails</label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Provedor</label>
                        <select
                          value={emailConfig.EMAIL_PROVIDER}
                          onChange={(e) => setEmailConfig({ ...emailConfig, EMAIL_PROVIDER: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="console">Console (Log apenas)</option>
                          <option value="smtp">SMTP (Gmail, Outlook, etc)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remetente (From)</label>
                        <Input
                          value={emailConfig.EMAIL_FROM}
                          onChange={(e) => setEmailConfig({ ...emailConfig, EMAIL_FROM: e.target.value })}
                          placeholder="noreply@healthcare.com"
                        />
                      </div>
                    </div>

                    {emailConfig.EMAIL_PROVIDER === 'smtp' && (
                      <div className="space-y-4 border-t pt-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Host SMTP</label>
                            <Input
                              value={emailConfig.SMTP_HOST}
                              onChange={(e) => setEmailConfig({ ...emailConfig, SMTP_HOST: e.target.value })}
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Porta</label>
                            <Input
                              value={emailConfig.SMTP_PORT}
                              onChange={(e) => setEmailConfig({ ...emailConfig, SMTP_PORT: e.target.value })}
                              placeholder="587"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Usuário</label>
                            <Input
                              value={emailConfig.SMTP_USER}
                              onChange={(e) => setEmailConfig({ ...emailConfig, SMTP_USER: e.target.value })}
                              placeholder="seu-email@gmail.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Senha</label>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={emailConfig.SMTP_PASS}
                                onChange={(e) => setEmailConfig({ ...emailConfig, SMTP_PASS: e.target.value })}
                                placeholder="Senha de app"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="smtpSecure"
                            checked={emailConfig.SMTP_SECURE === 'true'}
                            onChange={(e) => setEmailConfig({ ...emailConfig, SMTP_SECURE: e.target.checked ? 'true' : 'false' })}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="smtpSecure" className="text-sm font-medium">Usar SSL/TLS (Secure)</label>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                      >
                        {testingEmail ? 'Enviando...' : 'Testar Configuração'}
                      </Button>
                      <Button type="submit" className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Salvar Configurações de E-mail</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informações do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong>Versão:</strong> 1.0.0</p>
                      <p><strong>Banco de Dados:</strong> PostgreSQL</p>
                      <p><strong>Última Atualização:</strong> 24/08/2025</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong>Status:</strong> Online</p>
                      <p><strong>Último Backup:</strong> Hoje, 03:00</p>
                      <p><strong>Uptime:</strong> 15 dias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configurações de Email */}
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Email</CardTitle>
                  <CardDescription>
                    Configure como o sistema envia emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailConfigSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Habilitar Email
                        </label>
                        <select
                          value={emailConfig.EMAIL_ENABLED}
                          onChange={(e) => setEmailConfig(prev => ({ 
                            ...prev, 
                            EMAIL_ENABLED: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        >
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Provedor de Email
                        </label>
                        <select
                          value={emailConfig.EMAIL_PROVIDER}
                          onChange={(e) => setEmailConfig(prev => ({ 
                            ...prev, 
                            EMAIL_PROVIDER: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        >
                          <option value="console">Console</option>
                          <option value="smtp">SMTP</option>
                        </select>
                      </div>

                      {emailConfig.EMAIL_PROVIDER === 'smtp' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                              Host SMTP
                            </label>
                            <Input
                              value={emailConfig.SMTP_HOST}
                              onChange={(e) => setEmailConfig(prev => ({ ...prev, SMTP_HOST: e.target.value }))}
                              placeholder="smtp.seudominio.com"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                              Porta SMTP
                            </label>
                            <Input
                              type="number"
                              value={emailConfig.SMTP_PORT}
                              onChange={(e) => setEmailConfig(prev => ({ ...prev, SMTP_PORT: e.target.value }))}
                              min="1"
                              max="65535"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                              Usuário SMTP
                            </label>
                            <Input
                              value={emailConfig.SMTP_USER}
                              onChange={(e) => setEmailConfig(prev => ({ ...prev, SMTP_USER: e.target.value }))}
                              placeholder="seu-usuario"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                              Senha SMTP
                            </label>
                            <Input
                              type="password"
                              value={emailConfig.SMTP_PASS}
                              onChange={(e) => setEmailConfig(prev => ({ ...prev, SMTP_PASS: e.target.value }))}
                              placeholder="sua-senha"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                              Segurança SMTP
                            </label>
                            <select
                              value={emailConfig.SMTP_SECURE}
                              onChange={(e) => setEmailConfig(prev => ({ 
                                ...prev, 
                                SMTP_SECURE: e.target.value 
                              }))}
                              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            >
                              <option value="true">SSL/TLS</option>
                              <option value="false">Nenhuma</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Email Remetente
                        </label>
                        <Input
                          value={emailConfig.EMAIL_FROM}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, EMAIL_FROM: e.target.value }))}
                          placeholder="noreply@seudominio.com"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Salvar Configurações de Email</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
        </main>
      </div>
    </div>
  )
}
