'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TestTube, Calendar, User, Clock, Search, ArrowLeft, Filter, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExamRequest {
  id: string
  patient: {
    id: string
    name: string
  }
  exam_type: string
  description: string
  requested_by: string
  urgency: string
  status: string
  result?: string
  scheduled_for?: string
  created_at: string
  completed_at?: string
}

export default function ExamResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [filteredExams, setFilteredExams] = useState<ExamRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    fetchExamRequests()
  }, [])

  useEffect(() => {
    filterExams()
  }, [examRequests, searchTerm, statusFilter, urgencyFilter, typeFilter])

  const fetchExamRequests = async () => {
    try {
      const response = await fetch('/api/exam-requests')
      if (response.ok) {
        const data = await response.json()
        // Ordenar por data mais recente primeiro
        const sorted = data.sort((a: ExamRequest, b: ExamRequest) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setExamRequests(sorted)
      }
    } catch (error) {
      console.error('Erro ao buscar exames:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExams = () => {
    let filtered = [...examRequests]

    // Filtro por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(exam =>
        exam.patient.name.toLowerCase().includes(term) ||
        exam.exam_type.toLowerCase().includes(term) ||
        exam.requested_by.toLowerCase().includes(term) ||
        exam.description.toLowerCase().includes(term)
      )
    }

    // Filtro por status
    if (statusFilter) {
      filtered = filtered.filter(exam => exam.status === statusFilter)
    }

    // Filtro por urgência
    if (urgencyFilter) {
      filtered = filtered.filter(exam => exam.urgency === urgencyFilter)
    }

    // Filtro por tipo
    if (typeFilter) {
      filtered = filtered.filter(exam => exam.exam_type === typeFilter)
    }

    setFilteredExams(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'REQUESTED': 'bg-yellow-100 text-yellow-800',
      'SCHEDULED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      'URGENT': 'bg-red-100 text-red-800',
      'ROUTINE': 'bg-green-100 text-green-800',
      'SCHEDULED': 'bg-blue-100 text-blue-800'
    }
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels = {
      'URGENT': 'Urgente',
      'ROUTINE': 'Rotina',
      'SCHEDULED': 'Agendado'
    }
    return labels[urgency as keyof typeof labels] || urgency
  }

  // Obter tipos únicos de exames
  const examTypes = Array.from(new Set(examRequests.map(exam => exam.exam_type))).sort()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TestTube className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resultados de Exames</h1>
            <p className="text-sm text-gray-500">Visualizar resultados e status dos exames</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Paciente, tipo, médico..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos os status</option>
                <option value="COMPLETED">Concluído</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="REQUESTED">Solicitado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgência
              </label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas as urgências</option>
                <option value="URGENT">Urgente</option>
                <option value="ROUTINE">Rotina</option>
                <option value="SCHEDULED">Agendado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Exame
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos os tipos</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{filteredExams.length}</p>
              </div>
              <TestTube className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredExams.filter(e => e.status === 'COMPLETED').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredExams.filter(e => e.status === 'IN_PROGRESS').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredExams.filter(e => e.urgency === 'URGENT').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-red-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Resultado</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredExams.filter(e => e.result).length}
                </p>
              </div>
              <Download className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Exames */}
      <Card>
        <CardHeader>
          <CardTitle>Exames ({filteredExams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TestTube className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exam.exam_type}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {exam.patient.name} • Solicitado por: Dr(a). {exam.requested_by}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={getStatusColor(exam.status)}>
                          {getStatusLabel(exam.status)}
                        </Badge>
                        <Badge className={getUrgencyColor(exam.urgency)}>
                          {getUrgencyLabel(exam.urgency)}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <strong>Descrição:</strong> {exam.description}
                    </div>

                    {exam.result && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Download className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Resultado Disponível</p>
                            <p className="text-sm text-green-700 mt-1">{exam.result}</p>
                            {exam.completed_at && (
                              <p className="text-xs text-green-600 mt-1">
                                Concluído em: {formatDate(exam.completed_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Solicitado: {formatDate(exam.created_at)}</span>
                      </div>
                      
                      {exam.scheduled_for && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Agendado: {formatDate(exam.scheduled_for)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>ID: {exam.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredExams.length === 0 && (
              <div className="text-center py-8">
                <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum exame encontrado com os filtros aplicados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
