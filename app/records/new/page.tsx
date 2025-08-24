'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Save, ArrowLeft, User, Calendar } from 'lucide-react'

export default function NewRecordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_name: '',
    record_type: 'CONSULTATION' as 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'PRESCRIPTION' | 'OTHER',
    title: '',
    diagnosis: '',
    symptoms: '',
    treatment: '',
    prescriptions: '',
    observations: '',
    next_appointment: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          next_appointment: formData.next_appointment ? new Date(formData.next_appointment).toISOString() : null
        })
      })

      if (response.ok) {
        router.push('/records')
      } else {
        throw new Error('Erro ao criar prontuário')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar prontuário. Tente novamente.')
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

  const recordTypes = [
    { value: 'CONSULTATION', label: 'Consulta Médica' },
    { value: 'EXAM', label: 'Resultado de Exame' },
    { value: 'PROCEDURE', label: 'Procedimento' },
    { value: 'PRESCRIPTION', label: 'Prescrição' },
    { value: 'OTHER', label: 'Outro' }
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Registro Médico</h1>
            <p className="text-sm text-gray-500">Criar novo registro no prontuário</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Registro</CardTitle>
          <CardDescription>
            Preencha as informações do prontuário médico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identificação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médico Responsável *
                </label>
                <Input
                  name="doctor_name"
                  value={formData.doctor_name}
                  onChange={handleChange}
                  placeholder="Nome do médico"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Registro
                </label>
                <select
                  name="record_type"
                  value={formData.record_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {recordTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Registro *
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Consulta de rotina, Resultado de hemograma, etc."
                required
              />
            </div>

            {/* Diagnóstico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnóstico
              </label>
              <Textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Diagnóstico principal e/ou suspeitas diagnósticas..."
                rows={3}
              />
            </div>

            {/* Sintomas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sintomas Relatados
              </label>
              <Textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Sintomas apresentados pelo paciente, queixas principais..."
                rows={3}
              />
            </div>

            {/* Tratamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tratamento Recomendado
              </label>
              <Textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
                placeholder="Plano de tratamento, recomendações médicas, orientações..."
                rows={4}
              />
            </div>

            {/* Prescrições */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prescrições
              </label>
              <Textarea
                name="prescriptions"
                value={formData.prescriptions}
                onChange={handleChange}
                placeholder="Medicamentos prescritos, dosagens, duração do tratamento..."
                rows={3}
              />
            </div>

            {/* Próximo Agendamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Próximo Agendamento
              </label>
              <Input
                name="next_appointment"
                type="datetime-local"
                value={formData.next_appointment}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Data e hora para próxima consulta ou retorno
              </p>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações Gerais
              </label>
              <Textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                placeholder="Observações adicionais, evolução do quadro, intercorrências..."
                rows={4}
              />
            </div>

            {/* Informações importantes */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">Dicas Importantes</h4>
                  <ul className="text-sm text-green-700 mt-1 space-y-1">
                    <li>• Seja específico e detalhado nas descrições</li>
                    <li>• Use terminologia médica apropriada</li>
                    <li>• Registre todos os achados relevantes</li>
                    <li>• O registro ficará permanentemente no histórico</li>
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
                <span>{loading ? 'Salvando...' : 'Salvar Registro'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
