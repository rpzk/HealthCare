'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
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
  },
]

export function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  return (
    <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
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
                  "w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-medical-primary text-white" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.title}</span>
              </Link>
            )}
            
            {item.submenu && expandedItems.includes(item.title) && (
              <div className="ml-4 mt-2 space-y-1">
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
