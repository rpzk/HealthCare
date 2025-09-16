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
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 fixed w-full top-16 z-40">
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
                  ? 'bg-blue-100 text-blue-600 border-blue-200' 
                  : 'hover:bg-blue-50 hover:text-blue-600'
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
