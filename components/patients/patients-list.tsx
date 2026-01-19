'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, MoreVertical, Phone, Mail, Edit, Trash2, UserX, UserCheck } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import PatientForm from './patient-form'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  phone?: string
  email?: string
  lastConsultation?: {
    scheduledDate: string
    status: string
  }
  bloodType?: string
  allergies: string[]
  chronicDiseases: string[]
  isActive: boolean
  totalConsultations: number
  totalPrescriptions: number
  totalRecords: number
}

interface PatientsDataNewShape {
  patients: Patient[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Suporte ao formato antigo que a API devolvia anteriormente
interface PatientsDataLegacyShape {
  patients: Patient[]
  total?: number
  totalPages?: number
  currentPage?: number
  limit?: number
}

export function PatientsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  // Carregar pacientes
  const fetchPatients = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '10', isActive: 'true' })
      if (search) params.append('search', search)
      const response = await fetch(`/api/patients?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar pacientes')
      const raw = await response.json()
      console.log('[PatientsList] Raw /api/patients response:', raw)
      let patientsData: Patient[] = []
      let pageMeta = { page: 1, limit: 10, total: 0, pages: 0 }
      if (raw && Array.isArray(raw.patients) && raw.pagination) {
        patientsData = raw.patients
        pageMeta = {
          page: raw.pagination?.page || 1,
          limit: raw.pagination?.limit || 10,
          total: raw.pagination?.total || 0,
          pages: raw.pagination?.pages || 0
        }
      } else if (raw && Array.isArray(raw.patients) && (raw.totalPages !== undefined || raw.currentPage !== undefined)) {
        patientsData = raw.patients
        pageMeta = {
          page: raw.currentPage || 1,
          limit: raw.limit || 10,
          total: raw.total || raw.patients.length,
          pages: raw.totalPages || 0
        }
      } else {
        console.warn('[PatientsList] Formato inesperado de resposta /api/patients:', raw)
      }
      console.log('[PatientsList] Normalized pagination meta:', pageMeta)
      setPatients(patientsData)
      setPagination(pageMeta)
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
      setError('Erro ao carregar pacientes. Mostrando dados de exemplo.')
      
      // Fallback para dados estáticos
      setPatients([
        {
          id: '1',
          name: 'Maria Santos',
          age: 45,
          gender: 'Feminino',
          phone: '(11) 98765-4321',
          email: 'maria.santos@email.com',
          bloodType: 'A+',
          allergies: ['Penicilina'],
          chronicDiseases: ['Hipertensão'],
          isActive: true,
          totalConsultations: 5,
          totalPrescriptions: 3,
          totalRecords: 8
        },
        {
          id: '2',
          name: 'João Silva',
          age: 62,
          gender: 'Masculino',
          phone: '(11) 91234-5678',
          email: 'joao.silva@email.com',
          bloodType: 'O-',
          allergies: [],
          chronicDiseases: ['Diabetes Tipo 2'],
          isActive: true,
          totalConsultations: 12,
          totalPrescriptions: 8,
          totalRecords: 15
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients(currentPage, searchTerm)
  }, [currentPage])

  // Buscar pacientes com debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentPage === 1) {
        fetchPatients(1, searchTerm)
      } else {
        setCurrentPage(1)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  // Submeter formulário de paciente
  const handleSubmitPatient = async (data: any) => {
    try {
      setSubmitting(true)
      
      const url = editingPatient 
        ? `/api/patients/${editingPatient.id}`
        : '/api/patients'
      
      const method = editingPatient ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar paciente')
      }

      // Recarregar lista
      await fetchPatients(currentPage, searchTerm)
      
      // Fechar formulário
      setShowForm(false)
      setEditingPatient(null)
    } catch (error: any) {
      console.error('Erro ao salvar paciente:', error)
      alert(error.message || 'Erro ao salvar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  // Desativar paciente
  const handleDeactivatePatient = async (patient: Patient) => {
    if (!confirm(`Deseja realmente desativar o paciente ${patient.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'deactivate' })
      })

      if (!response.ok) {
        throw new Error('Erro ao desativar paciente')
      }

      // Recarregar lista
      await fetchPatients(currentPage, searchTerm)
    } catch (error) {
      console.error('Erro ao desativar paciente:', error)
      alert('Erro ao desativar paciente')
    }
  }

  const getStatusColor = (patient: Patient) => {
    if (!patient.isActive) return 'status-inactive'
    if (patient.chronicDiseases && patient.chronicDiseases.length > 0) return 'status-emergency'
    return 'status-active'
  }

  const getStatusText = (patient: Patient) => {
    if (!patient.isActive) return 'Inativo'
    if (patient.lastConsultation) {
      const days = Math.floor((Date.now() - new Date(patient.lastConsultation.scheduledDate).getTime()) / (1000 * 60 * 60 * 24))
      if (days > 90) return 'Paciente antigo'
      if (days > 30) return 'Acompanhamento'
      return 'Ativo'
    }
    return 'Novo paciente'
  }

  // Before rendering pagination, ensure pagination is defined
  const totalPagesSafe = pagination?.pages ?? 0

  return (
    <div className="space-y-6">
      {/* Filtros e ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
        <Button 
          variant="medical"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Banner de erro se houver */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
        </div>
      )}

      {/* Lista de pacientes */}
      {!loading && patients && patients.length > 0 && (
        <div className="grid gap-6">
          {patients.map((patient) => (
          <Card key={patient.id} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-medical-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {patient.name ? patient.name.split(' ').map(n => n[0]).join('') : '??'}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.name}
                      </h3>
                      <span className={`${getStatusColor(patient)}`}>
                        {getStatusText(patient)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>{patient.age} anos • {patient.gender}</span>
                      <span>Tipo sanguíneo: {patient.bloodType || 'N/A'}</span>
                      <span>
                        Última consulta: {
                          patient.lastConsultation 
                            ? new Date(patient.lastConsultation.scheduledDate).toLocaleDateString('pt-BR')
                            : 'Nunca'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      {patient.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{patient.phone}</span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{patient.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {patient.totalConsultations} consultas • {patient.totalPrescriptions} prescrições • {patient.totalRecords} registros
                      </span>
                    </div>
                    
                    {patient.allergies && patient.allergies.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-red-600 font-medium">
                          Alergias: {patient.allergies.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingPatient(patient)
                      setShowForm(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    Ver Prontuário
                  </Button>
                  <Button 
                    variant="medical" 
                    size="sm"
                    onClick={() => {
                      // Redirecionar para a página de consultas com o paciente selecionado
                      window.location.href = `/consultations?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`
                    }}
                  >
                    Nova Consulta
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeactivatePatient(patient)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {!loading && (!patients || patients.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum paciente encontrado
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Tente ajustar a busca ou adicionar um novo paciente.'
                : 'Ainda não há pacientes cadastrados. Adicione o primeiro paciente.'
              }
            </p>
            <Button 
              variant="medical" 
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Paciente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paginação */}
  {!loading && totalPagesSafe > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-gray-600">
            Página {pagination?.page ?? 1} de {totalPagesSafe} ({pagination?.total ?? patients.length} pacientes)
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPagesSafe || totalPagesSafe === 0}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Formulário de paciente */}
      {showForm && (
        <PatientForm
          patient={editingPatient}
          onSubmit={handleSubmitPatient}
          onCancel={() => {
            setShowForm(false)
            setEditingPatient(null)
          }}
          loading={submitting}
        />
      )}
    </div>
  )
}
