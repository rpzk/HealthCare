'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Plus, Phone, Mail, Edit, UserX, Users, 
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Stethoscope
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import PatientForm, { type PatientFormData } from './patient-form'
import { PatientDetailsContent } from './patient-details-content'

interface Patient {
  id: string
  name: string
  age?: number
  gender?: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  bloodType?: string | null
  allergies?: string | null
  stats?: {
    totalConsultations?: number
    totalPrescriptions?: number
    totalRecords?: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const getInitials = (name?: string | null): string => {
  if (!name) return '??'
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??'
}

const parseAllergies = (allergies?: string | null): string[] => {
  if (!allergies) return []
  if (typeof allergies === 'string') {
    try {
      const parsed = JSON.parse(allergies)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return allergies.split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  return []
}

export function PatientsList() {
  const router = useRouter()

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })

  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Partial<PatientFormData> & { userAccount?: { id?: string; role?: string } } | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientToDeactivate, setPatientToDeactivate] = useState<Patient | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [defaultTab, setDefaultTab] = useState('overview')

  const fetchPatients = async (page: number, search: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ page: String(page), limit: '10', isActive: 'true' })
      if (search) params.set('search', search)

      const response = await fetch(`/api/patients?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar pacientes')

      const data = await response.json()
      const list = data.patients || []
      const pag = data.pagination || { page: 1, limit: 10, total: list.length, pages: Math.ceil(list.length / 10) }

      setPatients(list)
      setPagination(pag)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Erro desconhecido')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients(currentPage, searchTerm)
  }, [currentPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchPatients(1, searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleEditPatient = async (patient: Patient) => {
    try {
      setFormLoading(true)
      const response = await fetch(`/api/patients/${patient.id}?edit=true`)
      if (!response.ok) throw new Error('Erro ao carregar dados')
      const fullData = await response.json()
      setEditingPatient(fullData)
      setShowForm(true)
    } catch {
      alert('Erro ao carregar dados do paciente')
    } finally {
      setFormLoading(false)
    }
  }

  const handleSubmitPatient = async (data: PatientFormData) => {
    try {
      setFormLoading(true)
      const isEditing = !!editingPatient?.id
      const url = isEditing ? `/api/patients/${editingPatient.id}` : '/api/patients'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar')
      }

      setShowForm(false)
      setEditingPatient(null)
      fetchPatients(currentPage, searchTerm)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert(message || 'Erro ao salvar paciente')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeactivatePatient = async () => {
    if (!patientToDeactivate) return
    try {
      const response = await fetch(`/api/patients/${patientToDeactivate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' })
      })
      if (!response.ok) throw new Error('Erro ao desativar')
      setPatientToDeactivate(null)
      fetchPatients(currentPage, searchTerm)
    } catch {
      alert('Erro ao desativar paciente')
    }
  }

  const openPatientDetails = (patient: Patient, tab = 'overview') => {
    setDefaultTab(tab)
    setSelectedPatient(patient)
  }

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Falha ao carregar pacientes</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={() => fetchPatients(currentPage, searchTerm)} className="mt-4" variant="outline">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingPatient(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum paciente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const allergies = parseAllergies(patient.allergies)
            const stats = patient.stats || {}
            
            return (
              <Card key={patient.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPatientDetails(patient)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{patient.name}</h3>
                        {patient.age && <Badge variant="secondary" className="text-xs">{patient.age} anos</Badge>}
                        {patient.bloodType && <Badge variant="outline" className="text-xs text-red-600 border-red-200">{patient.bloodType}</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                        {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{patient.phone}</span>}
                        {patient.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{patient.email}</span>}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{stats.totalConsultations || 0} consultas</span>
                        <span>{stats.totalPrescriptions || 0} prescrições</span>
                        <span>{stats.totalRecords || 0} registros</span>
                      </div>

                      {allergies.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-red-600 font-medium">⚠️ Alergias: {allergies.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPatient(patient)} disabled={formLoading}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPatientDetails(patient, 'care-team')} className="text-purple-600 hover:text-purple-700" title="Equipe">
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/consultations?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`)} className="text-green-600 hover:text-green-700" title="Nova Consulta">
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPatientToDeactivate(patient)} className="text-red-600 hover:text-red-700" title="Desativar">
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-gray-600">Página {pagination.page} de {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= pagination.pages} onClick={() => setCurrentPage(p => p + 1)}>
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {showForm && (
        <PatientForm
          patient={editingPatient ?? undefined}
          onSubmit={handleSubmitPatient}
          onCancel={() => { setShowForm(false); setEditingPatient(null) }}
          loading={formLoading}
        />
      )}

      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient?.name}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientDetailsContent patient={selectedPatient} onClose={() => setSelectedPatient(null)} defaultTab={defaultTab} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!patientToDeactivate} onOpenChange={(open) => !open && setPatientToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar <strong>{patientToDeactivate?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivatePatient} className="bg-red-600 hover:bg-red-700">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
