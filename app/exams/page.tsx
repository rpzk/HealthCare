'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  TestTube,
  Search,
  Plus,
  Calendar,
  User,
  Stethoscope,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Edit,
  Download,
  MoreVertical
} from 'lucide-react'

interface ExamRequest {
  id: string
  examType: string
  description?: string
  urgency: string
  status: string
  requestDate: string
  scheduledDate?: string
  results?: string
  notes?: string
  patient: {
    name: string
  }
  doctor: {
    name: string
    speciality?: string
  }
}

export default function ExamsPage() {
  const { data: _session } = useSession()
  const router = useRouter()
  const [exams, setExams] = useState<ExamRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterUrgency, setFilterUrgency] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        status: filterStatus,
        urgency: filterUrgency
      })

      const response = await fetch(`/api/exam-requests?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar exames')

      const data = await response.json()
      setExams(data.examRequests || [])
      setTotalPages(Math.ceil((data.total || 0) / 10))
    } catch (error) {
      console.error('Erro ao buscar exames:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterStatus, filterUrgency, searchTerm])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  const getStatusColor = (status: string) => {
    const colors = {
      'REQUESTED': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      'SCHEDULED': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'IN_PROGRESS': 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      'COMPLETED': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      'CANCELLED': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      'ROUTINE': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      'URGENT': 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      'EMERGENCY': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
    }
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'REQUESTED': <Clock className="h-4 w-4" />,
      'SCHEDULED': <Calendar className="h-4 w-4" />,
      'IN_PROGRESS': <TestTube className="h-4 w-4" />,
      'COMPLETED': <CheckCircle className="h-4 w-4" />,
      'CANCELLED': <XCircle className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'REQUESTED': 'Solicitado',
      'SCHEDULED': 'Agendado',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Concluído',
      'CANCELLED': 'Cancelado'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels = {
      'ROUTINE': 'Rotina',
      'URGENT': 'Urgente',
      'EMERGENCY': 'Emergência'
    }
    return labels[urgency as keyof typeof labels] || urgency
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Exames Médicos"
            description="Gerencie solicitações e resultados de exames"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Exames', href: '/exams' }
            ]}
            actions={(
              <Button onClick={() => router.push('/exams/new')} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Solicitar Exame
              </Button>
            )}
          />

          <div className="space-y-6">

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tipo de exame, paciente ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">Todos os Status</option>
                <option value="REQUESTED">Solicitados</option>
                <option value="SCHEDULED">Agendados</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="COMPLETED">Concluídos</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">Toda Urgência</option>
                <option value="ROUTINE">Rotina</option>
                <option value="URGENT">Urgente</option>
                <option value="EMERGENCY">Emergência</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Exames */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Exame</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgência</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{exam.examType}</div>
                          <div className="text-sm text-muted-foreground">Dr. {exam.doctor.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{exam.patient.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-1.5 h-4 w-4" />
                        {new Date(exam.requestDate).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(exam.status)}`}>
                        {exam.status === 'REQUESTED' && 'Solicitado'}
                        {exam.status === 'SCHEDULED' && 'Agendado'}
                        {exam.status === 'IN_PROGRESS' && 'Em Andamento'}
                        {exam.status === 'COMPLETED' && 'Concluído'}
                        {exam.status === 'CANCELLED' && 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(exam.urgency)}`}>
                        {exam.urgency === 'ROUTINE' && 'Rotina'}
                        {exam.urgency === 'URGENT' && 'Urgente'}
                        {exam.urgency === 'EMERGENCY' && 'Emergência'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  )
}
