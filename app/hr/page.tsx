'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Users, 
  UserMinus, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Filter,
  RefreshCw
} from 'lucide-react'

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  reason?: string
  status: string
  user: { id: string; name: string; role: string; speciality?: string }
  approver?: { id: string; name: string }
  approvedAt?: string
  rejectionNote?: string
  createdAt: string
}

interface DashboardData {
  summary: {
    totalStaff: number
    activeStaff: number
    inactiveStaff: number
    pendingLeaveRequests: number
    staffOnLeaveToday: number
    staffScheduledToday: number
  }
  leavesByType: { type: string; label: string; count: number }[]
  staffOnLeave: (LeaveRequest & { typeLabel: string })[]
  upcomingLeaves: (LeaveRequest & { typeLabel: string })[]
  activeSchedules: { id: string; name: string; startDate: string; endDate: string; _count: { entries: number } }[]
}

const leaveTypeLabels: Record<string, string> = {
  VACATION: 'Férias',
  SICK_LEAVE: 'Licença Médica',
  MATERNITY: 'Licença Maternidade',
  PATERNITY: 'Licença Paternidade',
  BEREAVEMENT: 'Luto',
  PERSONAL: 'Particular',
  TRAINING: 'Treinamento',
  COMPENSATORY: 'Folga Compensatória',
  OTHER: 'Outro'
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800'
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Finalizado'
}

export default function HRPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'schedules'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)

  const isManager = session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (activeTab === 'dashboard' && isManager) {
        const res = await fetch('/api/hr/dashboard')
        if (!res.ok) throw new Error('Erro ao carregar dashboard')
        const data = await res.json()
        setDashboard(data)
      } else if (activeTab === 'requests') {
        const params = new URLSearchParams()
        if (statusFilter) params.set('status', statusFilter)

        const res = await fetch(`/api/hr/leave-requests?${params}`)
        if (!res.ok) throw new Error('Erro ao carregar solicitações')
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeTab, isManager, statusFilter])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    void loadData()
  }, [loadData, router, session, status])

  const handleAction = async (requestId: string, action: 'approve' | 'reject' | 'cancel', rejectionNote?: string) => {
    try {
      const res = await fetch(`/api/hr/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionNote })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao processar')
      }
      
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Pessoal</h1>
            <p className="text-gray-600">Férias, folgas e escalas de trabalho</p>
          </div>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nova Solicitação
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            {isManager && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Solicitações
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'schedules'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Escalas
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && isManager && dashboard && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Equipe Ativa</p>
                    <p className="text-2xl font-bold">{dashboard.summary.activeStaff}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Solicitações Pendentes</p>
                    <p className="text-2xl font-bold">{dashboard.summary.pendingLeaveRequests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <UserMinus className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ausentes Hoje</p>
                    <p className="text-2xl font-bold">{dashboard.summary.staffOnLeaveToday}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Escalados Hoje</p>
                    <p className="text-2xl font-bold">{dashboard.summary.staffScheduledToday}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Staff on Leave */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Equipe Ausente Hoje</h3>
                </div>
                <div className="p-4">
                  {dashboard.staffOnLeave.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma ausência hoje</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.staffOnLeave.map(leave => (
                        <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{leave.user.name}</p>
                            <p className="text-sm text-gray-500">{leave.typeLabel}</p>
                          </div>
                          <span className="text-sm text-gray-600">
                            até {new Date(leave.endDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Leaves */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Próximas Ausências (7 dias)</h3>
                </div>
                <div className="p-4">
                  {dashboard.upcomingLeaves.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma ausência programada</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.upcomingLeaves.map(leave => (
                        <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{leave.user.name}</p>
                            <p className="text-sm text-gray-500">{leave.typeLabel}</p>
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(leave.startDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="">Todos os status</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="APPROVED">Aprovados</option>
                  <option value="REJECTED">Rejeitados</option>
                  <option value="IN_PROGRESS">Em Andamento</option>
                  <option value="COMPLETED">Finalizados</option>
                </select>
              </div>
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {/* Request List */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Funcionário</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Período</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma solicitação encontrada
                      </td>
                    </tr>
                  ) : (
                    requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{req.user.name}</p>
                            <p className="text-sm text-gray-500">{req.user.role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {leaveTypeLabels[req.type] || req.type}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(req.startDate).toLocaleDateString('pt-BR')} - {new Date(req.endDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                            {statusLabels[req.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {req.status === 'PENDING' && isManager && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(req.id, 'approve')}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Aprovar"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const note = prompt('Motivo da rejeição:')
                                  if (note !== null) handleAction(req.id, 'reject', note)
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Rejeitar"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                          {(req.status === 'PENDING' || req.status === 'APPROVED') && 
                           (session?.user?.id === req.user.id || isManager) && (
                            <button
                              onClick={() => {
                                if (confirm('Cancelar esta solicitação?')) {
                                  handleAction(req.id, 'cancel')
                                }
                              }}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-gray-500 text-center py-8">
              Módulo de escalas em desenvolvimento. Use as APIs:
              <br />
              <code className="text-sm bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                GET/POST /api/hr/schedules
              </code>
            </p>
          </div>
        )}

        {/* New Request Modal */}
        {showNewRequestModal && (
          <NewRequestModal 
            onClose={() => setShowNewRequestModal(false)} 
            onSuccess={() => {
              setShowNewRequestModal(false)
              loadData()
            }}
          />
        )}
      </div>
    </div>
  )
}

// New Request Modal Component
function NewRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    type: 'VACATION',
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar solicitação')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Nova Solicitação de Ausência</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Ausência
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              {Object.entries(leaveTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Descreva o motivo da solicitação..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
