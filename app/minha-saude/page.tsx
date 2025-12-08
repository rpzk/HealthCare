'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
  Users,
  QrCode,
  Droplets,
  Apple,
  Footprints,
  Shield,
  Sparkles,
  Phone,
  MessageCircle,
  Brain,
  Target,
  Zap,
  Lightbulb,
  TrendingUp,
  Award,
  Flame,
  Leaf,
  Wind,
  ClipboardList,
  CheckCircle,
  Lock,
  ArrowRight,
  BarChart3,
  PieChart,
  Dumbbell,
  Utensils,
  Bed,
  HeartPulse,
  Salad,
  Plus,
  LogOut,
  ArrowLeftRight,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, isToday, isTomorrow, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  cpf?: string
  birthDate?: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
  priority: string
}

interface Questionnaire {
  id: string
  title: string
  description: string
  icon: typeof Leaf
  color: string
  bgColor: string
  questions: number
  time: string
  completed: boolean
  progress: number
}

interface HealthDimension {
  name: string
  score: number | null
  icon: typeof Dumbbell
  color: string
  bgColor: string
}

// Definição dos questionários disponíveis (estrutura, não dados mockados)
const questionnaireDefinitions: Questionnaire[] = [
  {
    id: 'lifestyle',
    title: 'Estilo de Vida',
    description: 'Avalie seus hábitos diários',
    icon: Leaf,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    questions: 25,
    time: '10 min',
    completed: false,
    progress: 0
  },
  {
    id: 'mental-health',
    title: 'Saúde Mental',
    description: 'Bem-estar emocional e psicológico',
    icon: Brain,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    questions: 20,
    time: '8 min',
    completed: false,
    progress: 0
  },
  {
    id: 'nutrition',
    title: 'Nutrição',
    description: 'Hábitos alimentares e dieta',
    icon: Salad,
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    questions: 30,
    time: '12 min',
    completed: false,
    progress: 0
  },
  {
    id: 'physical',
    title: 'Aptidão Física',
    description: 'Nível de atividade e exercícios',
    icon: Dumbbell,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    questions: 15,
    time: '6 min',
    completed: false,
    progress: 0
  },
  {
    id: 'sleep',
    title: 'Qualidade do Sono',
    description: 'Padrões e qualidade do sono',
    icon: Bed,
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    questions: 18,
    time: '7 min',
    completed: false,
    progress: 0
  },
  {
    id: 'stress',
    title: 'Gestão de Estresse',
    description: 'Como você lida com pressões',
    icon: Wind,
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    questions: 22,
    time: '9 min',
    completed: false,
    progress: 0
  }
]

