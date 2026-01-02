'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { SearchFilter, FilterConfig } from '@/components/search/search-filter'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SendHorizontal,
  Plus,
  Eye,
  Calendar,
  User,
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Referral {
  id: string
  specialty: string
  description: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  patient: {
    name: string
  }
  doctor: {
    name: string
    speciality?: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  'PENDING': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  'ACCEPTED': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'IN_PROGRESS': 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'COMPLETED': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  'CANCELLED': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
}

const PRIORITY_COLORS: Record<string, string> = {
  'LOW': 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  'NORMAL': 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
  'HIGH': 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
  'URGENT': 'text-red-600 bg-red-100 dark:bg-red-900/20',
}

const STATUS_LABELS: Record<string, string> = {
  'PENDING': 'Pendente',
  'ACCEPTED': 'Aceita',
  'IN_PROGRESS': 'Em Andamento',
  'COMPLETED': 'Concluída',
  'CANCELLED': 'Cancelada',
}

const PRIORITY_LABELS: Record<string, string> = {
  'LOW': 'Baixa',
  'NORMAL': 'Normal',
  'HIGH': 'Alta',
  'URGENT': 'Urgente',
}

export default function ReferralsPage() {
  const router = useRouter()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        status: filterStatus,
        priority: filterPriority,
      })

      const response = await fetch(`/api/referrals?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar referências')

      const data = await response.json()
      setReferrals(data.referrals || [])
      const total = (data.pagination?.total ?? data.total ?? 0) as number
      setTotalPages(Math.ceil(total / 10))
    } catch (error) {
      console.error('Erro ao buscar referências:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterStatus, filterPriority, searchTerm])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  const filterConfigs: FilterConfig[] = [
    {
      name: 'status',
      label: 'Status',
      options: [
        { label: 'Todos', value: 'ALL' },
        { label: 'Pendente', value: 'PENDING' },
        { label: 'Aceita', value: 'ACCEPTED' },
        { label: 'Em Andamento', value: 'IN_PROGRESS' },
        { label: 'Concluída', value: 'COMPLETED' },
        { label: 'Cancelada', value: 'CANCELLED' },
      ],
      defaultValue: 'ALL',
    },
    {
      name: 'priority',
      label: 'Prioridade',
      options: [
        { label: 'Todas', value: 'ALL' },
        { label: 'Baixa', value: 'LOW' },
        { label: 'Normal', value: 'NORMAL' },
        { label: 'Alta', value: 'HIGH' },
        { label: 'Urgente', value: 'URGENT' },
      ],
      defaultValue: 'ALL',
    },
  ]

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterStatus('ALL')
    setFilterPriority('ALL')
    setCurrentPage(1)
  }

  const handleFilterChange = (name: string, value: string) => {
    if (name === 'status') setFilterStatus(value)
    if (name === 'priority') setFilterPriority(value)
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-20">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title="Referências"
              description="Gestão de encaminhamentos para especialistas"
              breadcrumbs={[
                { label: 'Dashboard', href: '/' },
                { label: 'Referências', href: '/referrals' },
              ]}
              actions={
                <Button
                  onClick={() => router.push('/referrals/new')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova Referência
                </Button>
              }
            />

            {/* Search & Filters */}
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filterConfigs}
              filterValues={{ status: filterStatus, priority: filterPriority }}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
              loading={loading}
              placeholder="Buscar por paciente, especialidade ou descrição..."
            />

            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : referrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SendHorizontal className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma referência encontrada
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filterStatus !== 'ALL' || filterPriority !== 'ALL'
                    ? 'Tente ajustar seus filtros ou busca'
                    : 'Crie uma nova referência para começar'}
                </p>
                <Button onClick={() => router.push('/referrals/new')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Referência
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {referrals.map((referral) => (
                  <Card
                    key={referral.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/referrals/${referral.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Main Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <Stethoscope className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">
                                {referral.specialty}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {referral.description}
                              </p>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className={`${STATUS_COLORS[referral.status as keyof typeof STATUS_COLORS] || STATUS_COLORS['PENDING']}`}
                            >
                              {STATUS_LABELS[referral.status as keyof typeof STATUS_LABELS] || referral.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={PRIORITY_COLORS[referral.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS['NORMAL']}
                            >
                              {PRIORITY_LABELS[referral.priority as keyof typeof PRIORITY_LABELS] || referral.priority}
                            </Badge>
                          </div>

                          {/* Meta Information */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>{referral.patient.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Stethoscope className="h-4 w-4" />
                              <span>{referral.doctor.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(referral.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(referral.updatedAt), 'HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Button */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/referrals/${referral.id}`)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && referrals.length > 0 && totalPages > 1 && (
              <div className="flex justify-between items-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
