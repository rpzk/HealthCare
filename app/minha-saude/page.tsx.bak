'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pill,
  Calendar,
  Heart,
  Activity,
  Clock,
  ChevronRight,
  Sun,
  Moon,
  Sunset,
  Bell,
  FileText,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  Info,
  User,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Prescription {
  id: string
  medicationName: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  status: string
  createdAt: string
}

interface Consultation {
  id: string
  date: string
  status: string
  type: string
  notes: string | null
  professional?: {
    name: string
    specialty?: string
  }
}

interface PatientData {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export default function MinhaSaudePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('')
  
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      try {
        setError(null)
        
        const patientResponse = await fetch('/api/patients/me')
        
        if (patientResponse.ok) {
          const patient = await patientResponse.json()
          setPatientData(patient)
          
          if (patient?.id) {
            const [prescRes, consultRes] = await Promise.all([
              fetch(`/api/prescriptions?patientId=${patient.id}`),
              fetch(`/api/consultations?patientId=${patient.id}`)
            ])
            
            if (prescRes.ok) {
              const data = await prescRes.json()
              setPrescriptions(data.prescriptions || [])
            }
            
            if (consultRes.ok) {
              const data = await consultRes.json()
              const future = (data.consultations || [])
                .filter((c: Consultation) => {
                  const d = new Date(c.date)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return d >= today && c.status === 'SCHEDULED'
                })
                .sort((a: Consultation, b: Consultation) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                )
              setConsultations(future)
            }
          }
        } else if (patientResponse.status !== 404) {
          throw new Error('Erro ao carregar dados')
        }
      } catch (err) {
        console.error('Erro:', err)
        setError('Não foi possível carregar seus dados. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id])

  const getGreetingIcon = () => {
    const hour = new Date().getHours()
    if (hour < 12) return <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
    if (hour < 18) return <Sunset className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
    return <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
  }

  const formatConsultationDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Hoje'
    if (isTomorrow(date)) return 'Amanhã'
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-32 sm:h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  const firstName = session?.user?.name?.split(' ')[0] || patientData?.name?.split(' ')[0] || 'Paciente'
  const activePrescriptions = prescriptions.filter(p => p.status === 'ACTIVE').length
  const upcomingConsultations = consultations.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24 md:pb-8">
      {/* Header - Responsivo */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-4 sm:p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white text-base sm:text-lg">
                  {firstName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  {getGreetingIcon()}
                  <span className="text-blue-100 text-xs sm:text-sm">{greeting}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold">{firstName}</h1>
              </div>
            </div>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </Link>
          </div>
          
          {/* Stats - Grid responsivo */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 sm:p-4 text-center">
              <Pill className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-blue-200" />
              <p className="text-xl sm:text-2xl font-bold">{activePrescriptions}</p>
              <p className="text-[10px] sm:text-xs text-blue-200">Prescrições Ativas</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 sm:p-4 text-center">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-blue-200" />
              <p className="text-xl sm:text-2xl font-bold">{upcomingConsultations}</p>
              <p className="text-[10px] sm:text-xs text-blue-200">Consultas</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 sm:p-4 text-center">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-blue-200" />
              <p className="text-xl sm:text-2xl font-bold">{prescriptions.length}</p>
              <p className="text-[10px] sm:text-xs text-blue-200">Total Receitas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Container responsivo */}
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Mensagens de erro/aviso */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {!patientData && !error && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Cadastro de Paciente
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Seu usuário ainda não está vinculado a um cadastro de paciente. 
                    Entre em contato com a recepção para completar seu cadastro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards principais - Grid responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Prescrições */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500 rounded-xl">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base">Minhas Prescrições</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {activePrescriptions > 0 
                        ? `${activePrescriptions} ativa(s)` 
                        : 'Nenhuma ativa'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {activePrescriptions === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Pill className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Você não tem prescrições ativas.</p>
                </div>
              ) : (
                prescriptions
                  .filter(p => p.status === 'ACTIVE')
                  .slice(0, 3)
                  .map((prescription) => (
                    <div key={prescription.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{prescription.medicationName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {prescription.dosage && `${prescription.dosage}`}
                          {prescription.frequency && ` • ${prescription.frequency}`}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 ml-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ativa
                      </Badge>
                    </div>
                  ))
              )}
              <Link href="/minha-saude/receitas">
                <Button variant="ghost" className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm">
                  Ver todas as prescrições
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Consultas */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500 rounded-xl">
                    <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base">Próximas Consultas</CardTitle>
                </div>
                {upcomingConsultations > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                    {upcomingConsultations}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {upcomingConsultations === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Você não tem consultas agendadas.</p>
                  <Link href="/minha-saude/agendar">
                    <Button variant="link" className="mt-2 text-purple-600 text-sm">
                      Agendar consulta
                    </Button>
                  </Link>
                </div>
              ) : (
                consultations.slice(0, 2).map((consultation) => (
                  <div key={consultation.id} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-base sm:text-lg font-bold text-purple-600">
                        {format(parseISO(consultation.date), 'd')}
                      </span>
                      <span className="text-[10px] sm:text-xs text-purple-500">
                        {format(parseISO(consultation.date), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {consultation.professional?.name || 'Profissional'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {consultation.professional?.specialty || consultation.type}
                      </p>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {format(parseISO(consultation.date), 'HH:mm')} • {formatConsultationDate(consultation.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Link href="/minha-saude/consultas">
                <Button variant="ghost" className="w-full mt-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-sm">
                  Ver agenda completa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Acesso Rápido - Grid responsivo */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3 mt-6">
          <Link href="/minha-saude/equipe" className="flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-teal-100 dark:bg-teal-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Equipe</span>
          </Link>
          <Link href="/exams" className="flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Exames</span>
          </Link>
          <Link href="/vitals" className="flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-red-100 dark:bg-red-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Sinais Vitais</span>
          </Link>
          <Link href="/medical-records" className="flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-green-100 dark:bg-green-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Histórico</span>
          </Link>
          <Link href="/minha-saude/receitas" className="hidden md:flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Receitas</span>
          </Link>
          <Link href="/minha-saude/consultas" className="hidden md:flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-violet-100 dark:bg-violet-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Consultas</span>
          </Link>
          <Link href="/notifications" className="hidden md:flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Avisos</span>
          </Link>
          <Link href="/profile" className="hidden md:flex flex-col items-center">
            <div className="p-2.5 sm:p-3 bg-slate-100 dark:bg-slate-900/50 rounded-xl mb-1 hover:scale-105 transition-transform">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
            </div>
            <span className="text-[10px] sm:text-xs text-center">Perfil</span>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation - Apenas mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg px-2 py-2 md:hidden safe-area-inset-bottom">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/minha-saude" className="flex flex-col items-center py-1.5 px-3 text-blue-600">
            <Heart className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Início</span>
          </Link>
          <Link href="/minha-saude/receitas" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600">
            <Pill className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Remédios</span>
          </Link>
          <Link href="/minha-saude/consultas" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Consultas</span>
          </Link>
          <Link href="/exams" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600">
            <Activity className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Exames</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">{firstName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] mt-0.5">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
