'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  BarChart3,
  DollarSign,
  Shield,
  ShieldAlert,
  Calendar,
  ClipboardList,
  Activity,
  FileText,
  ChevronDown,
  Boxes,
  Database,
  Server,
  Key,
  FlaskConical,
  ScrollText
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  submenu?: Array<{ title: string; href: string; badge?: string }>
  badge?: string
  description?: string
}

// Menu administrativo — apenas rotas que existem e estão implementadas
const adminMenuItems: MenuItem[] = [
  {
    title: 'Visão Geral',
    icon: LayoutDashboard,
    href: '/admin',
    description: 'Dashboard gerencial'
  },
  // Sistema e Config primeiro — o admin precisa achar rápido
  {
    title: 'Sistema & Config',
    icon: Server,
    href: '/admin/ai-settings',
    submenu: [
      { title: 'Configurações IA', href: '/admin/ai-settings', badge: 'Groq/Ollama' },
      { title: 'Status do Sistema', href: '/system-monitor' },
      { title: 'Configurações Gerais', href: '/settings' },
      { title: 'Backup & Dados', href: '/admin/backup' },
      { title: 'Termos & Privacidade', href: '/admin/terms' },
      { title: 'Infraestrutura', href: '/apresentacao-infra', badge: '🔒' },
      { title: 'Reset de Banco', href: '/admin/database-reset' },
    ]
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
    href: '/admin/staff',
    badge: 'RH',
    submenu: [
      { title: 'Equipe', href: '/admin/staff' },
      { title: 'Equipes de Cuidado', href: '/admin/care-teams' },
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
      { title: 'Alertas', href: '/inventory/alerts' },
    ]
  },
  {
    title: 'Dados Mestres',
    icon: Database,
    href: '/admin/master-data',
    submenu: [
      { title: 'Hub Catálogos', href: '/admin/master-data' },
      { title: 'Medicamentos', href: '/admin/medications' },
      { title: 'CID / CBO', href: '/admin/coding' },
      { title: 'Ocupações', href: '/admin/occupations' },
    ]
  },
  {
    title: 'Configurações Clínicas',
    icon: FlaskConical,
    href: '/admin/exam-combos',
    submenu: [
      { title: 'Combos de Exames', href: '/admin/exam-combos' },
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
    title: 'Segurança',
    icon: Shield,
    href: '/security-monitoring',
    submenu: [
      { title: 'Monitoramento', href: '/security-monitoring' },
      { title: 'Logs de Auditoria', href: '/admin/audit' },
    ]
  },
  {
    title: 'Assinaturas Digitais',
    icon: Key,
    href: '/admin/digital-signatures',
  },
  {
    title: 'LGPD & Prontuários',
    icon: ScrollText,
    href: '/admin/medical-record-requests',
    badge: 'LGPD',
    submenu: [
      { title: 'Solicitações de Cópia', href: '/admin/medical-record-requests' },
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
  // Integrações SUS (e-SUS, RNDS) — removido do foco atual (clínicas particulares)
  // Disponível para reativar em desenvolvimento futuro
]

export function AdminSidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Visão Geral'])
  const pathname = usePathname()

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
        'fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] flex flex-col border-r transition-colors duration-300',
        'bg-background border-border'
      )}
    >
      {/* Header do Admin */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-xs truncate">Painel Admin</h2>
            <p className="text-[11px] text-muted-foreground truncate">Gestão</p>
          </div>
        </div>
      </div>

      {/* Menu — scrollável, sem sobreposição com footer */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
        {adminMenuItems.map((item) => (
          <div key={item.title} className="py-0.5">
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0 transition-transform',
                      expandedItems.includes(item.title) && 'rotate-180'
                    )}
                  />
                </button>
                {expandedItems.includes(item.title) && (
                  <div className="ml-4 mt-0.5 mb-1 border-l border-border pl-2 space-y-0.5">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors block truncate',
                          isActive(subItem.href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <span className="truncate flex-1">{subItem.title}</span>
                        {subItem.badge && (
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {subItem.badge}
                          </span>
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
                  'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1">{item.title}</span>
                {item.badge && (
                  <span className="text-[9px] text-muted-foreground/80 flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer — fixo no rodapé, não sobrepõe */}
      <div className="flex-shrink-0 p-2 border-t border-border bg-muted">
        <Link
          href="/"
          className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <Activity className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Área Clínica</span>
        </Link>
      </div>
    </div>
  )
}
