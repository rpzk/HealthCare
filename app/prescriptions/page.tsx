'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Pill,
  Search,
  Plus,
  Calendar,
  User,
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit
} from 'lucide-react'

interface Prescription {
  id: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  status: string
  startDate: string
  endDate?: string
  createdAt: string
  patient: {
    name: string
  }
  doctor: {
    name: string
    speciality?: string
  }
}

export default function PrescriptionsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchPrescriptions()
  }, [currentPage, filterStatus, searchTerm])

  const fetchPrescriptions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        status: filterStatus
      })

      const response = await fetch(`/api/prescriptions?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar prescrições')

  const data = await response.json()
  setPrescriptions(data.prescriptions || [])
  const total = (data.pagination?.total ?? data.total ?? 0) as number
  setTotalPages(Math.ceil(total / 10))
    } catch (error) {
      console.error('Erro ao buscar prescrições:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800 border-green-200',
      'COMPLETED': 'bg-blue-100 text-blue-800 border-blue-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'EXPIRED': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'ACTIVE': <Clock className="h-4 w-4" />,
      'COMPLETED': <CheckCircle className="h-4 w-4" />,
      'CANCELLED': <XCircle className="h-4 w-4" />,
      'EXPIRED': <AlertCircle className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'ACTIVE': 'Ativa',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'EXPIRED': 'Expirada'
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Prescrições Médicas"
            description="Gerencie prescrições e medicamentos"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Prescrições', href: '/prescriptions' }
            ]}
            actions={(
              <Button onClick={() => router.push('/prescriptions/new')} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Prescrição
              </Button>
            )}
          />

          <div className="space-y-6">

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por medicamento, paciente ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="CANCELLED">Canceladas</option>
              <option value="EXPIRED">Expiradas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Prescrições */}
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
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma prescrição encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Não há prescrições correspondentes aos filtros aplicados.
              </p>
              <Button onClick={() => router.push('/prescriptions/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Prescrição
              </Button>
            </CardContent>
          </Card>
        ) : (
          prescriptions.map((prescription) => {
            const meds = (prescription as any).medications as Array<any> | undefined
            const main = meds && meds.length > 0 ? meds[0] : undefined
            const medName = main?.name || 'Medicamentos'
            const medDosage = main?.dosage || '-'
            const medFrequency = main?.frequency || '-'
            const medDuration = main?.duration || '-'
            const instructions = main?.instructions
            return (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                          <Pill className="h-5 w-5 text-green-600" />
                          {medName}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Dosagem:</strong> {medDosage}</p>
                          <p><strong>Frequência:</strong> {medFrequency}</p>
                          <p><strong>Duração:</strong> {medDuration}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(prescription.status)}`}
                      >
                        {getStatusIcon(prescription.status)}
                        {getStatusLabel(prescription.status)}
                      </Badge>
                    </div>

                    {instructions && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-900">
                          <strong>Instruções:</strong> {instructions}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{prescription.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        <span>{prescription.doctor.name}</span>
                        {prescription.doctor.speciality && (
                          <span className="text-gray-400">
                            • {prescription.doctor.speciality}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Início: {new Date(prescription.startDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {prescription.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Fim: {new Date(prescription.endDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/prescriptions/${prescription.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/prescriptions/${prescription.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})
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
        </main>
      </div>
    </div>
  )
}
