"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Filter, Calendar, Clock, User, Phone, Play, CheckCircle, XCircle, UserX, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'px-2 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-full'
      case 'CANCELLED':
        return 'px-2 py-1 bg-red-500/20 text-red-300 text-xs font-medium rounded-full'
      case 'COMPLETED':
        return 'px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full'
      case 'NO_SHOW':
        return 'px-2 py-1 bg-orange-500/20 text-orange-300 text-xs font-medium rounded-full'
      default:
        return 'px-2 py-1 bg-gray-500/20 text-gray-300 text-xs font-medium rounded-full'
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
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Carregando consultas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner de erro se houver */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button 
                onClick={fetchConsultations}
                variant="outline"
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e ações */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar consultas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background text-foreground border-input"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="px-3 py-2 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os tipos</option>
              <option value="ROUTINE">Rotina</option>
              <option value="URGENT">Urgente</option>
              <option value="EMERGENCY">Emergência</option>
              <option value="FOLLOW_UP">Retorno</option>
              <option value="PREVENTIVE">Preventiva</option>
            </select>
          </div>
          
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agendar Consulta
          </Button>
        </div>
      </div>

      {/* Lista de consultas */}
      <div className="grid gap-6">
        {consultations.map((consultation) => {
          const { date, time } = formatDateTime(consultation.scheduledDate)
          
          return (
            <div key={consultation.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-primary">
                        {consultation.patient.name}
                      </h3>
                      <span className={getStatusColor(consultation.status)}>
                        {getStatusText(consultation.status)}
                      </span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                        {getTypeText(consultation.type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
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
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{consultation.patient.phone}</span>
                      </div>
                    )}
                    
                    {consultation.description && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">
                          <strong className="text-primary">Motivo:</strong> {consultation.description}
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
                    </>
                  )}
                  
                  {consultation.status === 'IN_PROGRESS' && (
                    <Button
                      onClick={() => handleUpdateConsultation(consultation.id, 'complete')}
                      disabled={formLoading}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  )}
                  
                  {consultation.status === 'SCHEDULED' && (
                    <Button
                      onClick={() => handleUpdateConsultation(consultation.id, 'no-show', 'Paciente não compareceu')}
                      disabled={formLoading}
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-900/50 dark:hover:bg-orange-900/20"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Faltou
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => router.push(`/consultations/${consultation.id}`)}
                    variant="ghost"
                    size="sm"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Paginação */}
      {(pagination?.pages ?? 0) > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-center space-x-2">
            <Button
              disabled={(pagination?.page ?? 1) === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
              variant="outline"
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
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {consultations.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-muted-foreground mb-4">
            <Calendar className="h-12 w-12 mx-auto text-primary" />
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">
            Nenhuma consulta encontrada
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Tente ajustar os filtros ou pesquisar por outros termos.' 
              : 'Ainda não há consultas agendadas.'
            }
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agendar Primeira Consulta
          </Button>
        </div>
      )}

      {/* Formulário de consulta */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ConsultationForm
              // The ConsultationForm in this project expects patient prop and onSubmit/onCancel
              patient={editingConsultation ? editingConsultation.patient : null}
              onCancel={() => {
                setShowForm(false)
                setEditingConsultation(null)
              }}
              onSubmit={async (data: any) => {
                // If editingConsultation exists, call update endpoint; otherwise create
                if (editingConsultation) {
                  await fetch(`/api/consultations/${editingConsultation.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  })
                } else {
                  await fetch('/api/consultations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  })
                }
                setShowForm(false)
                setEditingConsultation(null)
                fetchConsultations()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}