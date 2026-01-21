'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

export interface MedicalRecordFormProps {
  recordId?: string
  initialData?: {
    title: string
    description: string
    diagnosis?: string
    treatment?: string
    notes?: string
    recordType: 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'PRESCRIPTION' | 'OTHER'
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
    patientId: string
  }
  onSuccess?: () => void
  userRole?: string
}

// Toast notification helper - in production, replace with a proper toast library
const showToast = (_title: string, _description?: string) => {
  // Silently handled - actual UI notification would be handled by a toast provider
}

export function MedicalRecordForm({
  recordId,
  initialData,
  onSuccess,
  userRole = 'DOCTOR',
}: MedicalRecordFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    diagnosis: initialData?.diagnosis || '',
    treatment: initialData?.treatment || '',
    notes: initialData?.notes || '',
    recordType: initialData?.recordType || 'CONSULTATION',
    priority: initialData?.priority || 'NORMAL',
    patientId: initialData?.patientId || '',
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title || formData.title.length < 3) {
      newErrors.title = 'Título deve ter pelo menos 3 caracteres'
    }

    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres'
    }

    if (!formData.patientId) {
      newErrors.patientId = 'Paciente é obrigatório'
    }

    if (!formData.recordType) {
      newErrors.recordType = 'Tipo de prontuário é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      showToast('Erro de validação', 'Por favor, corrija os erros no formulário')
      return
    }

    setIsLoading(true)

    try {
      const url = recordId
        ? `/api/medical-records/${recordId}`
        : '/api/medical-records'

      const method = recordId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        showToast('Taxa de requisições excedida', `Tente novamente em ${retryAfter || 'alguns'} minutos`)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar prontuário')
      }

      const result = await response.json()

      showToast(
        'Sucesso',
        recordId ? 'Prontuário atualizado com sucesso' : 'Prontuário criado com sucesso'
      )

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/medical-records/${result.id}`)
      }
    } catch (error) {
      logger.error('Error saving medical record:', error)
      showToast(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao salvar prontuário'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <style>{`
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-label { font-weight: 600; font-size: 0.875rem; color: #1f2937; }
        .form-input, .form-textarea, .form-select { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
        .form-input:focus, .form-textarea:focus, .form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .form-input.error, .form-textarea.error { border-color: #ef4444; }
        .error-message { color: #dc2626; font-size: 0.75rem; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .sensitive-note { font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem; }
        .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 1rem; font-size: 0.875rem; }
        button { padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
        .button-primary { background-color: #3b82f6; color: white; flex: 1; }
        .button-primary:hover:not(:disabled) { background-color: #2563eb; }
        .button-primary:disabled { background-color: #9ca3af; cursor: not-allowed; }
        .button-secondary { background-color: white; color: #374151; border: 1px solid #d1d5db; }
        .button-secondary:hover:not(:disabled) { background-color: #f9fafb; }
        .button-group { display: flex; gap: 1rem; margin-top: 2rem; }
      `}</style>

      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {recordId ? 'Editar Prontuário' : 'Criar Novo Prontuário'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Preencha os campos obrigatórios (*)</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="title">Título *</label>
        <input id="title" name="title" type="text" placeholder="Ex: Consulta - Pressão Alta" value={formData.title} onChange={handleChange} className={`form-input ${errors.title ? 'error' : ''}`} disabled={isLoading} />
        {errors.title && <p className="error-message">{errors.title}</p>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">Descrição *</label>
        <textarea id="description" name="description" placeholder="Descrição detalhada..." value={formData.description} onChange={handleChange} rows={4} className={`form-textarea ${errors.description ? 'error' : ''}`} disabled={isLoading} />
        {errors.description && <p className="error-message">{errors.description}</p>}
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="recordType">Tipo *</label>
          <select id="recordType" value={formData.recordType} onChange={(e) => handleSelectChange('recordType', e.target.value)} className={`form-select ${errors.recordType ? 'error' : ''}`} disabled={isLoading}>
            <option value="CONSULTATION">Consulta</option>
            <option value="EXAM">Exame</option>
            <option value="PROCEDURE">Procedimento</option>
            <option value="PRESCRIPTION">Prescrição</option>
            <option value="OTHER">Outro</option>
          </select>
          {errors.recordType && <p className="error-message">{errors.recordType}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="priority">Prioridade</label>
          <select id="priority" value={formData.priority} onChange={(e) => handleSelectChange('priority', e.target.value)} className="form-select" disabled={isLoading}>
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="diagnosis">Diagnóstico</label>
        <textarea id="diagnosis" name="diagnosis" placeholder="Diagnóstico do paciente..." value={formData.diagnosis} onChange={handleChange} rows={3} className="form-textarea" disabled={isLoading} />
        <p className="sensitive-note">🔒 Sensível - visível apenas para médicos e admin</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="treatment">Tratamento</label>
        <textarea id="treatment" name="treatment" placeholder="Plano de tratamento..." value={formData.treatment} onChange={handleChange} rows={3} className="form-textarea" disabled={isLoading} />
        <p className="sensitive-note">🔒 Sensível - visível apenas para médicos e admin</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="notes">Observações</label>
        <textarea id="notes" name="notes" placeholder="Notas adicionais..." value={formData.notes} onChange={handleChange} rows={3} className="form-textarea" disabled={isLoading} />
        <p className="sensitive-note">🔒 Sensível - visível apenas para médicos e admin</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="patientId">ID do Paciente *</label>
        <input id="patientId" name="patientId" type="text" placeholder="UUID do paciente" value={formData.patientId} onChange={handleChange} className={`form-input ${errors.patientId ? 'error' : ''}`} disabled={isLoading || !!initialData} />
        {errors.patientId && <p className="error-message">{errors.patientId}</p>}
      </div>

      <div className="info-box">
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🔒 Proteção LGPD</p>
        <ul style={{ marginLeft: '1.25rem', lineHeight: '1.6' }}>
          <li>Acesso registrado em auditoria</li>
          <li>Dados sensíveis ocultados por perfil</li>
          <li>Alterações rastreadas (data/hora/usuário)</li>
          <li>Taxa de requisições limitada</li>
        </ul>
      </div>

      <div className="button-group">
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? 'Salvando...' : recordId ? 'Atualizar' : 'Criar'}
        </button>
        <button type="button" className="button-secondary" onClick={() => router.back()} disabled={isLoading}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
