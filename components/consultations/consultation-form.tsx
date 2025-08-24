'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, FileText, X, AlertCircle } from 'lucide-react'

interface Patient {
  id: string
  name: string
  age: number
  phone?: string
  email?: string
}

interface Doctor {
  id: string
  name: string
  specialty: string
  crmNumber: string
}

interface AvailableSlot {
  time: string
  displayTime: string
}

interface ConsultationFormProps {
  patient?: Patient | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ConsultationForm({ 
  patient, 
  onSubmit, 
  onCancel, 
  loading = false 
}: ConsultationFormProps) {
  const [formData, setFormData] = useState({
    patientId: patient?.id || '',
    doctorId: 'cmeokjwn60000re2t8uldf5d5', // TODO: Pegar do contexto do usuário logado
    scheduledDate: '',
    scheduledTime: '',
    type: 'ROUTINE' as const,
    description: '',
    notes: '',
    duration: 60
  })

  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')

  // Carregar pacientes se não foi fornecido
  useEffect(() => {
    if (!patient) {
      fetchPatients()
    }
  }, [patient])

  // Carregar médicos
  useEffect(() => {
    fetchDoctors()
  }, [])

  // Carregar horários disponíveis quando data e médico mudarem
  useEffect(() => {
    if (formData.scheduledDate && formData.doctorId) {
      fetchAvailableSlots()
    }
  }, [formData.scheduledDate, formData.doctorId])

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=50&isActive=true')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const fetchDoctors = async () => {
    try {
      // TODO: Implementar API para médicos
      // Por enquanto, usar dados mockados
      setDoctors([
        {
          id: 'cmeokjwn60000re2t8uldf5d5',
          name: 'Dr. João Silva',
          specialty: 'Clínico Geral',
          crmNumber: '12345-SP'
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
    }
  }

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true)
      const response = await fetch(
        `/api/consultations/available-slots?doctorId=${formData.doctorId}&date=${formData.scheduledDate}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.availableSlots || [])
      } else {
        const error = await response.json()
        setError(error.error || 'Erro ao carregar horários')
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
      setError('Erro ao carregar horários disponíveis')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.patientId) {
      setError('Selecione um paciente')
      return
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Selecione data e horário')
      return
    }

    try {
      // Combinar data e hora
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)

      const submitData = {
        ...formData,
        scheduledDate: scheduledDateTime.toISOString()
      }

      await onSubmit(submitData)
    } catch (error: any) {
      setError(error.message || 'Erro ao agendar consulta')
    }
  }

  const consultationTypes = [
    { value: 'ROUTINE', label: 'Consulta de Rotina' },
    { value: 'URGENT', label: 'Consulta Urgente' },
    { value: 'EMERGENCY', label: 'Emergência' },
    { value: 'FOLLOW_UP', label: 'Retorno' },
    { value: 'PREVENTIVE', label: 'Consulta Preventiva' }
  ]

  const durations = [
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-medical-primary" />
            <span>Agendar Nova Consulta</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Seleção do Paciente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <User className="inline h-4 w-4 mr-1" />
                Paciente *
              </label>
              {patient ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{patient.name}</div>
                  <div className="text-sm text-gray-600">
                    {patient.age} anos • {patient.phone} • {patient.email}
                  </div>
                </div>
              ) : (
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - {patient.age} anos
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Seleção do Médico */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Médico *</label>
              <select
                value={formData.doctorId}
                onChange={(e) => setFormData(prev => ({ ...prev, doctorId: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                required
              >
                <option value="">Selecione um médico</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty} (CRM: {doctor.crmNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Data da Consulta */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data da Consulta *
              </label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value, scheduledTime: '' }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
                required
              />
            </div>

            {/* Horário da Consulta */}
            {formData.scheduledDate && formData.doctorId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Horário *
                </label>
                {loadingSlots ? (
                  <div className="p-4 text-center text-gray-500">
                    Carregando horários disponíveis...
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          scheduledTime: new Date(slot.time).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        }))}
                        className={`p-2 text-sm border rounded-lg transition-colors ${
                          formData.scheduledTime === new Date(slot.time).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                            ? 'bg-medical-primary text-white border-medical-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {slot.displayTime}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum horário disponível nesta data
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Consulta */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo de Consulta *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
                required
              >
                {consultationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Duração</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent"
              >
                {durations.map(duration => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <FileText className="inline h-4 w-4 mr-1" />
                Descrição
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Motivo da consulta ou observações..."
                className="w-full"
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="medical"
                disabled={loading}
              >
                {loading ? 'Agendando...' : 'Agendar Consulta'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
