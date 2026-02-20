'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { 
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  BarChart3,
  DollarSign,
  Settings,
  Shield,
  ShieldAlert,
  Mail,
  Calendar,
  Brain,
  ClipboardList,
  Activity,
  FileText,
  ChevronDown,
  Boxes,
  Bell,
  Database,
  Gauge,
  TrendingUp,
  PieChart,
  Server,
  Key,
  FlaskConical,
  ScrollText,
  Ban,
  Cloud
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface MenuItem {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  submenu?: Array<{ title: string; href: string; badge?: string }>
  badge?: string
  description?: string
}

// Menu administrativo focado em gestão
const adminMenuItems: MenuItem[] = [
  {
    title: 'Visão Geral',
    icon: LayoutDashboard,
    href: '/admin',
    description: 'Dashboard gerencial'
  },
  {
    title: 'Gestão de Usuários',
    icon: Users,
    href: '/admin/users',
    submenu: [
      { title: 'Todos os Usuários', href: '/admin/users' },
      { title: 'Convites Pendentes', href: '/admin/invites' },
      { title: 'Permissões', href: '/admin/permissions' },
    ]
  },
  {
    title: 'Gestão de Pessoal',
    icon: UserCog,
    href: '/hr',
    badge: 'RH',
    submenu: [
      { title: 'Equipe', href: '/admin/staff' },
      { title: 'Escalas de Trabalho', href: '/hr/schedules' },
      { title: 'Avaliação de Capacidade', href: '/hr/stratum' },
      { title: 'Férias e Ausências', href: '/hr/leave' },
    ]
  },
  {
    title: 'Unidades de Saúde',
    icon: Building2,
    href: '/admin/units',
    submenu: [
      { title: 'Unidades', href: '/admin/units' },
      { title: 'Salas e Equipamentos', href: '/admin/resources' },
      { title: 'Horários de Funcionamento', href: '/settings/schedule' },
    ]
  },
  {
    title: 'Agenda & Atendimentos',
    icon: Calendar,
    href: '/admin/appointments',
    submenu: [
      { title: 'Visão Geral', href: '/admin/appointments' },
      { title: 'Tipos de Atendimento', href: '/settings/appointment-types' },
      { title: 'Regras de Agendamento', href: '/admin/booking-rules' },
    ]
  },
  {
    title: 'Relatórios & BI',
    icon: BarChart3,
    href: '/admin/bi',
    submenu: [
      { title: 'Dashboard Analytics', href: '/admin/bi' },
      { title: 'Relatórios Gerenciais', href: '/reports' },
      { title: 'Exportar Dados', href: '/reports/export' },
    ]
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    href: '/admin/financial',
    description: 'Gestão financeira'
  },
  {
    title: 'Estoque & Insumos',
    icon: Boxes,
    href: '/inventory',
    submenu: [
      { title: 'Inventário', href: '/inventory' },
      { title: 'Fornecedores', href: '/inventory/suppliers' },
      { title: 'Pedidos', href: '/inventory/orders' },
    ]
  },
  {
    title: 'Configurações Clínicas',
    icon: FlaskConical,
    href: '/admin/exam-combos',
    submenu: [
      { title: 'Combos de Exames', href: '/admin/exam-combos' },
      { title: 'Protocolos', href: '/admin/protocols' },
      { title: 'Catálogo de Exames', href: '/admin/exam-catalog' },
    ]
  },
  {
    title: 'Questionários',
    icon: ClipboardList,
    href: '/questionnaires',
    submenu: [
      { title: 'Templates', href: '/questionnaires' },
      { title: 'Enviados', href: '/questionnaires?tab=sent' },
      { title: 'Resultados', href: '/questionnaires?tab=results' },
    ]
  },
  {
    title: 'IA & Analytics',
    icon: Brain,
    href: '/ai-enterprise-analytics',
    badge: 'AI',
    submenu: [
      { title: 'Dashboard IA', href: '/ai-enterprise-analytics' },
      { title: 'Análises Médicas', href: '/ai-analytics' },
      { title: 'Configurações IA', href: '/admin/ai-settings' },
    ]
  },
  {
    title: 'Segurança',
    icon: Shield,
    href: '/security-monitoring',
    submenu: [
      { title: 'Monitoramento', href: '/security-monitoring' },
      { title: 'Logs de Auditoria', href: '/admin/audit-logs' },
      { title: 'Políticas de Acesso', href: '/admin/access-policies' },
    ]
  },
  {
    title: 'Assinaturas Digitais',
    icon: Key,
    href: '/admin/digital-signatures',
    submenu: [
      { title: 'Certificados & Assinaturas', href: '/admin/digital-signatures' },
    ]
  },
  {
    title: 'LGPD & Prontuários',
    icon: ScrollText,
    href: '/admin/medical-record-requests',
    badge: 'LGPD',
    submenu: [
      { title: 'Solicitações de Cópia', href: '/admin/medical-record-requests' },
      { title: 'Oposições ao Tratamento', href: '/admin/treatment-oppositions' },
      { title: 'Logs de Auditoria', href: '/admin/audit' },
    ]
  },
  {
    title: 'Incidentes de Segurança',
    icon: ShieldAlert,
    href: '/admin/security-incidents',
    badge: 'Art.48',
    description: 'Gestão de incidentes LGPD'
  },
  {
    title: 'Integrações SUS',
    icon: Cloud,
    href: '/admin/rnds',
    badge: 'RNDS',
    description: 'Interoperabilidade com SUS',
    submenu: [
      { title: 'RNDS', href: '/admin/rnds' },
      { title: 'e-SUS AB', href: '/admin/esus' },
    ]
  },
  {
    title: 'Sistema',
    icon: Server,
    href: '/system',
    submenu: [
      { title: 'Status', href: '/system-monitor' },
      { title: 'Configurações Gerais', href: '/settings' },
      { title: 'Termos & Privacidade', href: '/admin/terms' },
      { title: 'Integrações', href: '/settings/integrations' },
      { title: 'Backup & Dados', href: '/admin/backup' },
      { title: 'Reset de Banco', href: '/admin/database-reset' },
    ]
  },
]

export function AdminSidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Visão Geral'])
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Auto-expand active groups
  useEffect(() => {
    const toExpand: string[] = []
    for (const item of adminMenuItems) {
      if (!pathname) continue
      if (item.submenu && item.submenu.some((s) => pathname.startsWith(s.href))) {
        toExpand.push(item.title)
      }
      if (pathname === item.href) {
        toExpand.push(item.title)
      }
    }
    if (toExpand.length > 0) {
      setExpandedItems((prev) => Array.from(new Set([...prev, ...toExpand])))
    }
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
    if (href === '/admin' && pathname === '/admin') return true
    return href !== '/admin' && pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        'fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] border-r overflow-y-auto transition-colors duration-300',
        'bg-slate-50 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800'
      )}
    >
      {/* Header do Admin */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Painel Administrativo</h2>
            <p className="text-xs text-muted-foreground">Gestão do Sistema</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="p-3 space-y-1">
        {adminMenuItems.map((item) => (
          <div key={item.title}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        expandedItems.includes(item.title) && "rotate-180"
                      )}
                    />
                  </div>
                </button>
                
                {expandedItems.includes(item.title) && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                          isActive(subItem.href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                        )}
                      >
                        {subItem.title}
                        {subItem.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {subItem.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer com atalho para área clínica */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Activity className="h-4 w-4" />
          <span>Ir para Área Clínica</span>
        </Link>
      </div>
    </div>
  )
}
