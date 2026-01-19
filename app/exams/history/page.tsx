 'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TestTube, Calendar, User, Clock, Search, ArrowLeft, Filter, Download, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HistoryExamRequest {
  id: string
  patient: {
    id: string
    name: string
    cpf: string
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
  observations?: string
}

export default function ExamHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [examRequests, setExamRequests] = useState<HistoryExamRequest[]>([])
  const [filteredExams, setFilteredExams] = useState<HistoryExamRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [dateRange, setDateRange] = useState('')

  const filterExams = useCallback(() => {
    let filtered = [...examRequests]

    // Filtro por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(exam =>
        exam.patient.name.toLowerCase().includes(term) ||
        exam.exam_type.toLowerCase().includes(term) ||
        exam.requested_by.toLowerCase().includes(term) ||
        exam.description.toLowerCase().includes(term) ||
        exam.patient.cpf.includes(term)
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

    // Filtro por data
    if (dateRange) {
      const now = new Date()
      const startDate = new Date()

      switch (dateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7)
          break
        case '30days':
          startDate.setDate(now.getDate() - 30)
          break
        case '90days':
          startDate.setDate(now.getDate() - 90)
          break
        case '6months':
          startDate.setMonth(now.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter(exam =>
        new Date(exam.created_at) >= startDate
      )
    }

    setFilteredExams(filtered)
  }, [examRequests, searchTerm, statusFilter, urgencyFilter, dateRange])

  const fetchExamHistory = async () => {
    try {
      const response = await fetch('/api/exam-requests')
      if (response.ok) {
        const data = await response.json()
        // Ordenar por data de criação mais recente primeiro
        const sorted = data.sort((a: HistoryExamRequest, b: HistoryExamRequest) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setExamRequests(sorted)
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de exames:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExamHistory()
  }, [])

  useEffect(() => {
    filterExams()
  }, [filterExams])

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

  const exportHistory = () => {
    const csvContent = [
      ['ID', 'Paciente', 'CPF', 'Tipo de Exame', 'Médico', 'Status', 'Data Solicitação', 'Data Conclusão'].join(','),
      ...filteredExams.map(exam => [
        exam.id,
        exam.patient.name,
        exam.patient.cpf,
        exam.exam_type,
        exam.requested_by,
        getStatusLabel(exam.status),
        formatDate(exam.created_at),
        exam.completed_at ? formatDate(exam.completed_at) : 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historico_exames_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Exames</h1>
              <p className="text-sm text-gray-500">Todos os exames realizados ao longo do tempo</p>
            </div>
          </div>
        </div>
        
        <Button
          onClick={exportHistory}
          variant="outline"
          className="flex items-center space-x-2"
          disabled={filteredExams.length === 0}
        >
          <Download className="h-4 w-4" />
          <span>Exportar Histórico</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Histórico</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Paciente, exame, CPF..."
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
                <option value="">Todos</option>
                <option value="COMPLETED">Concluído</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="REQUESTED">Solicitado</option>
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
                <option value="">Todas</option>
                <option value="URGENT">Urgente</option>
                <option value="ROUTINE">Rotina</option>
                <option value="SCHEDULED">Agendado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todo o histórico</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="90days">Últimos 3 meses</option>
                <option value="6months">Últimos 6 meses</option>
                <option value="1year">Último ano</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('')
                  setUrgencyFilter('')
                  setDateRange('')
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do Período */}
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
                <p className="text-sm font-medium text-gray-600">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredExams.filter(e => e.status === 'CANCELLED').length}
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
                <p className="text-sm font-medium text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredExams.filter(e => e.urgency === 'URGENT').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista do Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Completo ({filteredExams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className={`border rounded-lg p-4 transition-colors ${
                  exam.status === 'COMPLETED' ? 'bg-green-50 border-green-200' :
                  exam.status === 'CANCELLED' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        exam.status === 'COMPLETED' ? 'bg-green-100' :
                        exam.status === 'CANCELLED' ? 'bg-red-100' :
                        'bg-green-100'
                      }`}>
                        <TestTube className={`h-4 w-4 ${
                          exam.status === 'COMPLETED' ? 'text-green-600' :
                          exam.status === 'CANCELLED' ? 'text-red-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exam.exam_type}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {exam.patient.name} • CPF: {exam.patient.cpf}
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Dr(a). {exam.requested_by}</span>
                      </div>
                      
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
                      
                      {exam.completed_at && (
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 rounded-full bg-green-600"></div>
                          <span>Concluído: {formatDate(exam.completed_at)}</span>
                        </div>
                      )}
                    </div>

                    {exam.result && (
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Eye className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Resultado</p>
                            <p className="text-sm text-green-700 mt-1">{exam.result}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {exam.observations && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Observações:</strong> {exam.observations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredExams.length === 0 && (
              <div className="text-center py-12">
                <TestTube className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">Nenhum exame encontrado</p>
                <p className="text-sm text-gray-400 mb-4">
                  {searchTerm || statusFilter || urgencyFilter || dateRange 
                    ? 'Nenhum exame corresponde aos filtros aplicados' 
                    : 'Ainda não há exames registrados no histórico'
                  }
                </p>
                <Button 
                  onClick={() => router.push('/exams/new')}
                  className="flex items-center space-x-2"
                >
                  <TestTube className="h-4 w-4" />
                  <span>Solicitar Primeiro Exame</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
