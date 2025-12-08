'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  ArrowLeft,
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  Activity,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Download,
  Search,
  Filter,
  Inbox,
  ClipboardList,
  Syringe,
  Scissors
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MedicalRecord {
  id: string
  type: 'CONSULTATION' | 'EXAM' | 'PRESCRIPTION' | 'PROCEDURE' | 'VACCINATION' | 'ALLERGY' | 'CONDITION'
  title: string
  description?: string
  date: string
  professional?: {
    name: string
    specialty?: string
  }
  documents?: {
    id: string
    name: string
  }[]
}

const typeConfig: Record<string, { label: string; icon: typeof FileText; color: string; bgColor: string }> = {
  CONSULTATION: {
    label: 'Consulta',
    icon: Stethoscope,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/50'
  },
  EXAM: {
    label: 'Exame',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50'
  },
  PRESCRIPTION: {
    label: 'Prescrição',
    icon: Pill,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/50'
  },
  PROCEDURE: {
    label: 'Procedimento',
    icon: Scissors,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/50'
  },
  VACCINATION: {
    label: 'Vacina',
    icon: Syringe,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/50'
  },
  ALLERGY: {
    label: 'Alergia',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/50'
  },
  CONDITION: {
    label: 'Condição',
    icon: ClipboardList,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50'
  }
}

export default function HistoricoPacientePage() {
  const { data: session } = useSession()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'consultations' | 'exams' | 'prescriptions'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/patient/medical-records')
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setRecords(data)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = (records: MedicalRecord[]) => {
    switch (activeTab) {
      case 'consultations':
        return records.filter(r => r.type === 'CONSULTATION')
      case 'exams':
        return records.filter(r => r.type === 'EXAM')
      case 'prescriptions':
        return records.filter(r => r.type === 'PRESCRIPTION')
      default:
        return records
    }
  }

  const filteredRecords = filterRecords(records)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Agrupar por ano/mês
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const date = parseISO(record.date)
    const key = format(date, "MMMM 'de' yyyy", { locale: ptBR })
    if (!groups[key]) groups[key] = []
    groups[key].push(record)
    return groups
  }, {} as Record<string, MedicalRecord[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
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
                <h1 className="text-lg font-semibold">Meu Histórico</h1>
                <p className="text-xs text-muted-foreground">
                  {records.length} registro(s)
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs de filtro */}
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button 
            size="sm" 
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
            className="rounded-full whitespace-nowrap"
          >
            Todos
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === 'consultations' ? 'default' : 'outline'}
            onClick={() => setActiveTab('consultations')}
            className="rounded-full whitespace-nowrap"
          >
            Consultas
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === 'exams' ? 'default' : 'outline'}
            onClick={() => setActiveTab('exams')}
            className="rounded-full whitespace-nowrap"
          >
            Exames
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === 'prescriptions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('prescriptions')}
            className="rounded-full whitespace-nowrap"
          >
            Prescrições
          </Button>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="max-w-2xl mx-auto px-4">
        {filteredRecords.length === 0 ? (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Inbox className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Nenhum registro encontrado
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab !== 'all' 
                  ? 'Nenhum registro corresponde ao filtro selecionado'
                  : 'Seu histórico médico aparecerá aqui'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedRecords).map(([period, periodRecords]) => (
            <div key={period} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground capitalize mb-3 px-1">
                {period}
              </h3>
              <div className="space-y-2">
                {periodRecords.map((record) => {
                  const config = typeConfig[record.type] || typeConfig.CONSULTATION
                  const Icon = config.icon

                  return (
                    <Card key={record.id} className="border-0 shadow-md rounded-2xl overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className={`p-3 ${config.bgColor} rounded-xl flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-sm">{record.title}</h4>
                                  <Badge variant="outline" className="text-[10px]">
                                    {config.label}
                                  </Badge>
                                </div>
                                {record.description && (
                                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                    {record.description}
                                  </p>
                                )}
                                {record.professional && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Dr(a). {record.professional.name}
                                    {record.professional.specialty && ` • ${record.professional.specialty}`}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {format(parseISO(record.date), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                              {record.documents && record.documents.length > 0 && (
                                <Button variant="ghost" size="sm" className="flex-shrink-0">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
