'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Stethoscope,
  Clock,
  Edit,
  Trash2,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  Building,
  FileText,
  Activity,
  UserPlus,
  Link2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { UserRolesDialog } from '@/components/admin/user-roles-dialog'
import { LinkPatientDialog } from '@/components/admin/link-patient-dialog'

// Função para formatar telefone
const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const trimmed = numbers.slice(0, 11)
  
  // Formata como (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (trimmed.length <= 2) return trimmed
  if (trimmed.length <= 7) return `(${trimmed.slice(0, 2)}) ${trimmed.slice(2)}`
  return `(${trimmed.slice(0, 2)}) ${trimmed.slice(2, 7)}-${trimmed.slice(7)}`
}

interface UserDetails {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  phone?: string
  speciality?: string
  licenseNumber?: string
  assignedRoles?: { role: string; assignedAt: string }[]
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermeiro',
  RECEPTIONIST: 'Recepcionista',
  PATIENT: 'Paciente',
  ACS: 'Agente de Saúde',
  PHARMACIST: 'Farmacêutico',
  LAB_TECH: 'Técnico Lab',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DOCTOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  NURSE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECEPTIONIST: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PATIENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  ACS: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  PHARMACIST: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  LAB_TECH: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [linkPatientOpen, setLinkPatientOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    speciality: '',
    licenseNumber: ''
  })

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Usuário não encontrado',
            description: 'O usuário solicitado não existe.',
            variant: 'destructive'
          })
          router.push('/admin/users')
          return
        }
        throw new Error('Erro ao carregar usuário')
      }

      const data = await response.json()
      setUser(data)
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
        speciality: data.speciality || '',
        licenseNumber: data.licenseNumber || ''
      })
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do usuário.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [router, userId])

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso.'
      })
      setEditDialogOpen(false)
      fetchUser()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user?.isActive })
      })

      if (!response.ok) throw new Error('Erro ao alterar status')

      toast({
        title: 'Sucesso',
        description: `Usuário ${user?.isActive ? 'desativado' : 'ativado'} com sucesso.`
      })
      fetchUser()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive'
      })
    }
  }

  const handleResetPassword = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Erro ao resetar senha')

      const data = await response.json()
      toast({
        title: 'Senha resetada',
        description: `Nova senha temporária: ${data.temporaryPassword}`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível resetar a senha.',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao excluir')

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.'
      })
      router.push('/admin/users')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Usuário não encontrado</p>
        <Button onClick={() => router.push('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
            <p className="text-muted-foreground">Visualize e gerencie informações do usuário</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRolesDialogOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Gerenciar Papéis
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100'}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                  {user.isActive ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.speciality && (
                  <div className="flex items-center gap-2 text-sm">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span>{user.speciality}</span>
                  </div>
                )}
                {user.licenseNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>CRM: {user.licenseNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Papéis Atribuídos</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Papéis do Usuário</CardTitle>
              <CardDescription>
                Papéis atribuídos a este usuário no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.assignedRoles && user.assignedRoles.length > 0 ? (
                <div className="space-y-3">
                  {user.assignedRoles.map((ar, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{ROLE_LABELS[ar.role] || ar.role}</p>
                          <p className="text-sm text-muted-foreground">
                            Atribuído em {new Date(ar.assignedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge className={ROLE_COLORS[ar.role] || 'bg-gray-100'}>
                        {ar.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum papel adicional atribuído</p>
                  <p className="text-sm">O usuário possui apenas o papel principal: {ROLE_LABELS[user.role]}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
              <CardDescription>
                Histórico de ações do usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade registrada</p>
                <p className="text-sm">O histórico de atividades aparecerá aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Administrativas</CardTitle>
              <CardDescription>
                Gerencie o acesso e a conta do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={handleResetPassword}
                >
                  <Key className="h-5 w-5 mr-3 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">Resetar Senha</p>
                    <p className="text-sm text-muted-foreground">Gerar nova senha temporária</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={handleToggleStatus}
                >
                  {user.isActive ? (
                    <>
                      <XCircle className="h-5 w-5 mr-3 text-red-500" />
                      <div className="text-left">
                        <p className="font-medium">Desativar Usuário</p>
                        <p className="text-sm text-muted-foreground">Bloquear acesso ao sistema</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium">Ativar Usuário</p>
                        <p className="text-sm text-muted-foreground">Permitir acesso ao sistema</p>
                      </div>
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4"
                  onClick={() => setRolesDialogOpen(true)}
                >
                  <Shield className="h-5 w-5 mr-3 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Gerenciar Papéis</p>
                    <p className="text-sm text-muted-foreground">Atribuir ou remover papéis</p>
                  </div>
                </Button>

                {/* Mostrar botão de vincular paciente se o usuário tem papel PATIENT */}
                {(user.role === 'PATIENT' || user.assignedRoles?.some(r => r.role === 'PATIENT')) && (
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto p-4 border-cyan-200 hover:bg-cyan-50 dark:border-cyan-900 dark:hover:bg-cyan-950"
                    onClick={() => setLinkPatientOpen(true)}
                  >
                    <UserPlus className="h-5 w-5 mr-3 text-cyan-600" />
                    <div className="text-left">
                      <p className="font-medium text-cyan-700 dark:text-cyan-400">Vincular Paciente</p>
                      <p className="text-sm text-muted-foreground">Criar ou vincular cadastro de paciente</p>
                    </div>
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-5 w-5 mr-3 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium text-red-600">Excluir Usuário</p>
                    <p className="text-sm text-muted-foreground">Remover permanentemente</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel Principal</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(formData.role === 'DOCTOR' || formData.role === 'NURSE') && (
              <>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Input 
                    value={formData.speciality}
                    onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CRM/COREN</Label>
                  <Input 
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {user.name}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles Dialog */}
      <UserRolesDialog
        userId={userId}
        userName={user.name}
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
      />

      {/* Link Patient Dialog */}
      <LinkPatientDialog
        userId={userId}
        userName={user.name}
        userEmail={user.email}
        open={linkPatientOpen}
        onOpenChange={setLinkPatientOpen}
        onSuccess={fetchUser}
      />
    </div>
  )
}
