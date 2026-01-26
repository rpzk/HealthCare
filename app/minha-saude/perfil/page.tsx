'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseAllergies } from '@/lib/patient-schemas'
// Separator removed: not used in this page
import { 
  
  ArrowLeft,
  
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  Heart,
  Droplets,
  AlertTriangle,
  
  
  Bell,
  Lock,
  HelpCircle,
  
  QrCode
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PatientProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  birthDate: string | null
  gender: string | null
  bloodType: string | null
  allergies: string[]
  address?: {
    street: string
    number: string
    complement?: string | null
    neighborhood?: string | null
    city: string
    state: string
    zipCode?: string | null
  }
  emergencyContact?: {
    name: string
    phone: string
    relation: string
  }
}

export default function PerfilPacientePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthCardOpen, setHealthCardOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    phone: '',
    cpf: '',
    gender: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    bloodType: '',
    allergies: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        birthDate: profile.birthDate ? String(profile.birthDate).slice(0, 10) : '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        gender: profile.gender || '',
        street: profile.address?.street || '',
        number: profile.address?.number || '',
        complement: profile.address?.complement || '',
        neighborhood: profile.address?.neighborhood || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        zipCode: profile.address?.zipCode || '',
        bloodType: profile.bloodType || '',
        allergies: parseAllergies(profile.allergies).join(', ') || '',
        emergencyName: profile.emergencyContact?.name || '',
        emergencyPhone: profile.emergencyContact?.phone || '',
        emergencyRelation: profile.emergencyContact?.relation || '',
      })
    }
  }, [profile])

  const formatZipCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/patient/profile', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleFormChange = (field: string, value: string) => {
    if (field === 'zipCode') {
      setForm((prev) => ({ ...prev, zipCode: formatZipCode(value) }))
      return
    }
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const payload: any = {}
    const trimmedName = form.name?.trim()
    const trimmedBirthDate = form.birthDate?.trim()
    const trimmedPhone = form.phone?.trim()
    const trimmedCpf = form.cpf?.trim()
    const trimmedBloodType = form.bloodType?.trim()
    const trimmedGender = form.gender?.trim()
    if (trimmedName) payload.name = trimmedName
    if (trimmedBirthDate) payload.birthDate = trimmedBirthDate
    if (trimmedPhone) payload.phone = trimmedPhone
    if (trimmedCpf) payload.cpf = trimmedCpf
    if (trimmedBloodType) payload.bloodType = trimmedBloodType
    if (trimmedGender) payload.gender = trimmedGender
    if (form.allergies) {
      payload.allergies = form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (form.emergencyName && form.emergencyPhone) {
      payload.emergencyContact = {
        name: form.emergencyName,
        phone: form.emergencyPhone,
        relation: form.emergencyRelation || 'Contato',
      }
    }
    if (form.street && form.city && form.state) {
      payload.address = {
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
      }
    }

    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar')
      }

      setSuccessMsg('Dados atualizados com sucesso.')
      await fetchProfile()
      setEditOpen(false)
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatBirthDatePtBR = (birthDateIso: string | null | undefined) => {
    if (!birthDateIso) return '—'
    const dateOnly = String(birthDateIso).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const safe = new Date(`${dateOnly}T12:00:00.000Z`)
      if (!isNaN(safe.getTime())) {
        return format(safe, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      }
    }
    try {
      return format(parseISO(String(birthDateIso)), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return '—'
    }
  }

  const formatGenderPtBR = (gender: string | null | undefined) => {
    if (!gender) return '—'
    if (gender === 'MALE') return 'Masculino'
    if (gender === 'FEMALE') return 'Feminino'
    if (gender === 'OTHER') return 'Outro'
    return String(gender)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const displayName = profile?.name || session?.user?.name || 'Paciente'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/minha-saude">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Meu Perfil</h1>
          </div>
        </div>
      </div>

      {/* Avatar e Info Principal */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-20" />
          <CardContent className="relative pt-0 pb-6 px-4">
            <div className="flex flex-col items-center -mt-10">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.email || session?.user?.email}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full"
                  onClick={() => setHealthCardOpen(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Cartão de Saúde
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="rounded-full"
                  onClick={() => setEditOpen(true)}
                >
                  Editar dados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Pessoais */}
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">Informações Pessoais</h3>
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-0 divide-y dark:divide-gray-800">
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-medium">{profile?.cpf || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">
                  {formatBirthDatePtBR(profile?.birthDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{profile?.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Sexo</p>
                <p className="font-medium">{formatGenderPtBR(profile?.gender)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="font-medium">
                  {profile?.address 
                    ? `${profile.address.street}, ${profile.address.number} - ${profile.address.city}/${profile.address.state}`
                    : '—'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Saúde */}
        <h3 className="text-sm font-semibold text-muted-foreground px-1 pt-2">Informações de Saúde</h3>
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-0 divide-y dark:divide-gray-800">
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/50 rounded-xl">
                <Droplets className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tipo Sanguíneo</p>
                <p className="font-medium">{profile?.bloodType || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/50 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Alergias</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile?.allergies && profile.allergies.length > 0 ? (
                    profile.allergies.map((allergy, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {allergy}
                      </Badge>
                    ))
                  ) : (
                    <p className="font-medium">Nenhuma registrada</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato de Emergência */}
        {profile?.emergencyContact && (
          <>
            <h3 className="text-sm font-semibold text-muted-foreground px-1 pt-2">Contato de Emergência</h3>
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-pink-100 dark:bg-pink-900/50 rounded-xl">
                    <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{profile.emergencyContact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.emergencyContact.relation} • {profile.emergencyContact.phone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Opções */}
        <h3 className="text-sm font-semibold text-muted-foreground px-1 pt-2">Configurações</h3>
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-0 divide-y dark:divide-gray-800">
            <Link href="/minha-saude/notificacoes" className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Notificações</p>
                <p className="text-xs text-muted-foreground">Gerencie suas notificações</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Privacidade</p>
                <p className="text-xs text-muted-foreground">Configurações de privacidade</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <Link href="/help" className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Ajuda</p>
                <p className="text-xs text-muted-foreground">Central de ajuda e suporte</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-0 shadow-md rounded-2xl mb-8">
          <CardContent className="p-0">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-2xl"
            >
              <div className="p-2.5 bg-red-100 dark:bg-red-900/50 rounded-xl">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Sair da conta</p>
                <p className="text-xs opacity-70">Desconectar do aplicativo</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Cartão de Saúde Digital */}
      <Dialog open={healthCardOpen} onOpenChange={setHealthCardOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Cartão de Saúde Digital</DialogTitle>
          </DialogHeader>
          <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-6 w-6" />
                  <span className="font-bold">SaúdeID</span>
                </div>
                <Shield className="h-5 w-5 opacity-80" />
              </div>
              
              <div className="mb-6">
                <p className="text-xs opacity-70">Nome do Paciente</p>
                <p className="text-lg font-semibold">{displayName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs opacity-70">CPF</p>
                  <p className="font-medium">{profile?.cpf || '—'}</p>
                </div>
                <div>
                  <p className="text-xs opacity-70">Tipo Sanguíneo</p>
                  <p className="font-medium">{profile?.bloodType || '—'}</p>
                </div>
              </div>
              
              <div className="flex justify-center bg-white/20 rounded-xl p-4">
                <QrCode className="h-24 w-24 text-white" />
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Editar Perfil */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar informações</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="Digite seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={(e) => handleFormChange('birthDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={form.cpf}
                onChange={(e) => handleFormChange('cpf', e.target.value)}
                placeholder="Digite o CPF"
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.gender} onValueChange={(value) => handleFormChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Masculino</SelectItem>
                  <SelectItem value="FEMALE">Feminino</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo sanguíneo</Label>
              <Select value={form.bloodType} onValueChange={(value) => handleFormChange('bloodType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Alergias (separe por vírgula)</Label>
              <Input
                value={form.allergies}
                onChange={(e) => handleFormChange('allergies', e.target.value)}
                placeholder="Separe por vírgulas"
              />
            </div>

            <div className="md:col-span-2 mt-2">
              <p className="text-sm font-semibold mb-2">Endereço principal</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input value={form.street} onChange={(e) => handleFormChange('street', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.number} onChange={(e) => handleFormChange('number', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={(e) => handleFormChange('neighborhood', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.complement} onChange={(e) => handleFormChange('complement', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => handleFormChange('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={form.state} onChange={(e) => handleFormChange('state', e.target.value)} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={form.zipCode} onChange={(e) => handleFormChange('zipCode', e.target.value)} placeholder="Digite o CEP" />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 mt-2">
              <p className="text-sm font-semibold mb-2">Contato de emergência</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.emergencyName} onChange={(e) => handleFormChange('emergencyName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Relação</Label>
                  <Input value={form.emergencyRelation} onChange={(e) => handleFormChange('emergencyRelation', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.emergencyPhone} onChange={(e) => handleFormChange('emergencyPhone', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar' }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
