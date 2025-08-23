'use client'

import { useState } from 'react'
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
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/',
    active: true,
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
    href: '/appointments',
    submenu: [
      { title: 'Agenda', href: '/appointments' },
      { title: 'Nova Consulta', href: '/appointments/new' },
      { title: 'Histórico', href: '/appointments/history' },
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

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  return (
    <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.title}>
            <button
              onClick={() => item.submenu && toggleExpanded(item.title)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                item.active 
                  ? "bg-medical-primary text-white" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </div>
              {item.submenu && (
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedItems.includes(item.title) && "rotate-180"
                  )}
                />
              )}
            </button>
            
            {item.submenu && expandedItems.includes(item.title) && (
              <div className="ml-4 mt-2 space-y-1">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.title}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                  >
                    {subItem.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
