'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface MedicalRecord {
  id: string
  title: string
  description: string
  recordType: string
  priority: string
  patientId: string
  doctorId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface MedicalRecordsListProps {
  userRole?: string
  userId?: string
  onSelect?: (record: MedicalRecord) => void
}

export function MedicalRecordsList({
  userRole = 'DOCTOR',
  userId,
  onSelect,
}: MedicalRecordsListProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

  const totalPages = Math.ceil(totalRecords / pageSize)

  useEffect(() => {
    fetchRecords()
  }, [page, pageSize, searchTerm, filterType, filterPriority])

  const fetchRecords = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterPriority && { priority: filterPriority }),
      })

      const response = await fetch(`/api/medical-records?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar prontuários')
      }

      const data = await response.json()
      setRecords(data.records || [])
      setTotalRecords(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Tem certeza que deseja deletar este prontuário?')) {
      return
    }

    try {
      const response = await fetch(`/api/medical-records/${recordId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar prontuário')
      }

      setRecords(records.filter(r => r.id !== recordId))
      setTotalRecords(totalRecords - 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getPriorityBadgeColor = (priority: string) => {
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
        .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header h1 { font-size: 2rem; font-weight: 700; color: #1f2937; }
        .btn-create { background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.375rem; text-decoration: none; font-weight: 500; }
        .btn-create:hover { background-color: #2563eb; }
        .filters { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .filter-input, .filter-select { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .clear-btn { background-color: #f3f4f6; color: #374151; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; font-weight: 500; }
        .clear-btn:hover { background-color: #e5e7eb; }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f9fafb; padding: 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        td { padding: 1rem; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background-color: #f9fafb; }
        .title-link { color: #3b82f6; text-decoration: none; font-weight: 500; }
        .title-link:hover { text-decoration: underline; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: white; }
        .actions { display: flex; gap: 0.5rem; }
        .btn-small { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.75rem; border: none; cursor: pointer; font-weight: 500; }
        .btn-edit { background-color: #3b82f6; color: white; }
        .btn-edit:hover { background-color: #2563eb; }
        .btn-delete { background-color: #ef4444; color: white; }
        .btn-delete:hover { background-color: #dc2626; }
        .pagination { display: flex; justify-content: center; gap: 0.5rem; align-items: center; margin-top: 2rem; }
        .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; background-color: white; }
        .page-btn:hover:not(:disabled) { background-color: #f3f4f6; }
        .page-btn.active { background-color: #3b82f6; color: white; border-color: #3b82f6; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-message { background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: #6b7280; }
        .empty-state p { font-size: 1.125rem; margin-bottom: 1rem; }
        .loading { text-align: center; padding: 2rem; color: #6b7280; }
      `}</style>

      <div className="container">
        <div className="header">
          <h1>Prontuários Médicos</h1>
          <Link href="/medical-records/new" className="btn-create">
            + Novo Prontuário
          </Link>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            className="filter-input"
          />

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="">Todos os Tipos</option>
            <option value="CONSULTATION">Consulta</option>
            <option value="EXAM">Exame</option>
            <option value="PROCEDURE">Procedimento</option>
            <option value="PRESCRIPTION">Prescrição</option>
            <option value="OTHER">Outro</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value)
              setPage(1)
            }}
            className="filter-select"
          >
            <option value="">Todas as Prioridades</option>
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('')
              setFilterType('')
              setFilterPriority('')
              setPage(1)
            }}
            className="clear-btn"
          >
            Limpar Filtros
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLoading ? (
          <div className="loading">Carregando prontuários...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum prontuário encontrado</p>
            <p style={{ fontSize: '0.875rem' }}>
              {searchTerm || filterType || filterPriority
                ? 'Tente ajustar seus filtros'
                : 'Clique no botão "Novo Prontuário" para criar um'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Data Criação</th>
                    <th>Paciente</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <Link href={`/medical-records/${record.id}`} className="title-link">
                          {record.title}
                        </Link>
                      </td>
                      <td>{getTypeLabel(record.recordType)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{ backgroundColor: getPriorityBadgeColor(record.priority) }}
                        >
                          {getPriorityLabel(record.priority)}
                        </span>
                      </td>
                      <td>{formatDate(record.createdAt)}</td>
                      <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {record.patientId.substring(0, 8)}...
                      </td>
                      <td>
                        <div className="actions">
                          <Link href={`/medical-records/${record.id}/edit`} className="btn-small btn-edit">
                            Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="btn-small btn-delete"
                            disabled={isLoading}
                          >
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                ← Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`page-btn ${page === p ? 'active' : ''}`}
                  >
                    {p}
                  </button>
                ))}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="page-btn"
              >
                Próxima →
              </button>

              <span style={{ marginLeft: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                Página {page} de {totalPages} ({totalRecords} total)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