// Definição das dimensões de saúde (estrutura, sem scores mockados)
const healthDimensionDefinitions: HealthDimension[] = [
  { name: 'Física', score: null, icon: Dumbbell, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { name: 'Mental', score: null, icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  { name: 'Emocional', score: null, icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-500' },
  { name: 'Social', score: null, icon: Users, color: 'text-green-500', bgColor: 'bg-green-500' },
  { name: 'Nutricional', score: null, icon: Utensils, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { name: 'Espiritual', score: null, icon: Sparkles, color: 'text-indigo-500', bgColor: 'bg-indigo-500' },
]

// Dicas de saúde (conteúdo estático informativo)
const healthTips = [
  { icon: Droplets, text: "Beba pelo menos 2L de água por dia", color: "text-blue-500" },
  { icon: Apple, text: "Inclua frutas e vegetais nas refeições", color: "text-green-500" },
  { icon: Footprints, text: "Caminhe 30 minutos diariamente", color: "text-orange-500" },
  { icon: Moon, text: "Durma de 7 a 8 horas por noite", color: "text-indigo-500" },
  { icon: Heart, text: "Faça check-ups regulares", color: "text-red-500" },
]

export default function MinhaSaudePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('')
  const [healthCardOpen, setHealthCardOpen] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'development' | 'questionnaires'>('overview')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(questionnaireDefinitions)
  const [healthDimensions, setHealthDimensions] = useState<HealthDimension[]>(healthDimensionDefinitions)
  
  // Carregar notificações
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.slice(0, 10)) // Últimas 10
        }
      } catch (error) {
        console.error('Erro ao carregar notificações:', error)
      }
    }
    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CONSULTATION': return Calendar
      case 'PRESCRIPTION': return Pill
      case 'EXAM': return Activity
      case 'ALERT': return AlertCircle
      default: return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'CONSULTATION': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50'
      case 'PRESCRIPTION': return 'bg-green-100 text-green-600 dark:bg-green-900/50'
      case 'EXAM': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
      case 'ALERT': return 'bg-red-100 text-red-600 dark:bg-red-900/50'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800'
    }
  }
  
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')
  }, [])

  // Rotação de dicas de saúde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % healthTips.length)
    }, 8000)
    return () => clearInterval(interval)
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

            // TODO: Carregar dados de questionários e dimensões de saúde do banco
            // const questionnaireRes = await fetch(`/api/questionnaires?patientId=${patient.id}`)
            // const dimensionsRes = await fetch(`/api/health-dimensions?patientId=${patient.id}`)
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

  // Calcular score geral de saúde (apenas se houver dimensões avaliadas)
  const evaluatedDimensions = healthDimensions.filter(d => d.score !== null)
  const overallHealthScore = evaluatedDimensions.length > 0 
    ? Math.round(evaluatedDimensions.reduce((acc, d) => acc + (d.score || 0), 0) / evaluatedDimensions.length)
    : null
  const completedQuestionnaires = questionnaires.filter(q => q.completed).length
  const totalQuestionnaires = questionnaires.length

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
  const fullName = session?.user?.name || patientData?.name || 'Paciente'
  const activePrescriptions = prescriptions.filter(p => p.status === 'ACTIVE').length
  const upcomingConsultations = consultations.length
  const TipIcon = healthTips[currentTip].icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24 md:pb-8">
      {/* Header Premium */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950 text-white p-4 sm:p-6 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-white/30 shadow-lg cursor-pointer hover:border-white/50 transition-all">
                    <AvatarFallback className="bg-white/20 text-white text-lg sm:text-xl font-bold">
                      {firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{patientData?.name || session?.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{patientData?.email || session?.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/minha-saude/perfil" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/minha-saude/notificacoes" className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      Notificações
                      {unreadCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-[10px] px-1.5">{unreadCount}</Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {session?.user?.role && session.user.role !== 'PATIENT' && (
                    <DropdownMenuItem asChild>
                      <Link href="/patients" className="cursor-pointer text-blue-600">
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        Voltar ao Sistema
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div>
                <div className="flex items-center gap-2">
                  {getGreetingIcon()}
                  <span className="text-blue-100 text-xs sm:text-sm">{greeting}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">{firstName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => setHealthCardOpen(true)}
              >
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 relative">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 p-0 rounded-2xl shadow-xl border-0" 
                  align="end"
                  sideOffset={8}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Notificações</h3>
                      {unreadCount > 0 && (
                        <Badge className="bg-white/20 text-white hover:bg-white/30">
                          {unreadCount} nova(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-gray-800">
                        {notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.type)
                          return (
                            <div 
                              key={notification.id}
                              className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                              }`}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex gap-3">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{notification.title}</p>
                                    {!notification.read && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatDistanceToNow(parseISO(notification.createdAt), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t p-2">
                    <Link href="/minha-saude/notificacoes" onClick={() => setNotificationsOpen(false)}>
                      <Button variant="ghost" className="w-full text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Ver todas as notificações
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Score de Saúde Geral */}
          <div className="flex items-center justify-center gap-6 mt-4 mb-2">
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-white/20"
                />
                {overallHealthScore !== null && (
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallHealthScore / 100)}`}
                    className="text-green-400"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {overallHealthScore !== null ? overallHealthScore : '—'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Índice de Bem-Estar</p>
              <p className="text-white font-semibold text-lg">
                {overallHealthScore !== null 
                  ? (overallHealthScore >= 80 ? 'Excelente' : overallHealthScore >= 60 ? 'Bom' : 'Precisa atenção')
                  : 'Não avaliado'
                }
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {completedQuestionnaires}/{totalQuestionnaires} avaliações completas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg z-40 border-b shadow-sm -mt-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {[
              { id: 'overview', label: 'Visão Geral', icon: PieChart },
              { id: 'development', label: 'Desenvolvimento', icon: TrendingUp },
              { id: 'questionnaires', label: 'Questionários', icon: ClipboardList },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
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

        {/* TAB: Visão Geral */}
        {activeTab === 'overview' && (
          <>
            {/* Dica de saúde */}
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-0 shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <TipIcon className={`h-6 w-6 ${healthTips[currentTip].color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Dica de Saúde</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {healthTips[currentTip].text}
                  </p>
                </div>
                <div className="flex gap-1">
                  {healthTips.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentTip ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dimensões de Saúde */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Suas Aptidões de Saúde</CardTitle>
                      <CardDescription>Complete os questionários para avaliar</CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-indigo-600"
                    onClick={() => setActiveTab('questionnaires')}
                  >
                    Avaliar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {healthDimensions.map((dim) => (
                    <div key={dim.name} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <dim.icon className={`h-4 w-4 ${dim.color}`} />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{dim.name}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold">
                          {dim.score !== null ? dim.score : '—'}
                        </span>
                        <div className="flex-1 ml-3">
                          <Progress value={dim.score || 0} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {evaluatedDimensions.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Complete os questionários para ver suas aptidões de saúde
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cards principais - Prescrições e Consultas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Prescrições */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
                        <Pill className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Minhas Prescrições</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {activePrescriptions > 0 
                            ? `${activePrescriptions} medicamento(s) ativo(s)` 
                            : 'Nenhum medicamento ativo'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {activePrescriptions === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Pill className="h-7 w-7 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">Nenhuma prescrição ativa.</p>
                    </div>
                  ) : (
                    prescriptions
                      .filter(p => p.status === 'ACTIVE')
                      .slice(0, 2)
                      .map((prescription) => (
                        <div key={prescription.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Pill className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{prescription.medicationName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {prescription.dosage && `${prescription.dosage}`}
                                {prescription.frequency && ` • ${prescription.frequency}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  <Link href="/minha-saude/receitas">
                    <Button variant="ghost" className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                      Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Consultas */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-md">
                        <Stethoscope className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-base">Próximas Consultas</CardTitle>
                    </div>
                    {upcomingConsultations > 0 && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50">
                        {upcomingConsultations}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {upcomingConsultations === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Calendar className="h-7 w-7 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">Nenhuma consulta agendada.</p>
                      <Link href="/minha-saude/agendar">
                        <Button className="mt-3 bg-purple-600 hover:bg-purple-700" size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    consultations.slice(0, 2).map((consultation) => (
                      <div key={consultation.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/50 dark:to-violet-900/50 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-lg font-bold text-purple-600">
                            {format(parseISO(consultation.date), 'd')}
                          </span>
                          <span className="text-[10px] text-purple-500 uppercase font-medium">
                            {format(parseISO(consultation.date), 'MMM', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {consultation.professional?.name || 'Profissional'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(consultation.date), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/minha-saude/consultas">
                    <Button variant="ghost" className="w-full mt-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                      Ver agenda <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Acesso Rápido */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">Acesso Rápido</h3>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {[
                  { href: '/minha-saude/equipe', icon: Users, label: 'Equipe', color: 'bg-teal-100 dark:bg-teal-900/50', iconColor: 'text-teal-600' },
                  { href: '/minha-saude/exames', icon: Activity, label: 'Exames', color: 'bg-blue-100 dark:bg-blue-900/50', iconColor: 'text-blue-600' },
                  { href: '/minha-saude/sinais-vitais', icon: HeartPulse, label: 'Sinais', color: 'bg-red-100 dark:bg-red-900/50', iconColor: 'text-red-600' },
                  { href: '/minha-saude/historico', icon: FileText, label: 'Histórico', color: 'bg-green-100 dark:bg-green-900/50', iconColor: 'text-green-600' },
                  { href: '/minha-saude/receitas', icon: Pill, label: 'Receitas', color: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600', hideOnMobile: true },
                  { href: '/minha-saude/consultas', icon: Calendar, label: 'Consultas', color: 'bg-violet-100 dark:bg-violet-900/50', iconColor: 'text-violet-600', hideOnMobile: true },
                  { href: '/minha-saude/notificacoes', icon: Bell, label: 'Avisos', color: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600', hideOnMobile: true },
                  { href: '/minha-saude/perfil', icon: User, label: 'Perfil', color: 'bg-slate-100 dark:bg-slate-900/50', iconColor: 'text-slate-600', hideOnMobile: true },
                ].map((item) => (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    className={`flex flex-col items-center group ${item.hideOnMobile ? 'hidden md:flex' : ''}`}
                  >
                    <div className={`p-3 ${item.color} rounded-2xl mb-1.5 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                      <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-center font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB: Desenvolvimento Pessoal */}
        {activeTab === 'development' && (
          <>
            {/* Estado vazio - Sem metas cadastradas */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Metas de Desenvolvimento</CardTitle>
                      <CardDescription>Defina objetivos para sua saúde</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <Target className="h-10 w-10 text-amber-500 opacity-50" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Nenhuma meta definida</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Defina metas pessoais para acompanhar seu progresso em hidratação, exercícios, sono e mais.
                  </p>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira meta
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hábitos - Estado vazio */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-md">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Hábitos Saudáveis</CardTitle>
                    <CardDescription>Registre seus comportamentos diários</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-8 w-8 text-teal-500 opacity-50" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete os questionários para receber recomendações personalizadas de hábitos saudáveis.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('questionnaires')}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Ir para Questionários
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conquistas - Estado vazio */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-md">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Conquistas</CardTitle>
                    <CardDescription>Desbloqueie medalhas de progresso</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[
                    { icon: Flame, label: '7 dias consecutivos', color: 'from-orange-500 to-red-500' },
                    { icon: Droplets, label: 'Hidratação perfeita', color: 'from-blue-500 to-cyan-500' },
                    { icon: Heart, label: 'Check-up completo', color: 'from-pink-500 to-rose-500' },
                    { icon: Target, label: 'Meta mensal', color: 'from-green-500 to-emerald-500' },
                    { icon: ClipboardList, label: 'Todas avaliações', color: 'from-purple-500 to-violet-500' },
                  ].map((badge, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-shrink-0">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <Lock className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-[10px] text-center mt-2 max-w-[80px] text-gray-400">
                        {badge.label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Complete metas e questionários para desbloquear conquistas
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* TAB: Questionários */}
        {activeTab === 'questionnaires' && (
          <>
            {/* Progresso geral */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Diagnóstico Integrativo</h3>
                    <p className="text-indigo-100 text-sm mt-1">
                      Complete as avaliações para um perfil completo
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{completedQuestionnaires}/{totalQuestionnaires}</p>
                    <p className="text-indigo-200 text-xs">avaliações completas</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={(completedQuestionnaires / totalQuestionnaires) * 100} className="h-2 bg-white/20" />
                </div>
              </CardContent>
            </Card>

            {/* Lista de Questionários */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1">
                Questionários Disponíveis
              </h3>
              {questionnaires.map((q) => (
                <Card 
                  key={q.id} 
                  className={`border-0 shadow-md rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${q.bgColor}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 bg-gradient-to-br ${q.color} rounded-xl shadow-md`}>
                        <q.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{q.title}</h4>
                          {q.completed ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completo
                            </Badge>
                          ) : q.progress > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50">
                              {q.progress}%
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{q.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {q.questions} perguntas
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {q.time}
                          </span>
                        </div>
                        {!q.completed && q.progress > 0 && (
                          <Progress value={q.progress} className="h-1.5 mt-2" />
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className={q.completed ? 'bg-gray-200 text-gray-600' : `bg-gradient-to-r ${q.color} text-white`}
                      >
                        {q.completed ? 'Ver' : q.progress > 0 ? 'Continuar' : 'Iniciar'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefícios */}
            <Card className="border-0 shadow-md rounded-2xl mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Por que completar as avaliações?</h4>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Diagnóstico integrativo personalizado
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Identificação de áreas de melhoria
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Recomendações baseadas em evidências
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Acompanhamento do seu progresso
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Contato rápido */}
        <Card className="border-0 shadow-md rounded-2xl mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500 rounded-xl">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Precisa de ajuda?</p>
                  <p className="text-xs text-muted-foreground">Fale com a recepção</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-white dark:bg-gray-800">
                  <Phone className="h-4 w-4 mr-1" />
                  Ligar
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t shadow-lg px-2 py-2 md:hidden safe-area-inset-bottom z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/minha-saude" className="flex flex-col items-center py-1.5 px-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Heart className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-[10px] mt-1 font-medium text-blue-600">Início</span>
          </Link>
          <Link href="/minha-saude/receitas" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600 transition-colors">
            <Pill className="h-5 w-5" />
            <span className="text-[10px] mt-1">Remédios</span>
          </Link>
          <Link href="/minha-saude/agendar" className="flex flex-col items-center -mt-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] mt-1 text-blue-600 font-medium">Agendar</span>
          </Link>
          <Link href="/minha-saude/exames" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600 transition-colors">
            <Activity className="h-5 w-5" />
            <span className="text-[10px] mt-1">Exames</span>
          </Link>
          <Link href="/minha-saude/perfil" className="flex flex-col items-center py-1.5 px-3 text-gray-500 hover:text-blue-600 transition-colors">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{firstName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] mt-1">Perfil</span>
          </Link>
        </div>
      </nav>

      {/* Cartão de Saúde Digital */}
      <Dialog open={healthCardOpen} onOpenChange={setHealthCardOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Cartão de Saúde Digital</DialogTitle>
          </DialogHeader>
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-6 w-6" />
                <span className="font-bold text-lg">HealthCare</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-blue-200 uppercase tracking-wide">Nome do Paciente</p>
                  <p className="text-lg font-bold">{fullName}</p>
                </div>
                
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-wide">ID</p>
                    <p className="font-mono text-sm">{patientData?.id?.slice(-8).toUpperCase() || '--------'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-200 uppercase tracking-wide">Válido</p>
                    <p className="font-mono text-sm">{format(new Date(), 'MM/yyyy')}</p>
                  </div>
                </div>

                <div className="flex justify-center mt-4 bg-white rounded-lg p-3">
                  <QrCode className="h-24 w-24 text-gray-800" />
                </div>
                
                <p className="text-center text-xs text-blue-200 mt-2">
                  Apresente este cartão nas unidades de saúde
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
