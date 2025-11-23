"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Filter, Calendar, Clock, User, Phone, Play, CheckCircle, XCircle, UserX, Edit, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConsultationForm } from './consultation-form-ssf'

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
  const searchParams = useSearchParams()
  const router = useRouter()
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
  }, [searchTerm, pagination.page, statusFilter, typeFilter, searchParams?.toString()])

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

  const urlPatientId = searchParams?.get('patientId') || undefined
  const urlDate = searchParams?.get('date') || undefined
      if (urlPatientId) params.set('patientId', urlPatientId)
      if (urlDate) {
        const d = new Date(urlDate)
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        params.set('dateFrom', start.toISOString())
        params.set('dateTo', end.toISOString())
      }

      const response = await fetch(`/api/consultations?${params}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar consultas: ${response.status}`)
      }
      
      const data: ConsultationListResponse = await response.json()
      setConsultations(data.consultations || [])
      
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }))
      }
    } catch (err: any) {
      console.error('Erro ao buscar consultas:', err)
      setError(err.message || 'Erro ao carregar consultas')
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateConsultation = async (consultationId: string, action: string, reason?: string) => {
    try {
      setFormLoading(true)
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ao ${action} consulta`)
      }
      
      await fetchConsultations()
    } catch (err: any) {
      console.error(`Erro ao ${action} consulta:`, err)
      setError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'default'
      case 'CANCELLED':
        return 'destructive'
      case 'COMPLETED':
        return 'secondary'
      case 'NO_SHOW':
        return 'outline'
      default:
        return 'secondary'
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando consultas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner de erro se houver */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <Button 
                  onClick={fetchConsultations}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e ações */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                className="px-3 py-2 border border-input rounded-md text-sm"
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
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">Todos os tipos</option>
                <option value="ROUTINE">Rotina</option>
                <option value="URGENT">Urgente</option>
                <option value="EMERGENCY">Emergência</option>
                <option value="FOLLOW_UP">Retorno</option>
                <option value="PREVENTIVE">Preventiva</option>
              </select>
            </div>
            
            <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Agendar Consulta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de consultas */}
      <div className="grid gap-6">
        {consultations.map((consultation) => {
          const { date, time } = formatDateTime(consultation.scheduledDate)
          
          return (
            <Card key={consultation.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {consultation.patient.name}
                        </h3>
                        <Badge variant={getStatusVariant(consultation.status)}>
                          {getStatusText(consultation.status)}
                        </Badge>
                        <Badge variant="outline">
                          {getTypeText(consultation.type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
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
                        <div className="flex items-center space-x-1 mt-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{consultation.patient.phone}</span>
                        </div>
                      )}
                      
                      {consultation.description && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-foreground">
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
                          onClick={() => handleUpdateConsultation(consultation.id, 'start')}
                          disabled={formLoading}
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar
                        </Button>
                        <Button
                          onClick={() => handleUpdateConsultation(consultation.id, 'cancel', 'Cancelada pelo médico')}
                          disabled={formLoading}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleUpdateConsultation(consultation.id, 'no-show', 'Paciente não compareceu')}
                          disabled={formLoading}
                          variant="outline"
                          size="sm"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Faltou
                        </Button>
                      </>
                    )}
                    
                    {consultation.status === 'IN_PROGRESS' && (
                      <Button
                        onClick={() => handleUpdateConsultation(consultation.id, 'complete')}
                        disabled={formLoading}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    )}
                    
                    <Button 
                      onClick={() => router.push(`/consultations/${consultation.id}`)}
                      variant="outline"
                      size="sm"
                    >
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
      {(pagination?.pages ?? 0) > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-center space-x-2">
              <Button
                disabled={(pagination?.page ?? 1) === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <span className="flex items-center px-4 text-muted-foreground">
                Página {pagination?.page ?? 1} de {pagination?.pages ?? 0}
              </span>
              <Button
                disabled={(pagination?.page ?? 1) === (pagination?.pages ?? 0)}
                onClick={() => setPagination(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                variant="outline"
                size="sm"
              >
                Próxima
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {consultations.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma consulta encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Tente ajustar os filtros ou pesquisar por outros termos.' 
                : 'Ainda não há consultas agendadas.'
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Primeira Consulta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulário de consulta */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingConsultation ? 'Editar Consulta' : 'Nova Consulta'}
                </CardTitle>
                <Button
                  onClick={() => {
                    setShowForm(false)
                    setEditingConsultation(null)
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ConsultationForm
                patient={editingConsultation?.patient}
                onSubmit={async (data) => {
                  setShowForm(false)
                  setEditingConsultation(null)
                  fetchConsultations()
                }}
                onCancel={() => {
                  setShowForm(false)
                  setEditingConsultation(null)
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}