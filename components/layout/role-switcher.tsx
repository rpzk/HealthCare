'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Stethoscope, 
  User, 
  ChevronDown,
  Check,
  Heart,
  UserCog,
  Loader2,
  Lock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Helper para manipular cookies
function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

interface RoleConfig {
  id: string
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  homePath: string
  description: string
  requiresAuth: boolean // Se precisa confirmar senha para acessar
}

// Configuração completa de todos os papéis
const ROLE_CONFIGS: Record<string, RoleConfig> = {
  ADMIN: {
    id: 'ADMIN',
    label: 'Administrador',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    homePath: '/admin',
    description: 'Gestão do sistema',
    requiresAuth: true // Precisa de senha para acessar
  },
  DOCTOR: {
    id: 'DOCTOR',
    label: 'Médico',
    icon: Stethoscope,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    homePath: '/',
    description: 'Área clínica',
    requiresAuth: false
  },
  NURSE: {
    id: 'NURSE',
    label: 'Enfermeiro(a)',
    icon: Heart,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    homePath: '/',
    description: 'Cuidados de enfermagem',
    requiresAuth: false
  },
  RECEPTIONIST: {
    id: 'RECEPTIONIST',
    label: 'Recepcionista',
    icon: UserCog,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    homePath: '/reception',
    description: 'Recepção e agendamentos',
    requiresAuth: false
  },
  PHYSIOTHERAPIST: {
    id: 'PHYSIOTHERAPIST',
    label: 'Fisioterapeuta',
    icon: Heart,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    homePath: '/',
    description: 'Reabilitação',
    requiresAuth: false
  },
  PSYCHOLOGIST: {
    id: 'PSYCHOLOGIST',
    label: 'Psicólogo(a)',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    homePath: '/',
    description: 'Saúde mental',
    requiresAuth: false
  },
  HEALTH_AGENT: {
    id: 'HEALTH_AGENT',
    label: 'Agente de Saúde',
    icon: Heart,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    homePath: '/micro-areas',
    description: 'Visitas domiciliares',
    requiresAuth: false
  },
  TECHNICIAN: {
    id: 'TECHNICIAN',
    label: 'Técnico(a)',
    icon: UserCog,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    homePath: '/',
    description: 'Apoio técnico',
    requiresAuth: false
  },
  PHARMACIST: {
    id: 'PHARMACIST',
    label: 'Farmacêutico(a)',
    icon: Heart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    homePath: '/inventory',
    description: 'Farmácia',
    requiresAuth: false
  },
  DENTIST: {
    id: 'DENTIST',
    label: 'Dentista',
    icon: Stethoscope,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    homePath: '/',
    description: 'Odontologia',
    requiresAuth: false
  },
  NUTRITIONIST: {
    id: 'NUTRITIONIST',
    label: 'Nutricionista',
    icon: Heart,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    homePath: '/',
    description: 'Nutrição',
    requiresAuth: false
  },
  SOCIAL_WORKER: {
    id: 'SOCIAL_WORKER',
    label: 'Assistente Social',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    homePath: '/',
    description: 'Assistência social',
    requiresAuth: false
  },
  PATIENT: {
    id: 'PATIENT',
    label: 'Paciente',
    icon: User,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    homePath: '/minha-saude',
    description: 'Minha saúde',
    requiresAuth: false
  },
  OTHER: {
    id: 'OTHER',
    label: 'Outro',
    icon: User,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    homePath: '/',
    description: 'Acesso geral',
    requiresAuth: false
  }
}

interface AssignedRole {
  role: string
  isPrimary: boolean
}

