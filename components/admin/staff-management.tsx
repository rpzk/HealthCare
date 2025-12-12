"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Users, 
  Search, 
  UserPlus, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Key,
  Mail,
  Loader2,
  Stethoscope,
  ShieldCheck,
  Clipboard,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin: string | null
  speciality: string | null
  phone: string | null
  crm: string | null
}

interface StaffStats {
  total: number
  byRole: Record<string, number>
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermeiro',
  RECEPTIONIST: 'Recepcionista',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DOCTOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  NURSE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECEPTIONIST: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  ADMIN: ShieldCheck,
  DOCTOR: Stethoscope,
  NURSE: UserCheck,
  RECEPTIONIST: Clipboard,
}

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [stats, setStats] = useState<StaffStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('DOCTOR')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [resetPasswordDialog, setResetPasswordDialog] = useState<StaffMember | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      
      const res = await fetch(`/api/admin/staff?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setStaff(data.data.staff)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar staff:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os profissionais', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleInvite = async () => {
    if (!inviteEmail) return
    
    setInviting(true)
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })
      
      const data = await res.json()
      
      if (data.link) {
        setInviteLink(data.link)
        toast({ title: 'Convite criado!', description: `Link enviado para ${inviteEmail}` })
      } else {
        toast({ title: 'Erro', description: data.error || 'Erro ao criar convite', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar convite', variant: 'destructive' })
    } finally {
      setInviting(false)
    }
  }

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status' })
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Sucesso', description: data.message })
        loadStaff()
      } else {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao alterar status', variant: 'destructive' })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordDialog) return
    
    setResetting(true)
    try {
      const res = await fetch(`/api/admin/staff/${resetPasswordDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password' })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setTempPassword(data.tempPassword)
        toast({ title: 'Senha resetada!', description: data.message })
      } else {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao resetar senha', variant: 'destructive' })
    } finally {
      setResetting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Pessoal</h1>
          <p className="text-muted-foreground">Gerencie os profissionais do sistema</p>
        </div>
        <Button onClick={() => { setInviteDialogOpen(true); setInviteLink(''); setInviteEmail('') }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Profissional
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {Object.entries(ROLE_LABELS).map(([role, label]) => {
            const Icon = ROLE_ICONS[role]
            const count = stats.byRole[role] || 0
            return (
              <Card key={role}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ROLE_COLORS[role]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{label}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as funções</SelectItem>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <SelectItem key={role} value={role}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadStaff}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum profissional encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => {
                  const Icon = ROLE_ICONS[member.role] || Users
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${ROLE_COLORS[member.role]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            {member.crm && <p className="text-xs text-muted-foreground">CRM: {member.crm}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[member.role]}>
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.speciality || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? 'default' : 'secondary'}>
                          {member.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(member.lastLogin)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleStatus(member)}>
                              {member.isActive ? (
                                <><UserX className="h-4 w-4 mr-2" /> Desativar</>
                              ) : (
                                <><UserCheck className="h-4 w-4 mr-2" /> Ativar</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setResetPasswordDialog(member); setTempPassword('') }}>
                              <Key className="h-4 w-4 mr-2" /> Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" /> Enviar Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Profissional</DialogTitle>
            <DialogDescription>
              Envie um convite para um novo profissional se cadastrar no sistema.
            </DialogDescription>
          </DialogHeader>
          
          {!inviteLink ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Função</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <SelectItem key={role} value={role}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                  ✅ Convite criado com sucesso!
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Compartilhe este link com o profissional:
                </p>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(inviteLink)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!inviteLink ? (
              <>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Enviar Convite
                </Button>
              </>
            ) : (
              <Button onClick={() => setInviteDialogOpen(false)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordDialog} onOpenChange={() => setResetPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Resetar a senha de {resetPasswordDialog?.name}
            </DialogDescription>
          </DialogHeader>
          
          {!tempPassword ? (
            <p className="text-sm text-muted-foreground">
              Uma nova senha temporária será gerada. O profissional deverá alterá-la no próximo login.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
                  ⚠️ Senha temporária gerada
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Compartilhe esta senha com o profissional:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-lg font-mono tracking-wider">
                    {tempPassword}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(tempPassword)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!tempPassword ? (
              <>
                <Button variant="outline" onClick={() => setResetPasswordDialog(null)}>Cancelar</Button>
                <Button onClick={handleResetPassword} disabled={resetting} variant="destructive">
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Resetar Senha
                </Button>
              </>
            ) : (
              <Button onClick={() => setResetPasswordDialog(null)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
