'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { X, Save, UserPlus, MapPin, Check } from 'lucide-react'
import { AddressAutocomplete, AddressSuggestion } from '../addresses/address-autocomplete'
import { AddressMapPicker } from '../addresses/address-map-picker'

interface PatientFormProps {
  patient?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function PatientForm({ patient, onSubmit, onCancel }: PatientFormProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    email: patient?.email || '',
    cpf: patient?.cpf || '',
    rg: patient?.rg || '',
    birthDate: patient?.birthDate ? patient.birthDate.split('T')[0] : '',
    gender: patient?.gender || 'FEMALE',
    phone: patient?.phone || '',
    address: patient?.address || '',
    city: patient?.city || '',
    state: patient?.state || '',
    zipCode: patient?.zipCode || '',
    emergencyContact: patient?.emergencyContact || '',
    bloodType: patient?.bloodType || '',
    allergies: patient?.allergies?.join(', ') || '',
    chronicDiseases: patient?.chronicDiseases?.join(', ') || '',
    latitude: patient?.latitude || null,
    longitude: patient?.longitude || null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      address: `${suggestion.street || ''}${suggestion.number ? ', ' + suggestion.number : ''}${suggestion.neighborhood ? ' - ' + suggestion.neighborhood : ''}`,
      city: suggestion.city || prev.city,
      state: suggestion.state || prev.state,
      zipCode: suggestion.zipCode || prev.zipCode,
      latitude: suggestion.lat,
      longitude: suggestion.lng
    }))
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    
    if (numbers.length > 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1')
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1')
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    let formattedValue = value

    // Máscara de CPF
    if (name === 'cpf') {
      formattedValue = formatCPF(value)
    }

    // Máscara de Telefone
    if (name === 'phone') {
      formattedValue = formatPhone(value)
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))

    // Busca de CEP
    if (name === 'zipCode') {
      const cep = value.replace(/\D/g, '')
      if (cep.length === 8) {
        setLoading(true)
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
          const data = await response.json()
          
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              address: data.logradouro,
              city: data.localidade,
              state: data.uf,
              // Mantém o CEP formatado se desejar
            }))
            
            // Tentar buscar coordenadas
            fetchCoordinates(`${data.logradouro}, ${data.localidade}, ${data.uf}`)
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error)
        } finally {
          setLoading(false)
        }
      }
    }
    
    // Limpar erro quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const fetchCoordinates = async (address: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      newErrors.cpf = 'CPF deve estar no formato XXX.XXX.XXX-XX'
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória'
    }

    if (!formData.gender) {
      newErrors.gender = 'Gênero é obrigatório'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!session?.user?.id) {
      console.error('Usuário não está autenticado')
      return
    }

    setLoading(true)
    try {
      // Concatenar endereço completo
      const fullAddress = [
        formData.address,
        formData.city ? `${formData.city}/${formData.state}` : '',
        formData.zipCode ? `CEP: ${formData.zipCode}` : ''
      ].filter(Boolean).join(' - ')

      const submitData = {
        ...formData,
        address: fullAddress || formData.address, // Usa o concatenado ou o original
        birthDate: new Date(formData.birthDate),
        allergies: formData.allergies.split(',').map((a: string) => a.trim()).filter((a: string) => a),
        chronicDiseases: formData.chronicDiseases.split(',').map((d: string) => d.trim()).filter((d: string) => d),
        bloodType: formData.bloodType || null,
        doctorId: session.user.id, // Usar ID do usuário logado
        latitude: formData.latitude,
        longitude: formData.longitude
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Erro ao submeter formulário:', error)
    } finally {
      setLoading(false)
    }
  }

  const isEditing = !!patient

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</span>
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-lg font-medium mb-4">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF *
                  </label>
                  <Input
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    placeholder="XXX.XXX.XXX-XX"
                    className={errors.cpf ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.cpf && (
                    <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RG
                  </label>
                  <Input
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento *
                  </label>
                  <Input
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={errors.birthDate ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.birthDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gênero *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={loading}
                  >
                    <option value="FEMALE">Feminino</option>
                    <option value="MALE">Masculino</option>
                    <option value="OTHER">Outro</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h3 className="text-lg font-medium mb-4">Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contato de Emergência
                  </label>
                  <Input
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Endereço</h3>
                {formData.latitude && formData.longitude && (
                  <div className="flex items-center text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full border border-green-200">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>Geolocalização encontrada</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    Busque o endereço para preenchimento automático e geolocalização:
                  </p>
                  <AddressAutocomplete 
                    onSelect={handleAddressSelect}
                    value={formData.address}
                  />
                  
                  <div className="mt-2">
                    <p className="text-sm text-blue-800 mb-2">
                      Ou selecione o local no mapa:
                    </p>
                    <AddressMapPicker 
                      onAddressSelect={handleAddressSelect}
                      initialLat={formData.latitude || undefined}
                      initialLng={formData.longitude || undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logradouro
                    </label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Rua, Número, Bairro"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CEP
                    </label>
                    <Input
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="12345-678"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <Input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="SP"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Médicas */}
            <div>
              <h3 className="text-lg font-medium mb-4">Informações Médicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Sanguíneo
                  </label>
                  <select
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    <option value="A_POSITIVE">A+</option>
                    <option value="A_NEGATIVE">A-</option>
                    <option value="B_POSITIVE">B+</option>
                    <option value="B_NEGATIVE">B-</option>
                    <option value="AB_POSITIVE">AB+</option>
                    <option value="AB_NEGATIVE">AB-</option>
                    <option value="O_POSITIVE">O+</option>
                    <option value="O_NEGATIVE">O-</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alergias
                  </label>
                  <Input
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="Penicilina, Látex, etc. (separar por vírgulas)"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doenças Crônicas
                  </label>
                  <Input
                    name="chronicDiseases"
                    value={formData.chronicDiseases}
                    onChange={handleChange}
                    placeholder="Hipertensão, Diabetes, etc. (separar por vírgulas)"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="medical"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? 'Atualizar' : 'Cadastrar'}</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
