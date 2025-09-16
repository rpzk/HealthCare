'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/navigation/page-header'
import { Settings, User, Shield, Bell, Database, ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  
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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simular salvamento
    alert('Perfil atualizado com sucesso!')
  }

  const handleSystemSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simular salvamento
    alert('Configurações do sistema atualizadas!')
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'system', label: 'Sistema', icon: Database }
  ]

  return (
    <div className="space-y-6">
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
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo
                      </label>
                      <Input
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Especialidade
                      </label>
                      <Input
                        value={profileData.specialty}
                        onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                        placeholder="Sua especialidade"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Autenticação por SMS</p>
                        <p className="text-sm text-gray-600">Receba códigos via SMS</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">App Autenticador</p>
                        <p className="text-sm text-gray-600">Use Google Authenticator ou similar</p>
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
                        <p className="text-sm text-gray-600">Notificações dentro da plataforma</p>
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
                        <p className="text-sm text-gray-600">Receber emails sobre atividades importantes</p>
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
                        <p className="text-sm text-gray-600">Mensagens de texto para alertas críticos</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequência de Backup
                        </label>
                        <select
                          value={systemSettings.backupFrequency}
                          onChange={(e) => setSystemSettings(prev => ({ 
                            ...prev, 
                            backupFrequency: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="hourly">A cada hora</option>
                          <option value="daily">Diário</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="font-medium">Modo Manutenção</p>
                          <p className="text-sm text-gray-600">Bloquear acesso de usuários para manutenção</p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
