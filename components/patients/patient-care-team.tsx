'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  ShieldAlert,
  Clock,
  Crown,
  AlertTriangle,
  Search,
  Loader2,
  Star
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CareTeamMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  userSpecialty?: string
  accessLevel: string
  accessLevelLabel: string
  isPrimary: boolean
  reason?: string
  validFrom: string
  validUntil?: string
  isExpiring?: boolean
  addedBy?: string
  addedAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  specialty?: string
}

interface PatientCareTeamProps {
  patientId: string
  patientName: string
  readOnly?: boolean
}

const accessLevelColors: Record<string, string> = {
  FULL: 'bg-green-100 text-green-800',
  CONSULTATION: 'bg-blue-100 text-blue-800',
  LIMITED: 'bg-yellow-100 text-yellow-800',
  EMERGENCY: 'bg-red-100 text-red-800',
  VIEW_ONLY: 'bg-gray-100 text-gray-800'
}

const accessLevelIcons: Record<string, typeof Shield> = {
  FULL: Crown,
  CONSULTATION: Shield,
  LIMITED: Shield,
  EMERGENCY: ShieldAlert,
  VIEW_ONLY: Shield
}

export function PatientCareTeam({ patientId, patientName, readOnly = false }: PatientCareTeamProps) {
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([])
  const [responsibleDoctor, setResponsibleDoctor] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<CareTeamMember | null>(null)
  
  // Form state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [accessLevel, setAccessLevel] = useState('CONSULTATION')
  const [reason, setReason] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [emergencyDuration, setEmergencyDuration] = useState('60')
  const [submitting, setSubmitting] = useState(false)
  
  const { toast } = useToast()

  // Carregar equipe de atendimento
  const loadCareTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/patients/${patientId}/care-team`)
      if (!response.ok) throw new Error('Erro ao carregar equipe')
      
      const data = await response.json()
      setCareTeam(data.careTeam || [])
      setResponsibleDoctor(data.responsibleDoctor || null)
    } catch (error: unknown) {
      if (error instanceof Error) console.error('Error loading care team:', error)
      else console.error('Error loading care team:', String(error))
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a equipe de atendimento',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCareTeam()
  }, [patientId])

  // Buscar usuários
  const searchUsers = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([])
      return
    }
    
    try {
      setSearchLoading(true)
      const response = await fetch(`/api/users?search=${encodeURIComponent(term)}&limit=10`)
      if (!response.ok) throw new Error('Erro na busca')
      
      const data = await response.json()
      // Filtrar usuários que já estão na equipe
      const existingIds = careTeam.map(m => m.userId)
      setSearchResults(
        (data.users || data).filter((u: User) => !existingIds.includes(u.id))
      )
    } catch (error: unknown) {
      if (error instanceof Error) console.error('Error searching users:', error)
      else console.error('Error searching users:', String(error))
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Adicionar membro à equipe
  const handleAddMember = async () => {
    if (!selectedUser) return
    
    try {
      setSubmitting(true)
      const response = await fetch(`/api/patients/${patientId}/care-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          accessLevel,
          reason,
          validUntil: validUntil || undefined,
          isPrimary
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao adicionar')
      }

      toast({
        title: 'Sucesso',
        description: `${selectedUser.name} foi adicionado à equipe de atendimento`
      })

      // Resetar form e recarregar
      setAddDialogOpen(false)
      setSelectedUser(null)
      setSearchTerm('')
      setAccessLevel('CONSULTATION')
      setReason('')
      setValidUntil('')
      setIsPrimary(false)
      loadCareTeam()
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Erro', description: String(error), variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Remover membro da equipe
  const handleRemoveMember = async () => {
    if (!selectedMember) return

    try {
      setSubmitting(true)
      const response = await fetch(
        `/api/patients/${patientId}/care-team?userId=${selectedMember.userId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao remover')
      }

      toast({
        title: 'Sucesso',
        description: `${selectedMember.userName} foi removido da equipe`
      })

      setRemoveDialogOpen(false)
      setSelectedMember(null)
      loadCareTeam()
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Erro', description: String(error), variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Conceder acesso de emergência
  const handleEmergencyAccess = async () => {
    if (!selectedUser) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/patients/${patientId}/care-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          isEmergency: true,
          emergencyDuration: parseInt(emergencyDuration)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao conceder acesso')
      }

      toast({
        title: 'Acesso de Emergência Concedido',
        description: `${selectedUser.name} tem acesso temporário por ${emergencyDuration} minutos`
      })

      setEmergencyDialogOpen(false)
      setSelectedUser(null)
      setSearchTerm('')
      loadCareTeam()
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Erro', description: String(error), variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Administrador',
      DOCTOR: 'Médico(a)',
      NURSE: 'Enfermeiro(a)',
      RECEPTIONIST: 'Recepcionista',
      TECHNICIAN: 'Técnico(a)',
      PHARMACIST: 'Farmacêutico(a)',
      NUTRITIONIST: 'Nutricionista',
      PSYCHOLOGIST: 'Psicólogo(a)',
      PHYSIOTHERAPIST: 'Fisioterapeuta',
      MANAGER: 'Gerente'
    }
    return roles[role] || role
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe de Atendimento
            </CardTitle>
            <CardDescription>
              Profissionais autorizados a acessar dados de {patientName}
            </CardDescription>
          </div>
          
          {!readOnly && (
            <div className="flex gap-2">
              <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Emergência
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                      Acesso de Emergência
                    </DialogTitle>
                    <DialogDescription>
                      Conceda acesso temporário para atendimento de emergência.
                      Este acesso será automaticamente revogado após o período definido.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar Profissional</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome ou email..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      {searchResults.length > 0 && !selectedUser && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              className="w-full p-2 text-left hover:bg-muted flex items-center gap-2"
                              onClick={() => {
                                setSelectedUser(user)
                                setSearchTerm(user.name)
                              }}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getRoleName(user.role)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {selectedUser && (
                        <div className="border rounded-md p-2 bg-muted/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{selectedUser.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getRoleName(selectedUser.role)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(null)
                              setSearchTerm('')
                            }}
                          >
                            Alterar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Duração do Acesso</Label>
                      <Select value={emergencyDuration} onValueChange={setEmergencyDuration}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                          <SelectItem value="240">4 horas</SelectItem>
                          <SelectItem value="480">8 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEmergencyDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleEmergencyAccess}
                      disabled={!selectedUser || submitting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Conceder Acesso
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar à Equipe</DialogTitle>
                    <DialogDescription>
                      Adicione um profissional de saúde à equipe de atendimento deste paciente.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar Profissional *</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome ou email..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      {searchLoading && (
                        <p className="text-sm text-muted-foreground">Buscando...</p>
                      )}
                      
                      {searchResults.length > 0 && !selectedUser && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              className="w-full p-2 text-left hover:bg-muted flex items-center gap-2"
                              onClick={() => {
                                setSelectedUser(user)
                                setSearchTerm(user.name)
                              }}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getRoleName(user.role)} {user.specialty && `• ${user.specialty}`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {selectedUser && (
                        <div className="border rounded-md p-2 bg-muted/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{selectedUser.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getRoleName(selectedUser.role)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(null)
                              setSearchTerm('')
                            }}
                          >
                            Alterar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nível de Acesso</Label>
                      <Select value={accessLevel} onValueChange={setAccessLevel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-green-600" />
                              Acesso Total
                            </div>
                          </SelectItem>
                          <SelectItem value="CONSULTATION">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              Consulta (padrão)
                            </div>
                          </SelectItem>
                          <SelectItem value="LIMITED">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-yellow-600" />
                              Limitado
                            </div>
                          </SelectItem>
                          <SelectItem value="VIEW_ONLY">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-gray-600" />
                              Apenas Visualização
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {accessLevel === 'FULL' && 'Pode ver, editar, prescrever e gerenciar equipe'}
                        {accessLevel === 'CONSULTATION' && 'Pode realizar consultas e ver histórico'}
                        {accessLevel === 'LIMITED' && 'Acesso apenas aos dados essenciais'}
                        {accessLevel === 'VIEW_ONLY' && 'Apenas visualização, sem alterações'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motivo (opcional)</Label>
                      <Textarea
                        placeholder="Ex: Acompanhamento pós-operatório..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Válido até (opcional)</Label>
                      <Input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para acesso permanente
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddMember} disabled={!selectedUser || submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Médico Responsável */}
        {responsibleDoctor && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-green-500">
                <AvatarFallback className="bg-green-100 text-green-700">
                  {getInitials(responsibleDoctor.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{responsibleDoctor.name}</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Médico Responsável
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getRoleName(responsibleDoctor.role)}
                  {responsibleDoctor.specialty && ` • ${responsibleDoctor.specialty}`}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Lista da Equipe */}
        {careTeam.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum membro adicional na equipe de atendimento</p>
            {!readOnly && (
              <p className="text-sm mt-1">
                Clique em &quot;Adicionar&quot; para incluir profissionais
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {careTeam.map((member) => {
                const AccessIcon = accessLevelIcons[member.accessLevel] || Shield
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(member.userName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.userName}</span>
                            {member.isPrimary && (
                              <Badge variant="outline" className="text-xs">Principal</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getRoleName(member.userRole)}
                            {member.userSpecialty && ` • ${member.userSpecialty}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={accessLevelColors[member.accessLevel]}>
                        <AccessIcon className="h-3 w-3 mr-1" />
                        {member.accessLevelLabel}
                      </Badge>
                      {member.reason && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                          {member.reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.validUntil ? (
                        <div className="flex items-center gap-1">
                          {member.isExpiring && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className={member.isExpiring ? 'text-yellow-600' : ''}>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(member.validUntil), {
                              locale: ptBR,
                              addSuffix: true
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Permanente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member)
                            setRemoveDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        
        {/* Dialog de confirmação de remoção */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover da Equipe?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedMember && (
                  <>
                    Tem certeza que deseja remover <strong>{selectedMember.userName}</strong> da 
                    equipe de atendimento? Este profissional não terá mais acesso aos dados do paciente.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
