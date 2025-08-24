'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Stethoscope, Save, ArrowLeft, Calendar, User, Clock } from 'lucide-react'

export default function NewConsultationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_name: '',
    specialty: '',
    consultation_date: '',
    consultation_time: '',
    type: 'ROUTINE' as 'ROUTINE' | 'EMERGENCY' | 'FOLLOW_UP' | 'FIRST_TIME',
    reason: '',
    notes: '',
    duration: '30'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Combinar data e hora
      const dateTime = new Date(`${formData.consultation_date}T${formData.consultation_time}`).toISOString()
      
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: formData.patient_id,
          doctor_name: formData.doctor_name,
          specialty: formData.specialty,
          consultation_date: dateTime,
          type: formData.type,
          reason: formData.reason,
          notes: formData.notes,
          status: 'SCHEDULED'
        })
      })

      if (response.ok) {
        router.push('/consultations')
      } else {
        throw new Error('Erro ao agendar consulta')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao agendar consulta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const specialties = [
    'Clínica Geral',
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Neurologia',
    'Oftalmologia',
    'Ortopedia',
    'Otorrinolaringologia',
    'Pediatria',
    'Psiquiatria',
    'Urologia',
    'Outras'
  ]

  const consultationTypes = [
    { value: 'FIRST_TIME', label: 'Primeira Consulta' },
    { value: 'ROUTINE', label: 'Consulta de Rotina' },
    { value: 'FOLLOW_UP', label: 'Retorno' },
    { value: 'EMERGENCY', label: 'Emergência' }
  ]

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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Stethoscope className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agendar Consulta</h1>
            <p className="text-sm text-gray-500">Criar novo agendamento médico</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Consulta</CardTitle>
          <CardDescription>
            Preencha as informações para agendar a consulta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paciente e Médico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="inline h-4 w-4 mr-1" />
                  ID do Paciente *
                </label>
                <Input
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleChange}
                  placeholder="Digite o ID do paciente"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Consulte a lista de pacientes para obter o ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Médico *
                </label>
                <Input
                  name="doctor_name"
                  value={formData.doctor_name}
                  onChange={handleChange}
                  placeholder="Nome completo do médico"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidade *
                </label>
                <select
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Selecione a especialidade</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Consulta
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {consultationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Data da Consulta *
                </label>
                <Input
                  name="consultation_date"
                  type="date"
                  value={formData.consultation_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Horário *
                </label>
                <Input
                  name="consultation_time"
                  type="time"
                  value={formData.consultation_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (minutos)
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h 30min</option>
                </select>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Consulta *
              </label>
              <Textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Descreva o motivo da consulta, sintomas relatados, exames de acompanhamento..."
                rows={3}
                required
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações Adicionais
              </label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Observações especiais, medicações em uso, alergias relevantes..."
                rows={3}
              />
            </div>

            {/* Informações */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">Lembretes</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Confirme a disponibilidade do médico antes de agendar</li>
                    <li>• Para emergências, utilize os canais de urgência</li>
                    <li>• O paciente receberá confirmação por email/SMS</li>
                    <li>• Reagendamentos devem ser feitos com 24h de antecedência</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Agendando...' : 'Agendar Consulta'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
