'use client'

import { Settings, User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AIAssistantButton } from '@/components/ai/assistant-button'
import { NotificationCenter } from '@/components/ui/notification-center'
import { QuickNav } from '@/components/navigation/quick-nav'
import { GlobalSearch } from '@/components/search/global-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const router = useRouter()

  const handleSettings = () => {
    router.push('/settings')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

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
                  <Button variant="ghost" size="icon" title="Perfil do usuário">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
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