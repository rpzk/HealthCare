'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Clock, 
  UserPlus, 
  Search,
  RefreshCw,
  CheckCircle,
  ChevronRight,
  Activity,
  ClipboardList,
  Bell,
  AlertCircle
} from 'lucide-react'
import { PendingAppointmentsManager } from '@/components/admin/pending-appointments-manager'

interface Appointment {
  id: string
  patient: { id: string; name: string; cpf?: string; phone?: string }
  doctor: { id: string; name: string; speciality?: string }
  scheduledDate: string
  status: string
  type: string
  notes?: string
  checkedInAt?: string
}

interface DashboardStats {
  todayAppointments: number
  waitingPatients: number
  inProgressConsultations: number
  completedToday: number
}

interface NotificationItem {
  id: string
  title: string
  message: string
}

export default function ReceptionDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'agenda' | 'checkin' | 'patients' | 'approvals'>('agenda')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [waitingList, setWaitingList] = useState<Appointment[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    
    try {
      const [apptRes, statsRes, notifRes, pendingRes] = await Promise.all([
        fetch(`/api/appointments?date=${selectedDate}`).then(r => r.ok ? r.json() as Promise<{ data?: Appointment[] }> : { data: [] }),
        fetch('/api/reception/stats').then(r => r.ok ? r.json() : null),
        fetch('/api/notifications?limit=5').then(r => r.ok ? r.json() as Promise<{ data?: NotificationItem[] }> : { data: [] }),
        fetch('/api/appointments/pending').then(r => r.ok ? r.json() : { summary: { pending: 0 } })
      ])
      
      setAppointments(apptRes.data || [])
      setStats(statsRes)
      setNotifications(notifRes.data || [])
      setPendingCount(pendingRes.summary?.pending || 0)
      
      // Filter waiting patients
      const waiting = (apptRes.data || []).filter((a) => 
        a.status === 'CHECKED_IN' || a.status === 'WAITING'
      )
      setWaitingList(waiting)
    } catch (err: unknown) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [session, status, selectedDate, router, loadData])


  const handleCheckIn = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/checkin`, {
        method: 'POST'
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro no check-in')
      }
      
      loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no check-in'
      alert(message)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      CHECKED_IN: 'bg-yellow-100 text-yellow-700',
      WAITING: 'bg-orange-100 text-orange-700',
      IN_PROGRESS: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      NO_SHOW: 'bg-red-100 text-red-700'
    }
    
    const labels: Record<string, string> = {
      SCHEDULED: 'Agendado',
      CHECKED_IN: 'Check-in',
      WAITING: 'Aguardando',
      IN_PROGRESS: 'Em atendimento',
      COMPLETED: 'Finalizado',
      CANCELLED: 'Cancelado',
      NO_SHOW: 'Não compareceu'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recepção</h1>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewAppointmentModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="h-5 w-5" />
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Agendamentos Hoje</p>
                  <p className="text-xl font-bold">{stats.todayAppointments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aguardando</p>
                  <p className="text-xl font-bold">{stats.waitingPatients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Em Atendimento</p>
                  <p className="text-xl font-bold">{stats.inProgressConsultations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Finalizados</p>
                  <p className="text-xl font-bold">{stats.completedToday}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'agenda'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Calendar className="h-5 w-5 inline mr-2" />
                    Agenda
                  </button>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className={`relative flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'approvals'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <AlertCircle className="h-5 w-5 inline mr-2" />
                    Aprovações
                    {pendingCount > 0 && (
                      <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'checkin'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ClipboardList className="h-5 w-5 inline mr-2" />
                    Check-in
                  </button>
                  <button
                    onClick={() => setActiveTab('patients')}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                      activeTab === 'patients'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="h-5 w-5 inline mr-2" />
                    Pacientes
                  </button>
                </nav>
              </div>

              <div className="p-4">
                {/* Agenda Tab */}
                {activeTab === 'agenda' && (
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                      />
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {appointments.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          Nenhum agendamento para esta data
                        </p>
                      ) : (
                        appointments
                          .filter(a => !searchTerm || 
                            a.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.patient.cpf?.includes(searchTerm)
                          )
                          .map(appointment => (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[60px]">
                                  <p className="text-lg font-bold">{formatTime(appointment.scheduledDate)}</p>
                                </div>
                                <div>
                                  <p className="font-medium">{appointment.patient.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {appointment.doctor.name}
                                    {appointment.doctor.speciality && ` • ${appointment.doctor.speciality}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(appointment.status)}
                                {appointment.status === 'SCHEDULED' && (
                                  <button
                                    onClick={() => handleCheckIn(appointment.id)}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                  >
                                    Check-in
                                  </button>
                                )}
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Check-in Tab */}
                {activeTab === 'checkin' && (
                  <div>
                    <h3 className="font-semibold mb-4">Busca Rápida para Check-in</h3>
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Digite o CPF ou nome do paciente..."
                        className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg"
                        autoFocus
                      />
                    </div>

                    <h3 className="font-semibold mb-4">Próximos Atendimentos</h3>
                    <div className="space-y-2">
                      {appointments
                        .filter(a => a.status === 'SCHEDULED')
                        .slice(0, 5)
                        .map(appointment => (
                          <div
                            key={appointment.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{appointment.patient.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatTime(appointment.scheduledDate)} • {appointment.doctor.name}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCheckIn(appointment.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <CheckCircle className="h-5 w-5" />
                              Check-in
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Patients Tab */}
                {activeTab === 'patients' && (
                  <div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar paciente por nome, CPF ou telefone..."
                        className="w-full pl-10 pr-4 py-3 border rounded-lg"
                      />
                    </div>
                    <p className="text-center text-gray-500 py-8">
                      Digite para buscar pacientes cadastrados
                    </p>
                  </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && (
                  <div>
                    <PendingAppointmentsManager />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - 1/3 */}
          <div className="space-y-6">
            {/* Waiting List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Sala de Espera
                </h3>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-sm font-medium">
                  {waitingList.length}
                </span>
              </div>
              <div className="p-4">
                {waitingList.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum paciente aguardando
                  </p>
                ) : (
                  <div className="space-y-3">
                    {waitingList.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.patient.name}</p>
                          <p className="text-sm text-gray-500">
                            Chegou às {formatTime(item.checkedInAt || item.scheduledDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold">Notificações</h3>
              </div>
              <div className="p-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">
                    Nenhuma notificação
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <p className="font-medium text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold mb-4">Ações Rápidas</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowNewAppointmentModal(true)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span>Novo Agendamento</span>
                </button>
                <button
                  onClick={() => router.push('/patients/new')}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-5 w-5 text-green-600" />
                  <span>Cadastrar Paciente</span>
                </button>
                <button
                  onClick={() => router.push('/appointments')}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span>Ver Agenda Completa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          onClose={() => setShowNewAppointmentModal(false)}
          onSuccess={() => {
            setShowNewAppointmentModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

interface NotificationItem {
  id: string
  title: string
  message: string
}

interface ModalPatient {
  id: string;
  name: string;
  cpf?: string;
}

interface ModalDoctor {
  id: string;
  name: string;
  speciality?: string;
}

// New Appointment Modal
function NewAppointmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'CONSULTATION',
    notes: ''
  })
  const [patients, setPatients] = useState<ModalPatient[]>([])
  const [doctors, setDoctors] = useState<ModalDoctor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchPatient, setSearchPatient] = useState('')

  useEffect(() => {
    // Load doctors
    fetch('/api/users?role=DOCTOR')
      .then(r => r.json())
      .then(data => setDoctors(data.data || data || []))
      .catch((err) => {
        console.error('Failed to load doctors', err)
      })
  }, [])

  useEffect(() => {
    if (searchPatient.length >= 2) {
      fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}`)
        .then(r => r.json())
        .then(data => setPatients(data.data || data || []))
        .catch((err) => {
          console.error('Failed to load patients', err)
        })
    }
  }, [searchPatient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const scheduledDate = new Date(`${formData.date}T${formData.time}:00`)
      
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          scheduledDate: scheduledDate.toISOString(),
          type: formData.type,
          notes: formData.notes
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar agendamento')
      }

      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar agendamento'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Novo Agendamento</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente *
            </label>
            <input
              type="text"
              placeholder="Digite o nome ou CPF para buscar..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            />
            {patients.length > 0 && (
              <div className="border rounded-lg max-h-32 overflow-y-auto">
                {patients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, patientId: p.id })
                      setSearchPatient(p.name)
                      setPatients([])
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  >
                    {p.name} {p.cpf && `• ${p.cpf}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profissional *
            </label>
            <select
              value={formData.doctorId}
              onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Selecione...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.speciality && `(${d.speciality})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="CONSULTATION">Consulta</option>
              <option value="RETURN">Retorno</option>
              <option value="EXAM">Exame</option>
              <option value="PROCEDURE">Procedimento</option>
              <option value="EMERGENCY">Emergência</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
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
              disabled={loading || !formData.patientId || !formData.doctorId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
