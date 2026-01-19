'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Filter, ArrowLeft, User, Phone, Mail, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  cpf: string
  email?: string
  phone: string
  birth_date: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  created_at: string
}

export default function PatientSearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    gender: '',
    ageRange: '',
    sortBy: 'name'
  })

  const searchPatients = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        search: searchTerm,
        ...(filters.gender && { gender: filters.gender }),
        ...(filters.ageRange && { ageRange: filters.ageRange }),
        sortBy: filters.sortBy
      })

      const response = await fetch(`/api/patients?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setPatients(data)
      }
    } catch (error) {
      console.error('Erro na busca:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPatients()
    }
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getGenderLabel = (gender: string) => {
    const labels = {
      'MALE': 'Masculino',
      'FEMALE': 'Feminino',
      'OTHER': 'Outro'
    }
    return labels[gender as keyof typeof labels] || gender
  }

  const getGenderColor = (gender: string) => {
    const colors = {
      'MALE': 'bg-blue-100 text-blue-800',
      'FEMALE': 'bg-pink-100 text-pink-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    }
    return colors[gender as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
            <h1 className="text-2xl font-bold text-gray-900">Busca Avançada de Pacientes</h1>
            <p className="text-sm text-gray-500">Pesquisar pacientes com filtros específicos</p>
          </div>
        </div>
      </div>

      {/* Filtros de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Pesquisa</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campo de Busca Principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por Nome, CPF ou Email
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite nome, CPF ou email do paciente..."
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={searchPatients}
                disabled={loading || !searchTerm.trim()}
                className="flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>{loading ? 'Buscando...' : 'Buscar'}</span>
              </Button>
            </div>
          </div>

          {/* Filtros Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gênero
              </label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Faixa Etária
              </label>
              <select
                value={filters.ageRange}
                onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as idades</option>
                <option value="0-17">0-17 anos</option>
                <option value="18-30">18-30 anos</option>
                <option value="31-50">31-50 anos</option>
                <option value="51-70">51-70 anos</option>
                <option value="70+">70+ anos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Nome</option>
                <option value="birth_date">Data de Nascimento</option>
                <option value="created_at">Data de Cadastro</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {patients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Resultados da Pesquisa</span>
              </div>
              <Badge variant="secondary">
                {patients.length} paciente{patients.length !== 1 ? 's' : ''} encontrado{patients.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                          <p className="text-sm text-gray-500">ID: {patient.id}</p>
                        </div>
                        <Badge className={getGenderColor(patient.gender)}>
                          {getGenderLabel(patient.gender)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{patient.phone}</span>
                        </div>
                        
                        {patient.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{patient.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(patient.birth_date)} ({calculateAge(patient.birth_date)} anos)</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        CPF: {patient.cpf} • Cadastrado em: {formatDate(patient.created_at)}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/patients/${patient.id}`}>
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
          <div className="text-sm text-gray-600 space-y-2">
            <p>• <strong>Nome:</strong> Digite qualquer parte do nome do paciente</p>
            <p>• <strong>CPF:</strong> Digite os números do CPF (com ou sem pontuação)</p>
            <p>• <strong>Email:</strong> Digite o email completo ou parte dele</p>
            <p>• <strong>Filtros:</strong> Combine filtros para refinar sua busca</p>
            <p>• <strong>Resultados:</strong> Clique em "Ver Detalhes" para acessar o prontuário completo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
