'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  FileText
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
  const { data: session } = useSession()
  const [exams, setExams] = useState<ExamRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterUrgency, setFilterUrgency] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchExams()
  }, [currentPage, filterStatus, filterUrgency, searchTerm])

  const fetchExams = async () => {
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
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'REQUESTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'SCHEDULED': 'bg-blue-100 text-blue-800 border-blue-200',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800 border-purple-200',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      'ROUTINE': 'bg-gray-100 text-gray-800 border-gray-200',
      'URGENT': 'bg-orange-100 text-orange-800 border-orange-200',
      'EMERGENCY': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TestTube className="h-8 w-8 text-purple-600" />
            Exames Médicos
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie solicitações e resultados de exames
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Solicitar Exame
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum exame encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Não há exames correspondentes aos filtros aplicados.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Solicitar Primeiro Exame
              </Button>
            </CardContent>
          </Card>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                          <TestTube className="h-5 w-5 text-purple-600" />
                          {exam.examType}
                        </h3>
                        {exam.description && (
                          <p className="text-gray-600 text-sm">
                            {exam.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getStatusColor(exam.status)}`}
                        >
                          {getStatusIcon(exam.status)}
                          {getStatusLabel(exam.status)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={getUrgencyColor(exam.urgency)}
                        >
                          {exam.urgency === 'EMERGENCY' && <AlertTriangle className="h-3 w-3" />}
                          {getUrgencyLabel(exam.urgency)}
                        </Badge>
                      </div>
                    </div>

                    {exam.results && (
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-sm text-green-900">
                          <strong>Resultados:</strong> {exam.results}
                        </p>
                      </div>
                    )}

                    {exam.notes && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-900">
                          <strong>Observações:</strong> {exam.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{exam.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        <span>{exam.doctor.name}</span>
                        {exam.doctor.speciality && (
                          <span className="text-gray-400">
                            • {exam.doctor.speciality}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Solicitado: {new Date(exam.requestDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {exam.scheduledDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Agendado: {new Date(exam.scheduledDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {exam.results && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Resultados
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
  )
}
