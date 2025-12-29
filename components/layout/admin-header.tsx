'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  Settings, 
  User, 
  LogOut, 
  Bell,
  Search,
  Shield,
  ChevronDown,
  Moon,
  Sun,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { RoleSwitcher } from '@/components/layout/role-switcher'
import { NotificationCenter } from '@/components/ui/notification-center'
import { useActiveRole } from '@/hooks/use-active-role'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermeiro(a)',
  RECEPTIONIST: 'Recepcionista',
  PATIENT: 'Paciente',
  PHYSIOTHERAPIST: 'Fisioterapeuta',
  PSYCHOLOGIST: 'Psicólogo(a)',
  HEALTH_AGENT: 'Agente de Saúde',
  TECHNICIAN: 'Técnico(a)',
  PHARMACIST: 'Farmacêutico(a)',
  DENTIST: 'Dentista',
  NUTRITIONIST: 'Nutricionista',
  SOCIAL_WORKER: 'Assistente Social',
  OTHER: 'Usuário',
}

export function AdminHeader() {
  const router = useRouter()
  const { data: session } = useSession()
  const { activeRole } = useActiveRole()
  
  const userName = session?.user?.name || 'Administrador'
  const userEmail = session?.user?.email || ''
  const initials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const roleLabel = ROLE_LABELS[activeRole || 'ADMIN'] || 'Administrador'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo e título */}
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/admin')}
          >
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg">HealthCare</span>
              <Badge variant="secondary" className="ml-2 text-[10px]">Admin</Badge>
            </div>
          </div>
        </div>

        {/* Busca Global */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar usuários, configurações..." 
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* Role Switcher */}
          <RoleSwitcher />

          {/* Notificações */}
          <NotificationCenter />

          {/* Tema */}
          <ThemeToggle />

          {/* Ajuda */}
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Menu do usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-red-100 text-red-700 text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
