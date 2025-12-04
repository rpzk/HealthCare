'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  ArrowLeft,
  Stethoscope,
  AlertCircle,
  Check,
  Loader2,
  GripVertical
} from 'lucide-react'
import Link from 'next/link'

interface ServiceType {
  id: string
  name: string
  icon: string
  description: string
  roles: string[]
  isActive?: boolean
}

const AVAILABLE_ROLES = [
  { id: 'DOCTOR', label: 'Médico' },
  { id: 'NURSE', label: 'Enfermeiro(a)' },
  { id: 'TECHNICIAN', label: 'Técnico(a)' },
  { id: 'RECEPTIONIST', label: 'Recepcionista' },
]

const SUGGESTED_ICONS = ['👨‍⚕️', '👩‍⚕️', '🏥', '💉', '🩺', '💊', '🩹', '🧪', '❤️', '🦷', '👁️', '🧠']

export default function AppointmentTypesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [services, setServices] = useState<ServiceType[]>([])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    loadServices()
  }, [session])

  const loadServices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/appointment-types')
      const data = await response.json()
      setServices(data.services || [])
    } catch (err) {
      setError('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      // Validar
      for (const service of services) {
        if (!service.name.trim()) {
          setError('Todos os serviços devem ter um nome')
          return
        }
        if (!service.roles.length) {
          setError(`O serviço "${service.name}" deve ter pelo menos um tipo de profissional`)
          return
        }
      }

      const response = await fetch('/api/settings/appointment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Isso irá restaurar os tipos de atendimento para o padrão. Continuar?')) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/settings/appointment-types', {
        method: 'DELETE'
      })
      const data = await response.json()
      setServices(data.services || [])
      setSuccess('Restaurado para padrão!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erro ao restaurar')
    } finally {
      setSaving(false)
    }
  }

  const addService = () => {
    const newId = `service-${Date.now()}`
    setServices([...services, {
      id: newId,
      name: '',
      icon: '🩺',
      description: '',
      roles: [],
      isActive: true
    }])
  }

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id))
  }

  const updateService = (id: string, updates: Partial<ServiceType>) => {
    setServices(services.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const toggleRole = (serviceId: string, roleId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return
    
    const roles = service.roles.includes(roleId)
      ? service.roles.filter(r => r !== roleId)
      : [...service.roles, roleId]
    
    updateService(serviceId, { roles })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Tipos de Atendimento</h1>
            <p className="text-muted-foreground">
              Configure os serviços disponíveis para agendamento pelos pacientes
            </p>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Lista de Serviços */}
        <div className="space-y-4 mb-6">
          {services.map((service, index) => (
            <Card key={service.id} className="relative">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Drag handle */}
                  <div className="flex items-center text-gray-400">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  
                  {/* Icon selector */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{service.icon}</span>
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {SUGGESTED_ICONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => updateService(service.id, { icon })}
                          className={`text-lg p-1 rounded hover:bg-gray-100 ${
                            service.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Form fields */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`name-${service.id}`}>Nome do Serviço *</Label>
                        <Input
                          id={`name-${service.id}`}
                          value={service.name}
                          onChange={(e) => updateService(service.id, { name: e.target.value })}
                          placeholder="Ex: Consulta Médica"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`desc-${service.id}`}>Descrição</Label>
                        <Input
                          id={`desc-${service.id}`}
                          value={service.description}
                          onChange={(e) => updateService(service.id, { description: e.target.value })}
                          placeholder="Ex: Atendimento com médico"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Roles */}
                    <div>
                      <Label className="mb-2 block">Profissionais que atendem *</Label>
                      <div className="flex flex-wrap gap-3">
                        {AVAILABLE_ROLES.map(role => (
                          <label 
                            key={role.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={service.roles.includes(role.id)}
                              onCheckedChange={() => toggleRole(service.id, role.id)}
                            />
                            <span className="text-sm">{role.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(service.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add button */}
        <Button variant="outline" onClick={addService} className="w-full mb-6">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Tipo de Atendimento
        </Button>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={saving || services.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">💡 Como funciona</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Os tipos de atendimento aparecem para o paciente ao agendar uma consulta</li>
            <li>• Cada tipo pode ser atendido por um ou mais tipos de profissional</li>
            <li>• Ao selecionar um tipo, o paciente verá apenas profissionais habilitados</li>
            <li>• Se não configurar, o sistema usa: Consulta Médica e Consulta de Enfermagem</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
