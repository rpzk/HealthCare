 'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Stethoscope, Calendar, User, Clock, Search, ArrowLeft, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Consultation {
  id: string
  patient: {
    id: string
    name: string
  }
  doctor_name: string
  specialty: string
  consultation_date: string
  type: string
  reason: string
  status: string
  created_at: string
}

export default function ConsultationHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateRange, setDateRange] = useState('')

  const filterConsultations = useCallback(() => {
    let filtered = [...consultations]

    // Filtro por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(consultation =>
        consultation.patient.name.toLowerCase().includes(term) ||
        consultation.doctor_name.toLowerCase().includes(term) ||
        consultation.specialty.toLowerCase().includes(term) ||
        consultation.reason.toLowerCase().includes(term)
      )
    }

    // Filtro por status
    if (statusFilter) {
      filtered = filtered.filter(consultation => consultation.status === statusFilter)
    }

    // Filtro por tipo
    if (typeFilter) {
      filtered = filtered.filter(consultation => consultation.type === typeFilter)
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
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter(consultation =>
        new Date(consultation.consultation_date) >= startDate
      )
    }

    setFilteredConsultations(filtered)
  }, [consultations, searchTerm, statusFilter, typeFilter, dateRange])

  const fetchConsultations = async () => {
    try {
      const response = await fetch('/api/consultations')
      if (response.ok) {
        const data = await response.json()
        // Ordenar por data mais recente primeiro
        const sorted = data.sort((a: Consultation, b: Consultation) => 
          new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime()
        )
        setConsultations(sorted)
      }
    } catch (error) {
      console.error('Erro ao buscar consultas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConsultations()
  }, [])

  useEffect(() => {
    filterConsultations()
  }, [filterConsultations])


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
      'SCHEDULED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'SCHEDULED': 'Agendada',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'IN_PROGRESS': 'Em Andamento'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      'ROUTINE': 'Rotina',
      'EMERGENCY': 'Emergência',
      'FOLLOW_UP': 'Retorno',
      'FIRST_TIME': 'Primeira Consulta'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Stethoscope className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Histórico de Consultas</h1>
            <p className="text-sm text-gray-500">Visualizar todas as consultas realizadas</p>
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
                  placeholder="Paciente, médico, especialidade..."
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos os status</option>
                <option value="COMPLETED">Concluída</option>
                <option value="SCHEDULED">Agendada</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="IN_PROGRESS">Em Andamento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos os tipos</option>
                <option value="ROUTINE">Rotina</option>
                <option value="EMERGENCY">Emergência</option>
                <option value="FOLLOW_UP">Retorno</option>
                <option value="FIRST_TIME">Primeira Consulta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos os períodos</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="90days">Últimos 3 meses</option>
                <option value="1year">Último ano</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{filteredConsultations.length}</p>
              </div>
              <Stethoscope className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredConsultations.filter(c => c.status === 'COMPLETED').length}
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
                <p className="text-sm font-medium text-gray-600">Agendadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredConsultations.filter(c => c.status === 'SCHEDULED').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredConsultations.filter(c => c.status === 'CANCELLED').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-red-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas ({filteredConsultations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConsultations.map((consultation) => (
              <div
                key={consultation.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {consultation.patient.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Dr(a). {consultation.doctor_name} • {consultation.specialty}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={getStatusColor(consultation.status)}>
                          {getStatusLabel(consultation.status)}
                        </Badge>
                        <Badge variant="outline">
                          {getTypeLabel(consultation.type)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(consultation.consultation_date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>ID: {consultation.id}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <strong>Motivo:</strong> {consultation.reason}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredConsultations.length === 0 && (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma consulta encontrada com os filtros aplicados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
