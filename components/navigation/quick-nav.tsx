'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, Users, Calendar, FileText, Pill, Microscope, Settings, Shield, User } from 'lucide-react'

const quickNavItems = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Pacientes', href: '/patients', icon: Users },
  { label: 'Consultas', href: '/consultations', icon: Calendar },
  { label: 'Prontuários', href: '/records', icon: FileText },
  { label: 'Prescrições', href: '/prescriptions', icon: Pill },
  { label: 'Exames', href: '/exams', icon: Microscope },
  { label: 'Perfil', href: '/profile', icon: User },
  { label: 'Configurações', href: '/settings', icon: Settings },
  { label: 'Segurança', href: '/security-monitoring', icon: Shield },
]

export function QuickNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="bg-background border-b border-border px-6 py-3 fixed w-full top-16 z-40 transition-colors duration-300">
      <div className="flex items-center gap-2 overflow-x-auto">
        {quickNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-2 whitespace-nowrap ${
                active 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
