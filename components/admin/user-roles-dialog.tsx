'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  Stethoscope, 
  Heart, 
  User, 
  UserCog,
  Loader2,
  Star,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UserRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  onSuccess?: () => void
}

interface AssignedRole {
  role: string
  isPrimary: boolean
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; description: string }> = {
  ADMIN: { 
    label: 'Administrador', 
    icon: Shield, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100',
    description: 'Acesso total ao sistema'
  },
  DOCTOR: { 
    label: 'Médico', 
    icon: Stethoscope, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    description: 'Atendimento clínico e prescrições'
  },
  NURSE: { 
    label: 'Enfermeiro(a)', 
    icon: Heart, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    description: 'Triagem e procedimentos'
  },
  RECEPTIONIST: { 
    label: 'Recepcionista', 
    icon: UserCog, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    description: 'Agendamento e recepção'
  },
  PHYSIOTHERAPIST: { 
    label: 'Fisioterapeuta', 
    icon: Heart, 
    color: 'text-teal-600', 
    bgColor: 'bg-teal-100',
    description: 'Reabilitação física'
  },
  PSYCHOLOGIST: { 
    label: 'Psicólogo(a)', 
    icon: Heart, 
    color: 'text-pink-600', 
    bgColor: 'bg-pink-100',
    description: 'Saúde mental'
  },
  HEALTH_AGENT: { 
    label: 'Agente de Saúde', 
    icon: Heart, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-100',
    description: 'Visitas domiciliares'
  },
  TECHNICIAN: { 
    label: 'Técnico(a)', 
    icon: UserCog, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-100',
    description: 'Apoio técnico'
  },
  PHARMACIST: { 
    label: 'Farmacêutico(a)', 
    icon: Heart, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-100',
    description: 'Dispensação de medicamentos'
  },
  DENTIST: { 
    label: 'Dentista', 
    icon: Stethoscope, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-100',
    description: 'Saúde bucal'
  },
  NUTRITIONIST: { 
    label: 'Nutricionista', 
    icon: Heart, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-100',
    description: 'Orientação nutricional'
  },
  SOCIAL_WORKER: { 
    label: 'Assistente Social', 
    icon: Heart, 
    color: 'text-rose-600', 
    bgColor: 'bg-rose-100',
    description: 'Apoio social'
  },
  PATIENT: { 
    label: 'Paciente', 
    icon: User, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100',
    description: 'Acesso ao portal do paciente'
  },
}

const ALL_ROLES = Object.keys(ROLE_CONFIG)

export function UserRolesDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: UserRolesDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignedRoles, setAssignedRoles] = useState<AssignedRole[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [primaryRole, setPrimaryRole] = useState<string>('')

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`)
      if (!res.ok) throw new Error('Erro ao carregar')
      
      const data = await res.json()
      const roles = data.assignedRoles || []
      
      setAssignedRoles(roles)
      setSelectedRoles(new Set(roles.map((r: AssignedRole) => r.role)))
      
      const primary = roles.find((r: AssignedRole) => r.isPrimary)
      setPrimaryRole(primary?.role || data.role || '')
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Erro ao carregar papéis', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  // Carregar papéis atuais
  useEffect(() => {
    if (open && userId) {
      loadRoles()
    }
  }, [open, userId, loadRoles])

  const handleRoleToggle = (role: string) => {
    const newSelected = new Set(selectedRoles)
    
    if (newSelected.has(role)) {
      // Não permitir remover se for o único
      if (newSelected.size <= 1) {
        toast({ title: 'Atenção', description: 'Usuário deve ter pelo menos um papel', variant: 'destructive' })
        return
      }
      newSelected.delete(role)
      
      // Se removeu o papel primário, definir outro como primário
      if (role === primaryRole) {
        const remaining = Array.from(newSelected)
        if (remaining.length > 0) {
          setPrimaryRole(remaining[0])
        }
      }
    } else {
      newSelected.add(role)
      
      // Se é o primeiro papel, definir como primário
      if (newSelected.size === 1) {
        setPrimaryRole(role)
      }
    }
    
    setSelectedRoles(newSelected)
  }

  const handlePrimaryChange = (role: string) => {
    if (selectedRoles.has(role)) {
      setPrimaryRole(role)
    }
  }

  const handleSave = async () => {
    if (selectedRoles.size === 0) {
      toast({ title: 'Atenção', description: 'Selecione pelo menos um papel', variant: 'destructive' })
      return
    }

    if (!primaryRole || !selectedRoles.has(primaryRole)) {
      toast({ title: 'Atenção', description: 'Defina um papel primário válido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // Primeiro, remover papéis que foram desmarcados
      const currentRoles = new Set(assignedRoles.map(r => r.role))
      const rolesToRemove = Array.from(currentRoles).filter(r => !selectedRoles.has(r))
      
      for (const role of rolesToRemove) {
        await fetch(`/api/admin/users/${userId}/roles?role=${role}`, {
          method: 'DELETE'
        })
      }

      // Adicionar novos papéis
      for (const role of Array.from(selectedRoles)) {
        await fetch(`/api/admin/users/${userId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            isPrimary: role === primaryRole
          })
        })
      }

      toast({ title: 'Sucesso', description: 'Papéis atualizados com sucesso!' })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Erro ao salvar papéis', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Papéis
          </DialogTitle>
          <DialogDescription>
            Atribua papéis para <strong>{userName}</strong>. O papel primário define a área inicial após o login.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Papéis Atuais */}
            {selectedRoles.size > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Papéis Atribuídos</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedRoles).map(role => {
                    const config = ROLE_CONFIG[role]
                    const Icon = config?.icon || User
                    const isPrimary = role === primaryRole
                    
                    return (
                      <Badge
                        key={role}
                        variant={isPrimary ? "default" : "secondary"}
                        className={`gap-1 pr-1 ${isPrimary ? '' : ''}`}
                      >
                        <Icon className="h-3 w-3" />
                        {config?.label || role}
                        {isPrimary && <Star className="h-3 w-3 ml-1 fill-current" />}
                        <button
                          onClick={() => handleRoleToggle(role)}
                          className="ml-1 p-0.5 hover:bg-white/20 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de Papéis Disponíveis */}
            <div className="grid gap-2">
              <h4 className="text-sm font-medium">Selecionar Papéis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ALL_ROLES.map(role => {
                  const config = ROLE_CONFIG[role]
                  const Icon = config.icon
                  const isSelected = selectedRoles.has(role)
                  const isPrimary = role === primaryRole
                  
                  return (
                    <div
                      key={role}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                        transition-colors
                        ${isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground/50'
                        }
                      `}
                      onClick={() => handleRoleToggle(role)}
                    >
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{config.label}</span>
                          {isPrimary && (
                            <Badge variant="default" className="text-[10px] h-4">
                              <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                              Primário
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {config.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isSelected && !isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePrimaryChange(role)
                            }}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Definir primário
                          </Button>
                        )}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleRoleToggle(role)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Papéis'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
