'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/navigation/page-header'
import { startRegistration } from '@simplewebauthn/browser'
import { 
  User, 
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit3,
  Save,
  X,
  Award,
  Activity,
  Users,
  FileText
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  crm: string
  role: string
  status: 'active' | 'inactive'
  joinDate: string
  stats: {
    totalPatients: number
    totalConsultations: number
    totalPrescriptions: number
    totalExams: number
  }
}

interface PasskeyInfo {
  id: string
  nickname?: string | null
  createdAt: string
  lastUsedAt?: string | null
  deviceType?: string | null
  backedUp: boolean
  authenticatorAttachment?: string | null
}

export default function ProfilePage() {
  const { data: _session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
    fetchPasskeys()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) {
        throw new Error('Falha ao carregar perfil')
      }
      const data = await response.json()
      setProfile(data)
      setEditedProfile(data)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
      setError('Não foi possível carregar o perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditMode(true)
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setEditMode(false)
  }

  const handleSave = async () => {
    if (!editedProfile) return
    
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedProfile.name,
          phone: editedProfile.phone,
          specialty: editedProfile.specialty,
        })
      })
      
      if (!response.ok) {
        throw new Error('Falha ao salvar perfil')
      }
      
      setProfile(editedProfile)
      setEditMode(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setError('Não foi possível salvar o perfil')
    } finally {
      setSaving(false)
    }
  }

  const fetchPasskeys = async () => {
    try {
      const res = await fetch('/api/auth/webauthn/credentials')
      if (res.ok) {
        const data = await res.json()
        setPasskeys(data.credentials || [])
      }
    } catch (err) {
      console.error('Erro ao carregar passkeys', err)
    }
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
        const data = await verifyRes.json()
        throw new Error(data.error || 'Falha ao salvar passkey')
      }
      await fetchPasskeys()
    } catch (err: Error | any) {
      console.error('Erro ao registrar passkey', err)
      setPasskeyError(err?.message || 'Erro ao registrar passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (editedProfile) {
      setEditedProfile(prev => prev ? { ...prev, [field]: value } : null)
    }
  }

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Administrador',
      DOCTOR: 'Médico',
      NURSE: 'Enfermeiro(a)',
      RECEPTIONIST: 'Recepcionista',
      PATIENT: 'Paciente',
    }
    return roles[role] || role
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center">
              <p className="text-red-500">{error || 'Perfil não encontrado'}</p>
              <Button onClick={fetchProfile} className="mt-4">Tentar novamente</Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const currentProfile = editMode ? editedProfile! : profile

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <PageHeader
            title="Meu Perfil"
            description="Gerencie suas informações pessoais"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Perfil' }
            ]}
            actions={
              !editMode ? (
                <Button onClick={handleEdit} variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar Perfil
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCancel} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )
            }
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>{currentProfile.name}</CardTitle>
                <CardDescription>{getRoleName(currentProfile.role)}</CardDescription>
                <Badge variant={currentProfile.status === 'active' ? 'default' : 'secondary'}>
                  {currentProfile.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{currentProfile.email}</span>
                </div>
                {currentProfile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{currentProfile.phone}</span>
                  </div>
                )}
                {currentProfile.crm && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>{currentProfile.crm}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Desde {new Date(currentProfile.joinDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats & Edit Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold">{currentProfile.stats.totalPatients}</p>
                    <p className="text-sm text-muted-foreground">Pacientes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Activity className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold">{currentProfile.stats.totalConsultations}</p>
                    <p className="text-sm text-muted-foreground">Consultas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <FileText className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                    <p className="text-2xl font-bold">{currentProfile.stats.totalPrescriptions}</p>
                    <p className="text-sm text-muted-foreground">Prescrições</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Award className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                    <p className="text-2xl font-bold">{currentProfile.stats.totalExams}</p>
                    <p className="text-sm text-muted-foreground">Exames</p>
                  </CardContent>
                </Card>
              </div>

              {/* Edit Form */}
              {editMode && (
                <Card>
                  <CardHeader>
                    <CardTitle>Editar Informações</CardTitle>
                    <CardDescription>Atualize seus dados pessoais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nome Completo</label>
                      <Input
                        value={editedProfile?.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Telefone</label>
                      <Input
                        value={editedProfile?.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Especialidade</label>
                      <Input
                        value={editedProfile?.specialty || ''}
                        onChange={(e) => handleInputChange('specialty', e.target.value)}
                        placeholder="Sua especialidade"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Passkeys */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle>Segurança (Passkeys)</CardTitle>
                    <CardDescription>Use Face/Touch ID, Windows Hello ou chave FIDO2</CardDescription>
                  </div>
                  <Button onClick={registerPasskey} disabled={passkeyLoading} variant="outline">
                    {passkeyLoading ? 'Registrando...' : 'Adicionar Passkey'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {passkeyError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                      {passkeyError}
                    </div>
                  )}
                  {passkeys.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma passkey cadastrada ainda.</p>
                  )}
                  {passkeys.map((pk) => (
                    <div key={pk.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <p className="font-medium">{pk.nickname || 'Passkey'}</p>
                        <p className="text-xs text-muted-foreground">
                          Criada em {new Date(pk.createdAt).toLocaleDateString('pt-BR')} · {pk.deviceType || 'dispositivo'}
                        </p>
                        {pk.lastUsedAt && (
                          <p className="text-xs text-muted-foreground">Último uso: {new Date(pk.lastUsedAt).toLocaleString('pt-BR')}</p>
                        )}
                      </div>
                      <Badge variant={pk.backedUp ? 'default' : 'secondary'}>
                        {pk.backedUp ? 'Backup/Habilitado' : 'Sem backup'}
                      </Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Recomendamos ter pelo menos 2 passkeys (celular e notebook) para evitar bloqueio.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
