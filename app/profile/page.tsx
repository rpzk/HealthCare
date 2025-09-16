'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { PageHeader } from '@/components/navigation/page-header'
import { 
  User, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Camera,
  Edit3,
  Save,
  X,
  Award,
  Clock,
  Activity,
  Users,
  FileText
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  crm: string
  address: string
  bio: string
  avatar: string
  joinDate: string
  role: string
  status: 'active' | 'inactive'
  stats: {
    totalPatients: number
    totalConsultations: number
    totalExams: number
    workingHours: number
  }
  certifications: string[]
  languages: string[]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    // Simular carregamento do perfil
    setTimeout(() => {
      const mockProfile: UserProfile = {
        id: 'user_001',
        name: 'Dr. João Silva',
        email: 'joao.silva@healthcare.com',
        phone: '+55 11 99999-9999',
        specialty: 'Cardiologia',
        crm: 'CRM/SP 123456',
        address: 'São Paulo, SP - Brasil',
        bio: 'Cardiologista com mais de 15 anos de experiência no tratamento de doenças cardiovasculares. Especialista em cateterismo cardíaco e arritmias.',
        avatar: '/api/placeholder/150/150',
        joinDate: '2020-03-15',
        role: 'Médico Especialista',
        status: 'active',
        stats: {
          totalPatients: 1247,
          totalConsultations: 3892,
          totalExams: 1567,
          workingHours: 2840
        },
        certifications: [
          'Especialização em Cardiologia - USP',
          'Mestrado em Medicina - UNIFESP',
          'Certificação em Cateterismo Cardíaco',
          'Curso de Arritmias Cardíacas'
        ],
        languages: ['Português', 'Inglês', 'Espanhol']
      }
      
      setProfile(mockProfile)
      setEditedProfile(mockProfile)
      setLoading(false)
    }, 1000)
  }

  const handleEdit = () => {
    setEditMode(true)
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setEditMode(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Simular salvamento
    setTimeout(() => {
      setProfile(editedProfile)
      setEditMode(false)
      setSaving(false)
    }, 1000)
  }

  const handleInputChange = (field: string, value: string) => {
    if (editedProfile) {
      setEditedProfile(prev => prev ? { ...prev, [field]: value } : null)
    }
  }

  const handleAvatarUpload = () => {
    // Simular upload de avatar
    alert('Funcionalidade de upload de foto será implementada')
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const currentProfile = editMode ? editedProfile! : profile

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais"
        breadcrumbs={[
          { label: 'Perfil' }
        ]}
        showBackButton={true}
        showHomeButton={true}
        actions={
          !editMode ? (
            <Button onClick={handleEdit} className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Editar Perfil</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancelar</span>
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Salvar</span>
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Suas informações básicas de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar e Informações Básicas */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {currentProfile.avatar ? (
                      <img 
                        src={currentProfile.avatar} 
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  {editMode && (
                    <button
                      onClick={handleAvatarUpload}
                      className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full text-white hover:bg-blue-700"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <Badge className={
                      currentProfile.status === 'active' 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }>
                      {currentProfile.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">{currentProfile.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Membro desde {new Date(currentProfile.joinDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Campos Editáveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  {editMode ? (
                    <Input
                      value={currentProfile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900">{currentProfile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especialidade
                  </label>
                  {editMode ? (
                    <Input
                      value={currentProfile.specialty}
                      onChange={(e) => handleInputChange('specialty', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900">{currentProfile.specialty}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={currentProfile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900 flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{currentProfile.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  {editMode ? (
                    <Input
                      value={currentProfile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900 flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{currentProfile.phone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CRM
                  </label>
                  {editMode ? (
                    <Input
                      value={currentProfile.crm}
                      onChange={(e) => handleInputChange('crm', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900 flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span>{currentProfile.crm}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização
                  </label>
                  {editMode ? (
                    <Input
                      value={currentProfile.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 text-gray-900 flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{currentProfile.address}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biografia
                </label>
                {editMode ? (
                  <Textarea
                    value={currentProfile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="h-24"
                    placeholder="Conte um pouco sobre sua experiência profissional..."
                  />
                ) : (
                  <p className="p-2 text-gray-900 leading-relaxed">{currentProfile.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span>Certificações e Qualificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentProfile.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Award className="h-4 w-4 text-yellow-600" />
                    <span className="text-gray-900">{cert}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas e Informações Adicionais */}
        <div className="space-y-6">
          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Estatísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {currentProfile.stats.totalPatients.toLocaleString()}
                  </div>
                  <p className="text-xs text-blue-700">Pacientes</p>
                </div>

                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {currentProfile.stats.totalConsultations.toLocaleString()}
                  </div>
                  <p className="text-xs text-green-700">Consultas</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-purple-900">
                    {currentProfile.stats.totalExams.toLocaleString()}
                  </div>
                  <p className="text-xs text-purple-700">Exames</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {currentProfile.stats.workingHours.toLocaleString()}h
                  </div>
                  <p className="text-xs text-orange-700">Trabalhadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Idiomas */}
          <Card>
            <CardHeader>
              <CardTitle>Idiomas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentProfile.languages.map((language, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-900">{language}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configurações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Notificações por Email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Privacidade
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
