'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  DollarSign
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

  return (
    <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {visibleMenuItems.map((item) => (
          <div key={item.title}>
            {item.submenu ? (
              <button
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-medical-primary text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
                aria-expanded={expandedItems.includes(item.title)}
                aria-controls={`submenu-${item.title}`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
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
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-medical-primary text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (!item.allowedRoles || (userRole && item.allowedRoles.includes(userRole))) && (
                  <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
            
            {item.submenu && expandedItems.includes(item.title) && (
              <div className="ml-4 mt-2 space-y-1" id={`submenu-${item.title}`} role="region" aria-label={`Submenu ${item.title}`}>
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.title}
                    href={subItem.href}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                      isActive(subItem.href)
                        ? "bg-medical-light text-medical-primary font-medium"
                        : "text-gray-600 hover:bg-gray-50"
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
