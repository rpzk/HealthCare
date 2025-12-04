'use client'

import { Settings, User, LogOut, Shield, Stethoscope, Heart, UserCog } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AIAssistantButton } from '@/components/ai/assistant-button'
import { NotificationCenter } from '@/components/ui/notification-center'
import { QuickNav } from '@/components/navigation/quick-nav'
import { GlobalSearch } from '@/components/search/global-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mapear roles para português e cores
const roleLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ADMIN: { label: 'Administrador', color: 'bg-red-500 text-white', icon: <Shield className="h-3 w-3" /> },
  DOCTOR: { label: 'Médico', color: 'bg-blue-500 text-white', icon: <Stethoscope className="h-3 w-3" /> },
  NURSE: { label: 'Enfermeiro(a)', color: 'bg-green-500 text-white', icon: <Heart className="h-3 w-3" /> },
  RECEPTIONIST: { label: 'Recepcionista', color: 'bg-purple-500 text-white', icon: <UserCog className="h-3 w-3" /> },
  PATIENT: { label: 'Paciente', color: 'bg-amber-500 text-white', icon: <User className="h-3 w-3" /> },
  PHYSIOTHERAPIST: { label: 'Fisioterapeuta', color: 'bg-teal-500 text-white', icon: <Heart className="h-3 w-3" /> },
  PSYCHOLOGIST: { label: 'Psicólogo(a)', color: 'bg-pink-500 text-white', icon: <Heart className="h-3 w-3" /> },
  HEALTH_AGENT: { label: 'Agente de Saúde', color: 'bg-cyan-500 text-white', icon: <Heart className="h-3 w-3" /> },
  TECHNICIAN: { label: 'Técnico(a)', color: 'bg-slate-500 text-white', icon: <UserCog className="h-3 w-3" /> },
  PHARMACIST: { label: 'Farmacêutico(a)', color: 'bg-emerald-500 text-white', icon: <Heart className="h-3 w-3" /> },
  DENTIST: { label: 'Dentista', color: 'bg-indigo-500 text-white', icon: <Stethoscope className="h-3 w-3" /> },
  NUTRITIONIST: { label: 'Nutricionista', color: 'bg-orange-500 text-white', icon: <Heart className="h-3 w-3" /> },
  SOCIAL_WORKER: { label: 'Assistente Social', color: 'bg-rose-500 text-white', icon: <Heart className="h-3 w-3" /> },
  OTHER: { label: 'Outro', color: 'bg-gray-500 text-white', icon: <User className="h-3 w-3" /> },
}

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()

  const handleSettings = () => {
    router.push('/settings')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handlePatientArea = () => {
    router.push('/minha-saude')
  }

  const userRole = session?.user?.role || 'OTHER'
  const userName = session?.user?.name || 'Usuário'
  const roleInfo = roleLabels[userRole] || roleLabels.OTHER

  return (
    <>
      <header className="bg-background border-b border-border fixed w-full top-0 z-50 transition-colors duration-300">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => router.push('/')}
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">H</span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  HealthCare
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 max-w-md flex-1 mx-8">
              <GlobalSearch />
            </div>

            <div className="flex items-center space-x-3">
              <AIAssistantButton />
              
              <NotificationCenter />

              <ThemeToggle />
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSettings}
                title="Configurações"
              >
                <Settings className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-3" title="Perfil do usuário">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium">{userName.split(' ')[0]}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 ${roleInfo.color}`}>
                        {roleInfo.icon}
                        {roleInfo.label}
                      </Badge>
                    </div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      <Badge className={`text-[10px] w-fit mt-1 ${roleInfo.color}`}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userRole === 'PATIENT' && (
                    <>
                      <DropdownMenuItem onClick={handlePatientArea}>
                        <Heart className="mr-2 h-4 w-4 text-pink-500" />
                        <span>Minha Saúde</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleProfile}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <QuickNav />
    </>
  )
}