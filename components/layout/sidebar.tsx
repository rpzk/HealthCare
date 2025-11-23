'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { 
  Calendar, 
  FileText, 
  Users, 
  Stethoscope, 
  ChevronDown, 
  Home,
  TestTube,
  Pill,
  Activity,
  BarChart3,
  Settings,
  Brain,
  DollarSign,
  Building
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  title: string;
  icon: any;
  href: string;
  submenu?: Array<{ title: string; href: string }>;
  badge?: string;
  allowedRoles?: Array<'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST'>;
}

const menuItems: MenuItem[] = [
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
      { title: 'Lista de Pacientes', href: '/patients' },
      { title: 'Novo Paciente', href: '/patients/new' },
      { title: 'Busca Avançada', href: '/patients/search' },
    ]
  },
  {
    title: 'Consultas',
    icon: Stethoscope,
    href: '/consultations',
    submenu: [
      { title: 'Todas as Consultas', href: '/consultations' },
      { title: 'Agendar Consulta', href: '/consultations/new' },
      { title: 'Consultas de Hoje', href: '/consultations/today' },
      { title: 'Histórico', href: '/consultations/history' },
    ]
  },
  {
    title: 'Prontuários',
    icon: FileText,
    href: '/records',
    submenu: [
      { title: 'Todos os Prontuários', href: '/records' },
      { title: 'Novo Registro', href: '/records/new' },
      { title: 'Pesquisar', href: '/records/search' },
    ]
  },
  {
    title: 'Exames',
    icon: TestTube,
    href: '/exams',
    submenu: [
      { title: 'Solicitar Exame', href: '/exams/new' },
      { title: 'Resultados', href: '/exams/results' },
      { title: 'Histórico', href: '/exams/history' },
    ]
  },
  {
    title: 'Prescrições',
    icon: Pill,
    href: '/prescriptions',
  },
  {
    title: 'Sinais Vitais',
    icon: Activity,
    href: '/vitals',
  },
  {
    title: 'IA Médica',
    icon: Brain,
    href: '/ai-medical',
    submenu: [
      { title: 'Análise de Sintomas', href: '/ai-medical?tab=symptoms' },
      { title: 'Interações Medicamentosas', href: '/ai-medical?tab=interactions' },
      { title: 'Resumos Médicos', href: '/ai-medical?tab=summary' },
      { title: 'Dashboard Analytics', href: '/ai-analytics' },
    ]
  },
  {
    title: 'Saúde da Família',
    icon: Building,
    href: '/psf',
    submenu: [
      { title: 'Famílias', href: '/psf/families' },
      { title: 'Visitas', href: '/psf/visits' },
    ]
  },
  {
    title: 'Gestão & BI',
    icon: BarChart3,
    href: '/admin/bi',
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    href: '/admin/financial',
    badge: 'ADMIN',
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    href: '/reports',
    submenu: [
      { title: 'Dashboard Médico', href: '/reports/dashboard' },
      { title: 'Estatísticas', href: '/reports/stats' },
      { title: 'Exportar Dados', href: '/reports/export' },
    ]
  },
  {
    title: 'Configurações',
    icon: Settings,
    href: '/settings',
    submenu: [
      { title: 'Geral', href: '/settings' },
      { title: 'Horários de Atendimento', href: '/settings/schedule' },
    ]
  },
  {
    title: 'Monitoramento de Segurança',
    icon: Activity,
    href: '/security-monitoring',
    badge: 'ADMIN',
    allowedRoles: ['ADMIN'],
  },
  {
    title: 'AI Enterprise Analytics',
    icon: Brain,
    href: '/ai-enterprise-analytics',
    badge: 'AI',
    allowedRoles: ['ADMIN'],
  },
]

export function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()
  const { data: session } = useSession()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const userRole = (session as any)?.user?.role as 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | undefined

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.allowedRoles) return true
      if (!userRole) return false
      return item.allowedRoles.includes(userRole)
    })
  }, [userRole])

  // Auto-expand groups that contain the active route
  useEffect(() => {
    const toExpand: string[] = []
    for (const item of menuItems) {
      if (!pathname) continue
      if (item.submenu && item.submenu.some((s) => pathname.startsWith(s.href))) {
        toExpand.push(item.title)
      }
    }
    setExpandedItems((prev) => {
      const merged = Array.from(new Set([...prev, ...toExpand]))
      return merged
    })
  }, [pathname])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (!pathname) return false
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  const inactiveItemClasses = isDark
    ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'

  return (
    <div
      className={cn(
        'fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] border-r overflow-y-auto transition-colors duration-300 shadow-sm supports-[backdrop-filter]:backdrop-blur-lg',
        isDark
          ? 'bg-slate-950/90 border-slate-800/70 text-slate-100'
          : 'bg-white/90 border-slate-200 text-slate-700'
      )}
    >
      <nav className="p-4 space-y-2">
        {visibleMenuItems.map((item) => (
          <div key={item.title}>
            {item.submenu ? (
              <button
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary/90 text-primary-foreground shadow-md ring-1 ring-primary/40'
                    : inactiveItemClasses
                )}
                aria-expanded={expandedItems.includes(item.title)}
                aria-controls={`submenu-${item.title}`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      isActive(item.href)
                        ? 'text-primary-foreground'
                        : isDark
                        ? 'text-slate-400 group-hover:text-slate-100'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    expandedItems.includes(item.title) && "rotate-180"
                  )}
                />
              </button>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary/90 text-primary-foreground shadow-md ring-1 ring-primary/40'
                    : inactiveItemClasses
                )}
              >
                <div className="flex items-center">
                  <item.icon
                    className={cn(
                      'h-5 w-5 mr-3',
                      isActive(item.href)
                        ? 'text-primary-foreground'
                        : isDark
                        ? 'text-slate-400 group-hover:text-slate-100'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && (!item.allowedRoles || (userRole && item.allowedRoles.includes(userRole))) && (
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-bold rounded',
                      isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
            
            {item.submenu && expandedItems.includes(item.title) && (
              <div
                className={cn(
                  'ml-4 mt-2 space-y-1 border-l-2 pl-2',
                  isDark ? 'border-slate-800' : 'border-border'
                )}
                id={`submenu-${item.title}`}
                role="region"
                aria-label={`Submenu ${item.title}`}
              >
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.title}
                    href={subItem.href}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                      isActive(subItem.href)
                        ? 'bg-accent/90 text-accent-foreground font-medium'
                        : isDark
                        ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-current={isActive(subItem.href) ? 'page' : undefined}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
