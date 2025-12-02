'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { 
  UserCog,
  Shield,
  Stethoscope,
  Users,
  Heart,
  Loader2,
  Search,
  ArrowUpCircle,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  speciality: string | null
  licenseNumber: string | null
  licenseType: string | null
  isActive: boolean
  hasPatientProfile: boolean
}

const roleLabels: Record<string, { label: string, color: string, icon: any }> = {
  ADMIN: { label: 'Administrador', color: 'bg-red-100 text-red-700', icon: Shield },
  DOCTOR: { label: 'Médico', color: 'bg-blue-100 text-blue-700', icon: Stethoscope },
  NURSE: { label: 'Enfermeiro(a)', color: 'bg-green-100 text-green-700', icon: Heart },
  RECEPTIONIST: { label: 'Recepcionista', color: 'bg-purple-100 text-purple-700', icon: Users },
  PATIENT: { label: 'Paciente', color: 'bg-amber-100 text-amber-700', icon: Heart },
  HEALTH_AGENT: { label: 'Agente de Saúde', color: 'bg-teal-100 text-teal-700', icon: Users },
  TECHNICIAN: { label: 'Técnico', color: 'bg-gray-100 text-gray-700', icon: UserCog },
  PHYSIOTHERAPIST: { label: 'Fisioterapeuta', color: 'bg-cyan-100 text-cyan-700', icon: Heart },
  PSYCHOLOGIST: { label: 'Psicólogo(a)', color: 'bg-pink-100 text-pink-700', icon: Heart },
  PHARMACIST: { label: 'Farmacêutico(a)', color: 'bg-lime-100 text-lime-700', icon: Heart },
  DENTIST: { label: 'Dentista', color: 'bg-sky-100 text-sky-700', icon: Stethoscope },
  NUTRITIONIST: { label: 'Nutricionista', color: 'bg-orange-100 text-orange-700', icon: Heart },
  SOCIAL_WORKER: { label: 'Assistente Social', color: 'bg-indigo-100 text-indigo-700', icon: Users },
  OTHER: { label: 'Outro', color: 'bg-gray-100 text-gray-700', icon: Users },
}

export default function PromoteUserPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers()
    }
  }, [status])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/promote-user')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setAvailableRoles(data.availableRoles)
      } else if (response.status === 403) {
        toast({ title: 'Acesso negado', variant: 'destructive' })
        router.push('/')
      }
    } catch (error) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPromote = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setLicenseNumber(user.licenseNumber || '')
    setLicenseType(user.licenseType || '')
    setSpeciality(user.speciality || '')
    setLicenseState('')
  }

  const handlePromote = async () => {
    if (!selectedUser || !newRole) return

    try {
      setPromoting(true)
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          newRole,
          licenseNumber: licenseNumber || undefined,
          licenseType: licenseType || undefined,
          licenseState: licenseState || undefined,
          speciality: speciality || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: data.message })
        setSelectedUser(null)
        fetchUsers()
      } else {
        const error = await response.json()
        toast({ title: error.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao promover usuário', variant: 'destructive' })
    } finally {
      setPromoting(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Gerenciar Papéis de Usuários
          </h1>
          <p className="text-muted-foreground">
            Promova usuários para diferentes papéis no sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Clique em um usuário para alterar seu papel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel Atual</TableHead>
                <TableHead>Perfil Paciente</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const roleInfo = roleLabels[user.role] || roleLabels.PATIENT
                const RoleIcon = roleInfo.icon
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleInfo.color}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.hasPatientProfile ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPromote(user)}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        Alterar Papel
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Papel do Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedUser?.hasPatientProfile && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
                <p className="font-medium text-green-700 dark:text-green-300">
                  ✓ Este usuário possui perfil de paciente
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                  O perfil será mantido independente do papel escolhido.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Novo Papel</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]?.label || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newRole === 'DOCTOR' || newRole === 'NURSE') && (
              <>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Input
                    placeholder="Ex: Clínico Geral, Cardiologia..."
                    value={speciality}
                    onChange={(e) => setSpeciality(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Registro</Label>
                    <Input
                      placeholder="123456"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={licenseType} onValueChange={setLicenseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRM">CRM</SelectItem>
                        <SelectItem value="COREN">COREN</SelectItem>
                        <SelectItem value="CRP">CRP</SelectItem>
                        <SelectItem value="CRO">CRO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input
                      placeholder="SP"
                      maxLength={2}
                      value={licenseState}
                      onChange={(e) => setLicenseState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handlePromote} disabled={promoting || newRole === selectedUser?.role}>
              {promoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Salvar Alteração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
