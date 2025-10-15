'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Search, Calendar, User, ArrowLeft, Filter, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MedicalRecord {
  id: string
  patient: {
    id: string
    name: string
    cpf: string
  }
  record_type: string
  title: string
  diagnosis?: string
  symptoms?: string
  treatment?: string
  doctor_name: string
  created_at: string
}

export default function RecordsSearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    recordType: '',
    dateRange: '',
    doctorName: '',
    patientName: ''
  })

  const searchRecords = async () => {
    if (!searchTerm.trim() && !filters.recordType && !filters.dateRange && !filters.doctorName && !filters.patientName) {
      alert('Por favor, preencha pelo menos um campo de busca')
      return
    }

    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      if (filters.recordType) queryParams.append('type', filters.recordType)
      if (filters.dateRange) queryParams.append('dateRange', filters.dateRange)
      if (filters.doctorName) queryParams.append('doctor', filters.doctorName)
      if (filters.patientName) queryParams.append('patient', filters.patientName)

      const response = await fetch(`/api/medical-records?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data)
      } else {
        throw new Error('Erro na busca')
      }
    } catch (error) {
      console.error('Erro na busca:', error)
      alert('Erro ao buscar registros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchRecords()
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    setFilters({
      recordType: '',
      dateRange: '',
      doctorName: '',
      patientName: ''
    })
    setRecords([])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getRecordTypeLabel = (type: string) => {
    const labels = {
      'CONSULTATION': 'Consulta',
      'EXAM': 'Exame',
      'PROCEDURE': 'Procedimento',
      'PRESCRIPTION': 'Prescrição',
      'OTHER': 'Outro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getRecordTypeColor = (type: string) => {
    const colors = {
      'CONSULTATION': 'bg-blue-100 text-blue-800',
      'EXAM': 'bg-green-100 text-green-800',
      'PROCEDURE': 'bg-purple-100 text-purple-800',
      'PRESCRIPTION': 'bg-orange-100 text-orange-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <Search className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buscar Prontuários</h1>
            <p className="text-sm text-gray-500">Pesquisa avançada em registros médicos</p>
          </div>
        </div>
      </div>

      {/* Formulário de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Busca</span>
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para refinar sua busca nos prontuários médicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campo de Busca Principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Busca Geral
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite diagnóstico, sintomas, tratamento ou observações..."
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={searchRecords}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>{loading ? 'Buscando...' : 'Buscar'}</span>
              </Button>
            </div>
          </div>

          {/* Filtros Específicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Registro
              </label>
              <select
                value={filters.recordType}
                onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option value="CONSULTATION">Consulta</option>
                <option value="EXAM">Exame</option>
                <option value="PROCEDURE">Procedimento</option>
                <option value="PRESCRIPTION">Prescrição</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Paciente
              </label>
              <Input
                value={filters.patientName}
                onChange={(e) => setFilters(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="Nome do paciente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Médico Responsável
              </label>
              <Input
                value={filters.doctorName}
                onChange={(e) => setFilters(prev => ({ ...prev, doctorName: e.target.value }))}
                placeholder="Nome do médico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os períodos</option>
                <option value="today">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="90days">Últimos 3 meses</option>
                <option value="1year">Último ano</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={clearSearch}
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={searchRecords}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Buscar com Filtros</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Busca */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Resultados da Busca</span>
              </div>
              <Badge variant="secondary">
                {records.length} registro{records.length !== 1 ? 's' : ''} encontrado{records.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                          <p className="text-sm text-gray-500">
                            {record.patient.name} • CPF: {record.patient.cpf}
                          </p>
                        </div>
                        <Badge className={getRecordTypeColor(record.record_type)}>
                          {getRecordTypeLabel(record.record_type)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>Dr(a). {record.doctor_name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(record.created_at)}</span>
                        </div>
                      </div>

                      {/* Conteúdo do Registro */}
                      <div className="space-y-2 text-sm">
                        {record.diagnosis && (
                          <div>
                            <span className="font-medium text-gray-700">Diagnóstico: </span>
                            <span className="text-gray-600">{record.diagnosis}</span>
                          </div>
                        )}
                        
                        {record.symptoms && (
                          <div>
                            <span className="font-medium text-gray-700">Sintomas: </span>
                            <span className="text-gray-600">{record.symptoms}</span>
                          </div>
                        )}
                        
                        {record.treatment && (
                          <div>
                            <span className="font-medium text-gray-700">Tratamento: </span>
                            <span className="text-gray-600">{record.treatment}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/records/${record.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dicas de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dicas de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Busca por Conteúdo</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use palavras-chave específicas</li>
                <li>• Pesquise por diagnósticos ou sintomas</li>
                <li>• Combine múltiplos termos para refinar</li>
                <li>• Use aspas para frases exatas</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Filtros Avançados</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Combine filtros para resultados precisos</li>
                <li>• Use períodos específicos</li>
                <li>• Filtre por tipo de registro</li>
                <li>• Busque por médico ou paciente específico</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado vazio */}
      {records.length === 0 && !loading && (searchTerm || Object.values(filters).some(f => f)) && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">Nenhum registro encontrado</p>
            <p className="text-sm text-gray-400 mb-4">
              Tente ajustar os filtros ou usar outros termos de busca
            </p>
            <Button onClick={clearSearch} variant="outline">
              Limpar Busca
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
