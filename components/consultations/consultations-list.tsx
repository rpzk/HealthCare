'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Calendar, Clock, User, Phone, Play, CheckCircle, XCircle, UserX, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ConsultationForm } from './consultation-form'

interface Consultation {
  id: string
  scheduledDate: string
  actualStartTime?: string
  actualEndTime?: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  type: string
  description?: string
  notes?: string
  duration: number
  patient: {
    id: string
    name: string
    email?: string
    phone?: string
    age: number
    gender: string
  }
  doctor: {
    id: string
    name: string
    email: string
    specialty: string
    crmNumber?: string
  }
}

interface ConsultationListResponse {
  consultations: Consultation[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function ConsultationsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    fetchConsultations()
  }, [searchTerm, pagination.page, statusFilter, typeFilter])

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/consultations?${params}`)
      
      if (!response.ok) {
        throw new Error('Falha ao carregar consultas')
      }

      const data: ConsultationListResponse = await response.json()
      setConsultations(data.consultations)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Erro ao carregar consultas:', err)
      setError('Erro ao carregar consultas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConsultation = async (data: any) => {
    try {
      setFormLoading(true)
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao agendar consulta')
      }

      await fetchConsultations()
      setShowForm(false)
    } catch (error: any) {
      console.error('Erro ao criar consulta:', error)
      throw error // Repassar erro para o formulário
    } finally {
      setFormLoading(false)
    }
  }

  const handleConsultationAction = async (consultationId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ao ${action === 'start' ? 'iniciar' : action === 'complete' ? 'finalizar' : 'cancelar'} consulta`)
      }

      await fetchConsultations()
    } catch (error: any) {
      console.error(`Erro ao ${action} consulta:`, error)
      alert(error.message || `Erro ao ${action} consulta`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'status-active'
      case 'IN_PROGRESS':
        return 'status-emergency'
      case 'COMPLETED':
        return 'status-success'
      case 'CANCELLED':
        return 'status-pending'
      case 'NO_SHOW':
        return 'status-inactive'
      default:
        return 'status-pending'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Agendada'
      case 'IN_PROGRESS':
        return 'Em andamento'
      case 'COMPLETED':
        return 'Concluída'
      case 'CANCELLED':
        return 'Cancelada'
      case 'NO_SHOW':
        return 'Paciente faltou'
      default:
        return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ROUTINE':
        return 'Rotina'
      case 'URGENT':
        return 'Urgente'
      case 'EMERGENCY':
        return 'Emergência'
      case 'FOLLOW_UP':
        return 'Retorno'
      case 'PREVENTIVE':
        return 'Preventiva'
      default:
        return type
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return <ConsultationsListSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Banner de erro se houver */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchConsultations}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar consultas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="SCHEDULED">Agendadas</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="NO_SHOW">Faltaram</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="ROUTINE">Rotina</option>
            <option value="URGENT">Urgente</option>
            <option value="EMERGENCY">Emergência</option>
            <option value="FOLLOW_UP">Retorno</option>
            <option value="PREVENTIVE">Preventiva</option>
          </select>
        </div>
        
        <Button variant="medical" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agendar Consulta
        </Button>
      </div>

      {/* Lista de consultas */}
      <div className="grid gap-6">
        {consultations.map((consultation) => {
          const { date, time } = formatDateTime(consultation.scheduledDate)
          
          return (
            <Card key={consultation.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-medical-primary rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {consultation.patient.name}
                        </h3>
                        <span className={getStatusColor(consultation.status)}>
                          {getStatusText(consultation.status)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {getTypeText(consultation.type)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{time} ({consultation.duration}min)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Dr. {consultation.doctor.name}</span>
                        </div>
                      </div>
                      
                      {consultation.patient.phone && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{consultation.patient.phone}</span>
                        </div>
                      )}
                      
                      {consultation.description && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-700">
                            <strong>Motivo:</strong> {consultation.description}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {consultation.status === 'SCHEDULED' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConsultationAction(consultation.id, 'start')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConsultationAction(consultation.id, 'cancel', { reason: 'Cancelada pelo médico' })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    
                    {consultation.status === 'IN_PROGRESS' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const notes = prompt('Observações finais da consulta (opcional):')
                          handleConsultationAction(consultation.id, 'complete', { notes })
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    )}

                    {consultation.status === 'SCHEDULED' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConsultationAction(consultation.id, 'no-show')}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Faltou
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Paginação */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {pagination.page} de {pagination.pages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Próxima
          </Button>
        </div>
      )}

      {consultations.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Calendar className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma consulta encontrada
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Tente ajustar os filtros ou pesquisar por outros termos.' 
                : 'Ainda não há consultas agendadas.'
              }
            </p>
            <Button variant="medical" className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Primeira Consulta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulário */}
      {showForm && (
        <ConsultationForm
          onSubmit={handleCreateConsultation}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      )}
    </div>
  )
}

function ConsultationsListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filtros skeleton */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-40"></div>
      </div>

      {/* Lista skeleton */}
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-96 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
