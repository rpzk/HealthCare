'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TestTube, Save, ArrowLeft, Calendar, Clock } from 'lucide-react'

export default function NewExamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    exam_type: '',
    description: '',
    requested_by: '',
    urgency: 'ROUTINE' as 'URGENT' | 'ROUTINE' | 'SCHEDULED',
    observations: '',
    scheduled_for: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/exam-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduled_for: formData.scheduled_for ? new Date(formData.scheduled_for).toISOString() : null
        })
      })

      if (response.ok) {
        router.push('/exams')
      } else {
        throw new Error('Erro ao solicitar exame')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao solicitar exame. Tente novamente.')
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

  const examTypes = [
    'Exame de Sangue',
    'Radiografia',
    'Ultrassom',
    'Tomografia',
    'Ressonância Magnética',
    'Eletrocardiograma',
    'Ecocardiograma',
    'Endoscopia',
    'Colonoscopia',
    'Mamografia',
    'Densitometria Óssea',
    'Urina',
    'Fezes',
    'Cultura',
    'Biópsia',
    'Outros'
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
          <div className="p-2 bg-green-100 rounded-lg">
            <TestTube className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitar Exame</h1>
            <p className="text-sm text-gray-500">Criar nova solicitação de exame</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Solicitação</CardTitle>
          <CardDescription>
            Preencha as informações do exame solicitado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paciente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  Consulte a lista de pacientes para obter o ID correto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Exame *
                </label>
                <select
                  name="exam_type"
                  value={formData.exam_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Selecione o tipo de exame</option>
                  {examTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médico Solicitante *
                </label>
                <Input
                  name="requested_by"
                  value={formData.requested_by}
                  onChange={handleChange}
                  placeholder="Nome do médico"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgência
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ROUTINE">Rotina</option>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            {/* Data Agendamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Agendamento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  name="scheduled_for"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para exames sem agendamento específico
              </p>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada *
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreva detalhadamente o exame solicitado, área a ser examinada, suspeita clínica..."
                rows={4}
                required
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações Adicionais
              </label>
              <Textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                placeholder="Observações especiais, preparo necessário, contraindicações..."
                rows={3}
              />
            </div>

            {/* Alertas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Informações Importantes</h4>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Verifique se o paciente está cadastrado no sistema</li>
                    <li>• Para exames urgentes, entre em contato direto com o laboratório</li>
                    <li>• Alguns exames podem requerer preparo especial do paciente</li>
                    <li>• A confirmação da solicitação será enviada por email</li>
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
                <span>{loading ? 'Enviando...' : 'Solicitar Exame'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
