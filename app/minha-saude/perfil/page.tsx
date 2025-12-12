'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
    city: string
    state: string
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

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/patient/profile')
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

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
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
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 rounded-full"
                onClick={() => setHealthCardOpen(true)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Cartão de Saúde
              </Button>
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
                  {profile?.birthDate 
                    ? format(parseISO(profile.birthDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : '—'
                  }
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
    </div>
  )
}
