'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Loader2, Plus, Edit2, Trash2 } from 'lucide-react'

const PROFESSIONAL_ROLES = [
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'DENTIST',
  'NUTRITIONIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'SOCIAL_WORKER'
]

export function ProfessionalManagement() {
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'DOCTOR',
    crmNumber: ''
  })

  // Carregar profissionais
  useEffect(() => {
    loadProfessionals()
  }, [])

  async function loadProfessionals() {
    try {
      const res = await fetch('/api/admin/professionals')
      const data = await res.json()
      if (data.professionals) {
        setProfessionals(data.professionals)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar profissionais' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Profissional criado com sucesso!' })
        setFormData({ name: '', email: '', role: 'DOCTOR', crmNumber: '' })
        setShowForm(false)
        loadProfessionals()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao criar profissional' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Profissionais</h1>
        <p className="text-gray-600">Crie e gerencie profissionais de saúde no sistema</p>
      </div>

      {/* Mensagens */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 mt-1 flex-shrink-0" size={20} />
          )}
          <span className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Botão Novo */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        <Plus size={20} /> Novo Profissional
      </button>

      {/* Formulário */}
      {showForm && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Cadastrar Novo Profissional</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dr. João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="joao@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profissão *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROFESSIONAL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Registro (CRM, COREN, etc)
                </label>
                <input
                  type="text"
                  value={formData.crmNumber}
                  onChange={(e) => setFormData({ ...formData, crmNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CRM/PR 12345"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Criando...' : 'Criar Profissional'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Profissionais */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Profissão</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Registro</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ativo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {professionals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum profissional cadastrado
                  </td>
                </tr>
              ) : (
                professionals.map((prof) => (
                  <tr key={prof.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{prof.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{prof.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {prof.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{prof.crmNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        prof.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prof.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 size={16} />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Sistema de Roles</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ <strong>Primary Role:</strong> Profissão principal (definida ao criar)</li>
          <li>✓ <strong>Assigned Roles:</strong> Roles adicionais (PATIENT é adicionado automaticamente)</li>
          <li>✓ <strong>Role Switcher:</strong> Profissionais podem alternar entre seus roles via cookie</li>
          <li>✓ <strong>Segurança:</strong> Nenhuma informação é corrompida, apenas a sessão muda</li>
        </ul>
      </div>
    </div>
  )
}
