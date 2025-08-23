'use client'

import { useState } from 'react'
import { Search, Plus, Filter, MoreVertical, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  phone: string
  email: string
  lastVisit: string
  status: 'active' | 'inactive' | 'emergency'
  bloodType: string
  allergies: string[]
}

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Maria Santos',
    age: 45,
    gender: 'Feminino',
    phone: '(11) 98765-4321',
    email: 'maria.santos@email.com',
    lastVisit: '2024-08-20',
    status: 'active',
    bloodType: 'A+',
    allergies: ['Penicilina']
  },
  {
    id: '2',
    name: 'João Silva',
    age: 62,
    gender: 'Masculino',
    phone: '(11) 91234-5678',
    email: 'joao.silva@email.com',
    lastVisit: '2024-08-18',
    status: 'emergency',
    bloodType: 'O-',
    allergies: []
  },
  {
    id: '3',
    name: 'Ana Costa',
    age: 34,
    gender: 'Feminino',
    phone: '(11) 95555-1234',
    email: 'ana.costa@email.com',
    lastVisit: '2024-08-15',
    status: 'active',
    bloodType: 'B+',
    allergies: ['Látex', 'Aspirina']
  }
]

export function PatientsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients] = useState<Patient[]>(mockPatients)

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active'
      case 'emergency':
        return 'status-emergency'
      case 'inactive':
        return 'status-pending'
      default:
        return 'status-pending'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'emergency':
        return 'Emergência'
      case 'inactive':
        return 'Inativo'
      default:
        return 'Inativo'
    }
  }

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
        <Button variant="medical">
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Lista de pacientes */}
      <div className="grid gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-medical-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.name}
                      </h3>
                      <span className={`${getStatusColor(patient.status)}`}>
                        {getStatusText(patient.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>{patient.age} anos • {patient.gender}</span>
                      <span>Tipo sanguíneo: {patient.bloodType}</span>
                      <span>Última consulta: {patient.lastVisit}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{patient.phone}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{patient.email}</span>
                      </div>
                    </div>
                    
                    {patient.allergies.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-red-600 font-medium">
                          Alergias: {patient.allergies.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Prontuário
                  </Button>
                  <Button variant="outline" size="sm">
                    Nova Consulta
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum paciente encontrado
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou adicionar um novo paciente.
            </p>
            <Button variant="medical" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Paciente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
