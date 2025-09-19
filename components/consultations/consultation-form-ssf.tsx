'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, User, FileText, X, AlertCircle, Phone, Mail } from 'lucide-react'

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
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    patientId: patient?.id || '',
    doctorId: session?.user?.id || '',
    scheduledDate: '',
    scheduledTime: '',
    type: 'ROUTINE' as const,
    description: '',
    notes: '',
    duration: 60
  })

  const [patients, setPatients] = useState<Patient[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')

  // Carregar pacientes se não foi fornecido
  useEffect(() => {
    if (!patient) {
      fetchPatients()
    }
  }, [patient])

  // Atualizar doctorId quando a sessão estiver disponível
  useEffect(() => {
    if (session?.user?.id && !formData.doctorId) {
      setFormData(prev => ({
        ...prev,
        doctorId: session.user.id
      }))
    }
  }, [session, formData.doctorId])

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

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true)
      const response = await fetch(`/api/consultations/available-slots?date=${formData.scheduledDate}&doctorId=${formData.doctorId}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
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

    if (!formData.description.trim()) {
      setError('Descreva o motivo da consulta')
      return
    }

    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
      
      const consultationData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        scheduledDate: scheduledDateTime.toISOString(),
        type: formData.type,
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        duration: formData.duration
      }

      await onSubmit(consultationData)
      console.log('Consulta agendada com sucesso!')
    } catch (error: any) {
      setError(error.message || 'Erro ao agendar consulta')
      console.error('Erro ao agendar consulta')
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ROUTINE': return 'Rotina'
      case 'URGENT': return 'Urgente'
      case 'EMERGENCY': return 'Emergência'
      case 'FOLLOW_UP': return 'Retorno'
      case 'PREVENTIVE': return 'Preventiva'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-gray-600 pb-4">
        <h2 className="text-2xl font-bold text-[#40e0d0] mb-2">
          {patient ? `Agendar Consulta - ${patient.name}` : 'Nova Consulta'}
        </h2>
        <p className="text-gray-300">
          Preencha os dados para agendar uma nova consulta médica
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de Paciente */}
        {!patient && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#40e0d0]">
              <User className="inline h-4 w-4 mr-1" />
              Paciente *
            </label>
            <select
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent"
              required
            >
              <option value="">Selecione um paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.age} anos
                  {patient.phone && ` - ${patient.phone}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info do Paciente Selecionado */}
        {patient && (
          <div className="p-4 bg-[#40e0d0]/10 border border-[#40e0d0]/30 rounded-lg">
            <h3 className="font-semibold text-[#40e0d0] mb-2">Dados do Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-[#40e0d0]" />
                <span className="text-gray-300">{patient.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-[#40e0d0]" />
                <span className="text-gray-300">{patient.age} anos</span>
              </div>
              {patient.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-[#40e0d0]" />
                  <span className="text-gray-300">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-[#40e0d0]" />
                  <span className="text-gray-300">{patient.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data e Horário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#40e0d0]">
              <Calendar className="inline h-4 w-4 mr-1" />
              Data da Consulta *
            </label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#40e0d0]">
              <Clock className="inline h-4 w-4 mr-1" />
              Horário *
              {loadingSlots && <span className="text-xs text-gray-400 ml-2">Carregando...</span>}
            </label>
            <select
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent"
              required
              disabled={!formData.scheduledDate || loadingSlots}
            >
              <option value="">Selecione um horário</option>
              {availableSlots.map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {slot.displayTime}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tipo e Duração */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#40e0d0]">
              Tipo de Consulta *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent"
              required
            >
              <option value="ROUTINE">Rotina</option>
              <option value="URGENT">Urgente</option>
              <option value="EMERGENCY">Emergência</option>
              <option value="FOLLOW_UP">Retorno</option>
              <option value="PREVENTIVE">Preventiva</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#40e0d0]">
              Duração (minutos)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent"
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
            </select>
          </div>
        </div>

        {/* Motivo da Consulta */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#40e0d0]">
            <FileText className="inline h-4 w-4 mr-1" />
            Motivo da Consulta *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Descreva o motivo principal da consulta..."
            className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#40e0d0]">
            Observações
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Observações adicionais (opcional)..."
            className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#40e0d0] focus:border-transparent resize-none"
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ssf-btn px-6 py-3 disabled:opacity-50"
          >
            {loading ? 'Agendando...' : 'Agendar Consulta'}
          </button>
        </div>
      </form>
    </div>
  )
}