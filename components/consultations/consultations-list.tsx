"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Plus, Calendar, Clock, User, Play, CheckCircle, XCircle, UserX, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/navigation/page-header'
import { SearchFilter } from '@/components/search/search-filter'
import { ConsultationForm } from './consultation-form'
import { logger } from '@/lib/logger'

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
  const searchParamsString = searchParams?.toString() || ''
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

  const fetchConsultations = useCallback(async () => {
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

      const urlParams = new URLSearchParams(searchParamsString)
      const urlPatientId = urlParams.get('patientId') || undefined
      const urlDate = urlParams.get('date') || undefined
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
    } catch (err) {
      const error = err as Error
      logger.error('Erro ao buscar consultas:', error)
      setError(error.message || 'Erro ao carregar consultas')
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.page, searchParamsString, searchTerm, statusFilter, typeFilter])

  useEffect(() => {
    void fetchConsultations()
  }, [fetchConsultations])

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
    } catch (err) {
      const error = err as Error
      logger.error(`Erro ao ${action} consulta:`, error)
      setError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    // ...formatação de data...
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20'
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20'
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'NO_SHOW':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
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
      <>
        <PageHeader
          title="Consultas"
          description="Gerencie todas as consultas médicas do sistema"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Consultas', href: '/consultations' }
          ]}
          actions={<Button disabled><Plus className="h-4 w-4 mr-2" />Nova Consulta</Button>}
        />
        <div className="grid gap-4 mt-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultas"
        description="Gerencie todas as consultas médicas do sistema"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Consultas', href: '/consultations' }
        ]}
        actions={
          <Button onClick={() => { setEditingConsultation(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        }
      />

      {/* Banner de erro se houver */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button onClick={fetchConsultations} variant="outline" size="sm">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: [
              { label: 'Todos os status', value: 'all' },
              { label: 'Agendadas', value: 'SCHEDULED' },
              { label: 'Em andamento', value: 'IN_PROGRESS' },
              { label: 'Concluídas', value: 'COMPLETED' },
              { label: 'Canceladas', value: 'CANCELLED' },
              { label: 'Faltaram', value: 'NO_SHOW' }
            ]
          },
          {
            name: 'type',
            label: 'Tipo',
            options: [
              { label: 'Todos os tipos', value: 'all' },
              { label: 'Rotina', value: 'ROUTINE' },
              { label: 'Urgente', value: 'URGENT' },
              { label: 'Emergência', value: 'EMERGENCY' },
              { label: 'Retorno', value: 'FOLLOW_UP' },
              { label: 'Preventiva', value: 'PREVENTIVE' }
            ]
          }
        ]}
        filterValues={{ status: statusFilter, type: typeFilter }}
        onFilterChange={(name, value) => {
          if (name === 'status') setStatusFilter(value)
          if (name === 'type') setTypeFilter(value)
        }}
        onClear={() => {
          setSearchTerm('')
          setStatusFilter('all')
          setTypeFilter('all')
        }}
        loading={loading}
        placeholder="Buscar consultas..."
      />

      {/* Lista de consultas ou Empty State */}
      {consultations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma consulta encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Não há consultas correspondentes aos filtros aplicados.'
                : 'Comece agendando sua primeira consulta médica.'}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'Nova' : 'Primeira'} Consulta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {consultations.map((consultation) => {
              const { date, time } = formatDateTime(consultation.scheduledDate)
              return (
                <Card 
                  key={consultation.id} 
                  className="hover:shadow-md transition-all duration-300 cursor-pointer"
                  onClick={() => router.push(`/consultations/${consultation.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {consultation.patient.name}
                            </h3>
                            <Badge variant="outline" className={getStatusColor(consultation.status)}>
                              {getStatusText(consultation.status)}
                            </Badge>
                            <Badge variant="secondary">
                              {getTypeText(consultation.type)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground flex-wrap">
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
                          
                          {consultation.description && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                <strong>Motivo:</strong> {consultation.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {consultation.status === 'SCHEDULED' && (
                          <Button
                            onClick={() => handleUpdateConsultation(consultation.id, 'start')}
                            disabled={formLoading}
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        
                        {consultation.status === 'IN_PROGRESS' && (
                          <Button
                            onClick={() => handleUpdateConsultation(consultation.id, 'complete')}
                            disabled={formLoading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
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
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
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
            <div className="flex justify-center items-center gap-2">
              <Button
                disabled={(pagination?.page ?? 1) === 1 || loading}
                onClick={() => setPagination(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Página {pagination?.page ?? 1} de {pagination?.pages ?? 0}
              </span>
              <Button
                disabled={(pagination?.page ?? 1) === (pagination?.pages ?? 0) || loading}
                onClick={() => setPagination(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                variant="outline"
                size="sm"
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* Formulário de consulta */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-primary">
                  {editingConsultation ? 'Editar Consulta' : 'Nova Consulta'}
                </h2>
                <Button
                  onClick={() => {
                    setShowForm(false)
                    setEditingConsultation(null)
                  }}
                  variant="ghost"
                  size="icon"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ConsultationForm
                patient={editingConsultation?.patient}
                onSubmit={async (data: any) => {
                  try {
                    // Criar a consulta via API
                    const response = await fetch('/api/consultations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    })
                    
                    if (!response.ok) {
                      const error = await response.json()
                      throw new Error(error.error || 'Erro ao criar consulta')
                    }
                    
                    const result = await response.json()
                    
                    setShowForm(false)
                    setEditingConsultation(null)
                    
                    // Se a consulta foi iniciada imediatamente (IN_PROGRESS), redireciona para a sala
                    if (data.status === 'IN_PROGRESS' && result.consultation?.id) {
                      router.push(`/consultations/${result.consultation.id}`)
                    } else {
                      fetchConsultations()
                    }
                  } catch (error) {
                    const err = error as Error
                    logger.error('Erro ao criar consulta:', err)
                    throw err
                  }
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