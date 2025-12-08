'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Activity, 
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Inbox,
  CheckCircle,
  AlertCircle,
  FlaskConical,
  Microscope,
  TestTube,
  Stethoscope,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Exam {
  id: string
  name: string
  type: string
  status: string
  requestedAt: string
  performedAt?: string
  resultAvailable: boolean
  resultUrl?: string
  notes?: string
  professional?: {
    name: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  REQUESTED: { 
    label: 'Solicitado', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    icon: Clock
  },
  SCHEDULED: { 
    label: 'Agendado', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    icon: Calendar
  },
  COLLECTED: { 
    label: 'Coletado', 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    icon: TestTube
  },
  PROCESSING: { 
    label: 'Em análise', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    icon: Microscope
  },
  COMPLETED: { 
    label: 'Concluído', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    icon: CheckCircle
  },
  CANCELLED: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    icon: AlertCircle
  }
}

export default function ExamesPacientePage() {
  const { data: session } = useSession()
  const [exams, setExams] = useState<Exam[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/patient/exams')
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setExams(data)
    } catch (error) {
      console.error('Erro ao carregar exames:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter(exam => {
    if (filter === 'pending') return ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'PROCESSING'].includes(exam.status)
    if (filter === 'completed') return exam.status === 'COMPLETED'
    return true
  })

  const pendingCount = exams.filter(e => ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'PROCESSING'].includes(e.status)).length
  const completedCount = exams.filter(e => e.status === 'COMPLETED').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/minha-saude">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Meus Exames</h1>
                <p className="text-xs text-muted-foreground">
                  {exams.length} exame(s) registrado(s)
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchExams}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-xs text-yellow-600/80">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{completedCount}</p>
              <p className="text-xs text-green-600/80">Concluídos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-2xl mx-auto px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="rounded-full whitespace-nowrap"
          >
            Todos
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            className="rounded-full whitespace-nowrap"
          >
            Pendentes
            {pendingCount > 0 && <Badge className="ml-2" variant="secondary">{pendingCount}</Badge>}
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            className="rounded-full whitespace-nowrap"
          >
            Concluídos
          </Button>
        </div>
      </div>

      {/* Lista de exames */}
      <div className="max-w-2xl mx-auto px-4 space-y-3 mt-2">
        {filteredExams.length === 0 ? (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <FlaskConical className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Nenhum exame encontrado
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filter !== 'all' 
                  ? 'Nenhum exame corresponde ao filtro selecionado'
                  : 'Você ainda não tem exames registrados'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map((exam) => {
            const config = statusConfig[exam.status] || statusConfig.REQUESTED
            const StatusIcon = config.icon

            return (
              <Card 
                key={exam.id} 
                className="border-0 shadow-md rounded-2xl overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                      <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{exam.name}</h4>
                          {exam.professional && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dr(a). {exam.professional.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${config.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(exam.requestedAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        {exam.resultAvailable && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="flex-shrink-0 text-blue-600"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
