'use client'

import { useEffect, useState, useMemo } from 'react'
import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  FileText, 
  Users, 
  User,
  Stethoscope, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Home,
  TestTube,
  Pill,
  Activity,
  BarChart3,
  Settings,
  Building,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSidebar } from '@/hooks/use-sidebar'
import { useActiveRole } from '@/hooks/use-active-role'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'

interface SubMenuItem {
  title: string
  href: string
  roles?: string[]  // se definido, só mostra para esses papéis
}

interface MenuItem {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  href: string
  roles?: string[]  // se definido, só mostra para esses papéis
  submenu?: SubMenuItem[]
}

// Menu simplificado - sem itens ADMIN (esses ficam no painel admin)
// roles: omitir = visível para todos; definir = apenas para esses papéis
const allMenuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/',
  },
  {
    title: 'Pacientes',
    icon: Users,
    href: '/patients',
    submenu: [
      { title: 'Lista', href: '/patients' },
      { title: 'Novo', href: '/patients/invite' },
      { title: 'Busca', href: '/patients/search' },
    ]
  },
  {
    title: 'Consultas',
    icon: Stethoscope,
    href: '/consultations',
    submenu: [
      { title: 'Todas', href: '/consultations' },
      { title: 'Agendar', href: '/consultations/new' },
      { title: 'Hoje', href: '/consultations/today' },
    ]
  },
  {
    title: 'Exames',
    icon: TestTube,
    href: '/exams',
    submenu: [
      { title: 'Solicitar', href: '/exams/new' },
      { title: 'Resultados', href: '/exams/results' },
    ]
  },
  {
    title: 'Prescrições',
    icon: Pill,
    href: '/prescriptions',
  },
  {
    title: 'Atestados',
    icon: FileText,
    href: '/certificates',
    submenu: [
      { title: 'Meus Atestados', href: '/certificates' },
      { title: 'Novo', href: '/certificates?tab=create' },
    ]
  },
  {
    title: 'Sinais Vitais',
    icon: Activity,
    href: '/vitals',
  },
  {
    title: 'Questionários',
    icon: ClipboardList,
    href: '/questionnaires',
    submenu: [
      { title: 'Listar', href: '/questionnaires' },
      { title: 'Analytics', href: '/admin/questionnaire-analytics', roles: ['DOCTOR', 'ADMIN', 'NURSE', 'THERAPIST'] },
    ]
  },
  // PSF (Saúde da Família) desativado - páginas removidas; reative quando /app/psf existir
  // { title: 'Saúde da Família', icon: Building, href: '/psf', submenu: [...] },
  {
    title: 'Relatórios',
    icon: BarChart3,
    href: '/reports',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    title: 'Configurações',
    icon: Settings,
    href: '/settings',
    submenu: [
      { title: 'Perfil', href: '/settings?tab=profile' },
      { title: 'Segurança e Passkey', href: '/settings?tab=security' },
    ]
  },
]

function canAccess(item: { roles?: string[] }, userRole: string | null, availableRoles: string[]): boolean {
  if (!item.roles || item.roles.length === 0) return true
  const roles = userRole ? [userRole, ...availableRoles] : availableRoles
  return item.roles.some((r) => roles.includes(r))
}

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const { activeRole } = useActiveRole()

  const userRole = activeRole || (session?.user as { role?: string })?.role || null
  const availableRoles = ((session?.user as { availableRoles?: string[] })?.availableRoles || []) as string[]

  const menuItems = useMemo(() => {
    return allMenuItems
      .filter((item) => canAccess(item, userRole, availableRoles))
      .map((item) => {
        if (!item.submenu) return item
        const filteredSub = item.submenu.filter((s) => canAccess(s, userRole, availableRoles))
        if (filteredSub.length === 0) return null
        return { ...item, submenu: filteredSub }
      })
      .filter((item): item is MenuItem => item !== null)
  }, [userRole, availableRoles])

  // Auto-expand groups that contain the active route
  useEffect(() => {
    if (isCollapsed) return
    const toExpand: string[] = []
    for (const item of menuItems) {
      if (!pathname) continue
      if (item.submenu && item.submenu.some((s) => pathname.startsWith(s.href.split('?')[0]))) {
        toExpand.push(item.title)
      }
    }
    setExpandedItems((prev) => {
      const merged = Array.from(new Set([...prev, ...toExpand]))
      return merged
    })
  }, [pathname, isCollapsed])

  const toggleExpanded = (title: string) => {
    if (isCollapsed) return
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (!pathname) return false
    const cleanHref = href.split('?')[0]
    return pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(cleanHref))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] border-r transition-all duration-300 z-40',
          'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          isCollapsed ? 'w-16 sidebar-collapsed' : 'w-56'
        )}
      >
        {/* Botão de colapsar */}
        <div className="absolute -right-3 top-4 z-50">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border shadow-md bg-background"
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        <nav className={cn('p-2 space-y-1 overflow-y-auto h-full', isCollapsed && 'px-2')}>
          {menuItems.map((item) => (
            <div key={item.title}>
              {isCollapsed ? (
                // Modo colapsado - apenas ícones com tooltip
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center justify-center p-2.5 rounded-lg transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                // Modo expandido
                <>
                  {item.submenu ? (
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedItems.includes(item.title) && "rotate-180"
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  )}
                  
                  {/* Submenu */}
                  {item.submenu && expandedItems.includes(item.title) && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                      {item.submenu.map((subItem) => (
                        item.title === 'Pacientes' && subItem.title === 'Novo' ? (
                          <button
                            key={subItem.title}
                            type="button"
                            onClick={() => setShowNewPatientDialog(true)}
                            className={cn(
                              'block w-full text-left px-2 py-1.5 text-sm rounded transition-colors',
                              'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {subItem.title}
                          </button>
                        ) : (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              'block px-2 py-1.5 text-sm rounded transition-colors',
                              isActive(subItem.href)
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {subItem.title}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        <NewPatientDialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog} />
      </div>
    </TooltipProvider>
  )
}