export function RoleSwitcher() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [availableRoles, setAvailableRoles] = useState<AssignedRole[]>([])
  const [activeRole, setActiveRole] = useState<string>('')
  
  // Estado para confirmação de senha
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  
  // Carregar papéis e papel ativo ao montar
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchUserRoles()
    }
  }, [status, session])

  const fetchUserRoles = async () => {
    try {
      setLoading(true)
      
      // Primeiro tentar pegar da sessão (que agora tem availableRoles)
      const sessionRoles = (session?.user as any)?.availableRoles
      if (sessionRoles && Array.isArray(sessionRoles) && sessionRoles.length > 0) {
        const roles = sessionRoles.map((role: string) => ({
          role,
          isPrimary: role === session?.user?.role
        }))
        setAvailableRoles(roles)
        
        // Se não tem papel ativo salvo, usar o da URL ou o da sessão
        if (!activeRole) {
          const savedRole = getCookie('active_role')
          if (savedRole && sessionRoles.includes(savedRole)) {
            setActiveRole(savedRole)
          } else if (pathname?.startsWith('/admin') && sessionRoles.includes('ADMIN')) {
            setActiveRole('ADMIN')
          } else {
            setActiveRole(session?.user?.role || 'DOCTOR')
          }
        }
        setLoading(false)
        return
      }
      
      // Fallback: buscar da API se não tiver na sessão
      const res = await fetch('/api/user/roles')
      
      if (!res.ok) {
        const userRole = (session?.user as { role?: string })?.role || 'DOCTOR'
        setAvailableRoles([{ role: userRole, isPrimary: true }])
        if (!activeRole) setActiveRole(userRole)
        return
      }
      
      const data = await res.json()
      setAvailableRoles(data.roles || [])
      
      // Se não tem papel ativo salvo, usar o da URL ou o primário
      if (!activeRole) {
        const savedRole = getCookie('active_role')
        const allowedRolesFromApi = Array.isArray(data.roles)
          ? data.roles.map((r: { role?: string }) => r.role).filter(Boolean)
          : []

        if (savedRole && allowedRolesFromApi.includes(savedRole)) {
          setActiveRole(savedRole)
        } else if (pathname?.startsWith('/admin')) {
          setActiveRole('ADMIN')
        } else {
          setActiveRole(data.primaryRole || 'DOCTOR')
        }
      }
    } catch (error) {
      console.error('Erro ao buscar papéis:', error)
      const userRole = (session?.user as { role?: string })?.role || 'DOCTOR'
      setAvailableRoles([{ role: userRole, isPrimary: true }])
      if (!activeRole) setActiveRole(userRole)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRoleClick = (role: string) => {
    const config = ROLE_CONFIGS[role]
    if (!config) return
    
    // Se requer autenticação (ADMIN), mostrar dialog de senha
    if (config.requiresAuth && role !== activeRole) {
      setPendingRole(role)
      setShowPasswordDialog(true)
      return
    }
    
    // Trocar papel diretamente
    performRoleSwitch(role)
  }
  
  const performRoleSwitch = async (role: string) => {
    const config = ROLE_CONFIGS[role]
    if (!config) return
    
    try {
      // Validar com a API antes de trocar
      const res = await fetch('/api/user/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      
      if (!res.ok) {
        const data = await res.json()
        toast({
          title: 'Erro ao trocar papel',
          description: data.error || 'Você não tem permissão para usar esse papel.',
          variant: 'destructive'
        })
        return
      }
      
      // Trocar papel e redirecionar
      setActiveRole(role)
      setCookie('active_role', role, 7)
      
      toast({
        title: 'Papel alterado!',
        description: `Você está agora como ${config.label}`,
      })
      
      // Dar um pequeno delay para o toast aparecer antes do redirect
      setTimeout(() => {
        window.location.href = config.homePath
      }, 500)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao trocar de papel. Tente novamente.',
        variant: 'destructive'
      })
    }
  }
  
  const verifyPasswordAndSwitch = async () => {
    if (!pendingRole || !password) return
    
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!res.ok) {
        toast({
          title: 'Senha incorreta',
          description: 'A senha informada está incorreta.',
          variant: 'destructive'
        })
        setPassword('')
        return
      }
      
      // Senha correta, trocar papel
      setShowPasswordDialog(false)
      setPassword('')
      performRoleSwitch(pendingRole)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao verificar senha.',
        variant: 'destructive'
      })
    } finally {
      setVerifying(false)
    }
  }
  
  // Se ainda carregando sessão, mostrar loading
  if (status === 'loading' || loading) {
    return (
      <Button variant="outline" size="sm" className="gap-2 h-9" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline text-sm">Carregando...</span>
      </Button>
    )
  }
  
  // Se só tem 1 papel disponível, ainda mostrar para indicar o papel atual
  // mas sem o ícone de dropdown
  if (availableRoles.length <= 1) {
    const currentConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS['DOCTOR']
    const CurrentIcon = currentConfig.icon
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-card-foreground">
        <div className={`p-1 rounded ${currentConfig.bgColor}`}>
          <CurrentIcon className={`h-3.5 w-3.5 ${currentConfig.color}`} />
        </div>
        <span className="text-sm font-medium">{currentConfig.label}</span>
      </div>
    )
  }
  
  const currentConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS['DOCTOR']
  const CurrentIcon = currentConfig.icon
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="default"
            className="gap-2 h-10 px-3 hover:bg-accent hover:text-accent-foreground transition-all"
          >
            <div className={`p-1.5 rounded ${currentConfig.bgColor} transition-all`}>
              <CurrentIcon className={`h-4 w-4 ${currentConfig.color}`} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Você é</span>
              <span className="text-sm font-semibold leading-none">
                {currentConfig.label}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2 py-3">
            <UserCog className="h-4 w-4" />
            Trocar Papel do Usuário
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRoles.map(({ role, isPrimary }) => {
            const config = ROLE_CONFIGS[role]
            if (!config) return null
            
            const Icon = config.icon
            const isActive = activeRole === role
            
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleClick(role)}
                className={`cursor-pointer py-4 transition-all ${
                  isActive ? 'bg-accent' : ''
                }`}
                disabled={isActive}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${config.bgColor} transition-all`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{config.label}</p>
                      {isPrimary && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          Principal
                        </Badge>
                      )}
                      {config.requiresAuth && !isActive && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          Protegido
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1">
                      <Check className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium text-primary">Ativo</span>
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmação de senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Acesso Administrativo
            </DialogTitle>
            <DialogDescription>
              Para acessar o painel administrativo, confirme sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) {
                    verifyPasswordAndSwitch()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordDialog(false)
                setPassword('')
                setPendingRole(null)
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={verifyPasswordAndSwitch} 
              disabled={!password || verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
