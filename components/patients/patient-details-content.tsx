'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PatientDevelopment } from '@/components/patients/patient-development'
import { PatientQuestionnaires } from '@/components/patients/patient-questionnaires'
import {
  User,
  FileText,
  Pill,
  TestTube,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Heart,
  Activity,
  ClipboardList,
  Send,
} from 'lucide-react'

interface Consultation {
  id: string
  scheduledDate: Date
  assessment?: string | null
  notes?: string | null
}

interface Prescription {
  id: string
  createdAt: Date
  status: string
}

interface ExamRequest {
  id: string
  createdAt: Date
  status: string
}

interface Patient {
  id: string
  name: string
  cpf?: string | null
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  gender?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  bloodType?: string | null
  allergies?: string | null
  observations?: string | null
  createdAt: Date
  consultations: Consultation[]
  prescriptions: Prescription[]
  ExamRequest: ExamRequest[]
}

interface PatientDetailsContentProps {
  patient: Patient
}

export function PatientDetailsContent({ patient }: PatientDetailsContentProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const calculateAge = (birthDate: Date | null | undefined) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(patient.birthDate)

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Consultas</span>
          </TabsTrigger>
          <TabsTrigger value="questionnaires" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Questionários</span>
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <span className="hidden sm:inline">Receitas</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">Exames</span>
          </TabsTrigger>
          <TabsTrigger value="development" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Desenvolvimento</span>
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">CPF</p>
                    <p className="font-medium">{patient.cpf || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data de Nascimento</p>
                    <p className="font-medium">
                      {patient.birthDate 
                        ? `${new Date(patient.birthDate).toLocaleDateString('pt-BR')} (${age} anos)`
                        : 'Não informado'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gênero</p>
                    <p className="font-medium">{patient.gender || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo Sanguíneo</p>
                    <p className="font-medium">{patient.bloodType || 'Não informado'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p>{patient.phone || 'Telefone não informado'}</p>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p>{patient.email || 'Email não informado'}</p>
                  </div>
                  {(patient.address || patient.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <p>
                        {[patient.address, patient.city, patient.state, patient.zipCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações Médicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Informações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.allergies ? (
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Alergias
                    </p>
                    <p className="font-medium text-red-600">{patient.allergies}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Alergias</p>
                    <p className="text-gray-400">Nenhuma alergia registrada</p>
                  </div>
                )}

                {patient.observations && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">Observações</p>
                    <p className="mt-1">{patient.observations}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Resumo</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-600">
                        {patient.consultations.length}
                      </p>
                      <p className="text-xs text-gray-500">Consultas</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-xl font-bold text-green-600">
                        {patient.prescriptions.length}
                      </p>
                      <p className="text-xs text-gray-500">Receitas</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <p className="text-xl font-bold text-purple-600">
                        {patient.ExamRequest.length}
                      </p>
                      <p className="text-xs text-gray-500">Exames</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-600" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>
                  Envie questionários e materiais para o paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/questionnaires?patientId=${patient.id}`}>
                      <ClipboardList className="h-6 w-6 text-emerald-600" />
                      <span className="text-sm">Enviar Questionário</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/consultations/new?patientId=${patient.id}`}>
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <span className="text-sm">Agendar Consulta</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/prescriptions/new?patientId=${patient.id}`}>
                      <Pill className="h-6 w-6 text-amber-600" />
                      <span className="text-sm">Nova Receita</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/exams/new?patientId=${patient.id}`}>
                      <TestTube className="h-6 w-6 text-purple-600" />
                      <span className="text-sm">Solicitar Exame</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Consultas */}
        <TabsContent value="consultations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Histórico de Consultas</CardTitle>
                <Button asChild>
                  <a href={`/consultations?patientId=${patient.id}`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Nova Consulta
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {patient.consultations.length > 0 ? (
                <div className="space-y-3">
                  {patient.consultations.map((consultation) => (
                    <div
                      key={consultation.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {new Date(consultation.scheduledDate).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge variant="outline">
                          {new Date(consultation.scheduledDate).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      </div>
                      {consultation.assessment && (
                        <p className="text-sm text-gray-600">
                          <strong>Avaliação:</strong> {consultation.assessment}
                        </p>
                      )}
                      {consultation.notes && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {consultation.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma consulta registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receitas */}
        <TabsContent value="prescriptions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Receitas Médicas</CardTitle>
                <Button asChild>
                  <a href={`/prescriptions?patientId=${patient.id}`}>
                    <Pill className="h-4 w-4 mr-2" />
                    Nova Receita
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {patient.prescriptions.length > 0 ? (
                <div className="space-y-3">
                  {patient.prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge 
                          variant={prescription.status === 'ACTIVE' ? 'default' : 'secondary'}
                        >
                          {prescription.status === 'ACTIVE' ? 'Ativa' : prescription.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Pill className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma receita registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exames */}
        <TabsContent value="exams" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exames Solicitados</CardTitle>
                <Button asChild>
                  <a href={`/exams?patientId=${patient.id}`}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Novo Exame
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {patient.ExamRequest.length > 0 ? (
                <div className="space-y-3">
                  {patient.ExamRequest.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge 
                          variant={exam.status === 'PENDING' ? 'outline' : 'default'}
                        >
                          {exam.status === 'PENDING' ? 'Pendente' : exam.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TestTube className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum exame solicitado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questionários */}
        <TabsContent value="questionnaires" className="mt-6">
          <PatientQuestionnaires patientId={patient.id} />
        </TabsContent>

        {/* Desenvolvimento */}
        <TabsContent value="development" className="mt-6">
          <PatientDevelopment 
            patientId={patient.id}
            patientName={patient.name}
            patientEmail={patient.email || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
