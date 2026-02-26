'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Pill,
  BookOpen,
  Briefcase,
  FlaskConical,
  ChevronRight,
  Database,
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'medications',
    title: 'Medicamentos',
    description: 'Catálogo de medicamentos: adicionar, editar, inativar. Ver estatísticas do cadastro.',
    href: '/admin/medications',
    icon: Pill,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    id: 'coding',
    title: 'CID-10, CID-11, CBO, CIAP-2',
    description: 'Sistemas de codificação clínica: busca e consulta de códigos para diagnósticos e procedimentos.',
    href: '/admin/coding',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    id: 'occupations',
    title: 'Ocupações e CBOs',
    description: 'Cadastro de ocupações profissionais e integração com tabela CBO.',
    href: '/admin/occupations',
    icon: Briefcase,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    id: 'exam-combos',
    title: 'Combos de Exames',
    description: 'Configurar combos e tipos de exame para solicitações.',
    href: '/admin/exam-combos',
    icon: FlaskConical,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950',
  },
]

export default function MasterDataHubPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Database className="h-7 w-7" />
          Dados Mestres e Catálogos
        </h1>
        <p className="text-muted-foreground mt-1">
          Acesse, edite e gerencie prescrições, exames, encaminhamentos, CIDs, CBOs e medicamentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.id} href={s.href}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className={`p-2 rounded-lg ${s.bgColor}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription className="mt-1">{s.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-6">
        Para importar medicamentos em massa: <code className="bg-muted px-1 rounded">npm run import:medications -- --file medicamentos.csv</code>
      </p>
    </div>
  )
}
