'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/navigation/page-header'
import {
  FileText,
  Search,
  Plus,
  Calendar,
  User,
  Stethoscope,
  Filter,
  Eye,
  Edit
} from 'lucide-react'

interface MedicalRecord {
  id: string
  title: string
  description: string
  diagnosis?: string
  treatment?: string
  recordType: string
  severity: string
  createdAt: string
  updatedAt: string
  patient: {
    name: string
  }
  doctor: {
    name: string
    speciality?: string
  }
}

export default function MedicalRecordsPage() {
  const { data: _session } = useSession()
  const router = useRouter()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        type: filterType
      })

      const response = await fetch(`/api/medical-records?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar prontuários')

      const data = await response.json()
      setRecords(data.records || [])
      setTotalPages(Math.ceil((data.total || 0) / 10))
    } catch (error) {
      console.error('Erro ao buscar prontuários:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchRecords()
  }, [currentPage, filterType, searchTerm])
  const getSeverityColor = (severity: string) => {
    const colors = {
      'LOW': 'bg-green-100 text-green-800 border-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getRecordTypeLabel = (type: string) => {
    const labels = {
      'CONSULTATION': 'Consulta',
      'EXAM': 'Exame',
      'PRESCRIPTION': 'Prescrição',
      'DIAGNOSIS': 'Diagnóstico',
      'TREATMENT': 'Tratamento',
      'SURGERY': 'Cirurgia',
      'EMERGENCY': 'Emergência',
      'FOLLOW_UP': 'Acompanhamento'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getSeverityLabel = (severity: string) => {
    const labels = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    }
    return labels[severity as keyof typeof labels] || severity
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Prontuários Médicos"
        description="Gerencie registros médicos e documentação clínica"
        breadcrumbs={[
          { label: 'Prontuários Médicos' }
        ]}
        showBackButton={false}
        showHomeButton={true}
        actions={
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/records/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Prontuário
          </Button>
        }
      />

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título, diagnóstico, paciente ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="CONSULTATION">Consulta</option>
                <option value="EXAM">Exame</option>
                <option value="PRESCRIPTION">Prescrição</option>
                <option value="DIAGNOSIS">Diagnóstico</option>
                <option value="TREATMENT">Tratamento</option>
                <option value="EMERGENCY">Emergência</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Prontuários */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum prontuário encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Não há prontuários médicos correspondentes aos filtros aplicados.
              </p>
              <Button onClick={() => router.push('/records/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Prontuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {record.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {record.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={getSeverityColor(record.severity)}>
                          {getSeverityLabel(record.severity)}
                        </Badge>
                        <Badge variant="secondary">
                          {getRecordTypeLabel(record.recordType)}
                        </Badge>
                      </div>
                    </div>

                    {record.diagnosis && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-900">
                          <strong>Diagnóstico:</strong> {record.diagnosis}
                        </p>
                      </div>
                    )}

                    {record.treatment && (
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-sm text-green-900">
                          <strong>Tratamento:</strong> {record.treatment}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{record.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        <span>{record.doctor.name}</span>
                        {record.doctor.speciality && (
                          <span className="text-gray-400">
                            • {record.doctor.speciality}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/records/${record.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/records/${record.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
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
        </main>
      </div>
    </div>
  )
}
