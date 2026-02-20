'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AIRecordInsights } from './ai-record-insights'

export interface MedicalRecordDetail {
  id: string
  title: string
  description: string
  diagnosis?: string
  treatment?: string
  notes?: string
  recordType: string
  priority: string
  patientId: string
  doctorId?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  version?: number
}

export interface MedicalRecordDetailProps {
  recordId: string
  userRole?: string
  userId?: string
  onEdit?: () => void
}

export function MedicalRecordDetail({
  recordId,
  userRole = 'DOCTOR',
  userId,
  onEdit,
}: MedicalRecordDetailProps) {
  const router = useRouter()
  const [record, setRecord] = useState<MedicalRecordDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchRecord = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/medical-records/${recordId}`)

      if (!response.ok) {
        throw new Error('Prontuário não encontrado')
      }

      const data = await response.json()
      setRecord(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar prontuário')
    } finally {
      setIsLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    void fetchRecord()
  }, [fetchRecord])

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/medical-records/${recordId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar prontuário')
      }

      router.push('/medical-records')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
      setIsDeleting(false)
    }
  }

  const canEdit = userRole === 'DOCTOR' || userRole === 'ADMIN'
  const canDelete = userRole === 'ADMIN'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return '#dc2626'
      case 'HIGH':
        return '#f97316'
      case 'NORMAL':
        return '#3b82f6'
      case 'LOW':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CONSULTATION: 'Consulta',
      EXAM: 'Exame',
      PROCEDURE: 'Procedimento',
      PRESCRIPTION: 'Prescrição',
      OTHER: 'Outro',
    }
    return labels[type] || type
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: 'Baixa',
      NORMAL: 'Normal',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    }
    return labels[priority] || priority
  }

  return (
    <div className="space-y-6">
      <style>{`
        .container { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; }
        .header-content h1 { font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 0.5rem; }
        .meta { display: flex; gap: 2rem; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
        .actions { display: flex; gap: 0.5rem; }
        .btn { padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn-primary { background-color: #3b82f6; color: white; }
        .btn-primary:hover { background-color: #2563eb; }
        .btn-danger { background-color: #ef4444; color: white; }
        .btn-danger:hover { background-color: #dc2626; }
        .btn-secondary { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .btn-secondary:hover { background-color: #e5e7eb; }
        .section { margin-bottom: 2rem; }
        .section-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
        .field { margin-bottom: 1.5rem; }
        .field-label { font-weight: 600; color: #374151; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .field-value { color: #1f2937; margin-top: 0.5rem; line-height: 1.6; }
        .field-value.sensitive { background-color: #fef3c7; padding: 1rem; border-radius: 0.375rem; border-left: 4px solid #f59e0b; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: white; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 1rem; font-size: 0.875rem; }
        .error-message { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem; }
        .loading { text-align: center; padding: 3rem; color: #6b7280; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 50; }
        .modal { background-color: white; border-radius: 0.5rem; padding: 2rem; max-width: 400px; box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15); }
        .modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; }
        .modal-buttons { display: flex; gap: 1rem; margin-top: 2rem; }
        .modal-buttons button { flex: 1; }
      `}</style>

      {isLoading ? (
        <div className="loading">Carregando prontuário...</div>
      ) : error ? (
        <div className="container">
          <div className="error-message">{error}</div>
          <Link href="/medical-records" className="btn btn-secondary">
            ← Voltar para Lista
          </Link>
        </div>
      ) : record ? (
        <div className="container">
          <div className="header">
            <div className="header-content">
              <h1>{record.title}</h1>
              <div className="meta">
                <span>Tipo: {getTypeLabel(record.recordType)}</span>
                <span>Prioridade: {getPriorityLabel(record.priority)}</span>
                <span>Criado em: {formatDate(record.createdAt)}</span>
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="actions">
                {canEdit && (
                  <Link
                    href={`/medical-records/${recordId}/edit`}
                    className="btn btn-primary"
                  >
                    Editar
                  </Link>
                )}
                <a
                  href={`/api/medical-records/${recordId}/export/pdf`}
                  target="_blank"
                  className="btn btn-secondary"
                  title="Exportar Prontuário para PDF"
                  rel="noreferrer"
                >
                  Exportar PDF 📄
                </a>
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn btn-danger"
                  >
                    Deletar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-title">Informações Gerais</div>
            <div className="grid-2">
              <div className="field">
                <div className="field-label">Tipo de Prontuário</div>
                <div className="field-value">{getTypeLabel(record.recordType)}</div>
              </div>
              <div className="field">
                <div className="field-label">Prioridade</div>
                <div className="field-value">
                  <span
                    className="badge"
                    style={{ backgroundColor: getPriorityColor(record.priority) }}
                  >
                    {getPriorityLabel(record.priority)}
                  </span>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="field-label">Descrição</div>
              <div className="field-value">{record.description}</div>
            </div>

            <div className="grid-2">
              <div className="field">
                <div className="field-label">Paciente ID</div>
                <div className="field-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {record.patientId}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Versão</div>
                <div className="field-value">{record.version || 1}</div>
              </div>
            </div>
          </div>

          {record.diagnosis && (
            <div className="section">
              <div className="section-title">Diagnóstico</div>
              <div className="field">
                <div className="field-value sensitive">{record.diagnosis}</div>
              </div>
            </div>
          )}

          {record.treatment && (
            <div className="section">
              <div className="section-title">Tratamento</div>
              <div className="field">
                <div className="field-value sensitive">{record.treatment}</div>
              </div>
            </div>
          )}

          {record.notes && (
            <div className="section">
              <div className="section-title">Observações</div>
              <div className="field">
                <div className="field-value sensitive">{record.notes}</div>
              </div>
            </div>
          )}

          {/* AI-Powered Insights */}
          {(record.diagnosis || record.treatment) && (
            <div style={{ marginTop: '2rem' }}>
              <AIRecordInsights
                recordId={record.id}
                patientId={record.patientId}
                recordData={{
                  diagnosis: record.diagnosis,
                  treatment: record.treatment,
                  notes: record.notes,
                  recordType: record.recordType,
                  priority: record.priority
                }}
              />
            </div>
          )}

          <div className="info-box">
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🔒 Proteção LGPD</p>
            <ul style={{ marginLeft: '1.25rem', lineHeight: '1.6' }}>
              <li>Este prontuário está auditado e protegido</li>
              <li>Campos sensíveis são ocultados por perfil de acesso</li>
              <li>Alterações são rastreadas com data/hora/usuário</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Link href="/medical-records" className="btn btn-secondary">
              ← Voltar para Lista
            </Link>
          </div>

          {showDeleteConfirm && (
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-title">Confirmar Exclusão</div>
                <p>Tem certeza que deseja deletar este prontuário? Esta ação não pode ser desfeita.</p>
                <div className="modal-buttons">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-secondary"
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deletando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
