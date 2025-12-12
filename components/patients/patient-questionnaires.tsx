'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Brain,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Questionnaire {
  id: string
  status: string
  progressPercent: number
  sentAt: string
  completedAt: string | null
  expiresAt: string | null
  aiAnalysis: any | null
  aiAnalyzedAt: string | null
  template: {
    id: string
    name: string
    iconEmoji: string
    therapeuticSystem: string
    themeColor: string | null
  }
  sentBy: {
    name: string
  }
}

interface PatientQuestionnairesProps {
  patientId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  PENDING: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: 'Expirado', color: 'bg-red-100 text-red-800', icon: XCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle }
}

const SYSTEM_LABELS: Record<string, string> = {
  AYURVEDA: 'Ayurveda',
  HOMEOPATHY: 'Homeopatia',
  TCM: 'MTC',
  ANTHROPOSOPHY: 'Antroposofia',
  GENERAL: 'Geral'
}

export function PatientQuestionnaires({ patientId }: PatientQuestionnairesProps) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestionnaires()
  }, [patientId])

  async function fetchQuestionnaires() {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/questionnaires`)
      if (res.ok) {
        const data = await res.json()
        setQuestionnaires(data)
      }
    } catch (error) {
      console.error('Error fetching questionnaires:', error)
    } finally {
      setLoading(false)
    }
  }

  const completedCount = questionnaires.filter(q => q.status === 'COMPLETED').length
  const pendingCount = questionnaires.filter(q => q.status === 'PENDING' || q.status === 'IN_PROGRESS').length
  const analyzedCount = questionnaires.filter(q => q.aiAnalysis).length

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{questionnaires.length}</p>
              <p className="text-sm text-muted-foreground">Total Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Respondidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{analyzedCount}</p>
              <p className="text-sm text-muted-foreground">Analisados IA</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Questionários do Paciente
              </CardTitle>
              <CardDescription>
                Histórico de questionários enviados e respondidos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchQuestionnaires}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button asChild size="sm">
                <a href={`/questionnaires?patientId=${patientId}`}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Novo
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questionnaires.length > 0 ? (
            <div className="space-y-4">
              {questionnaires.map((q) => {
                const StatusIcon = STATUS_CONFIG[q.status]?.icon || AlertCircle
                const statusConfig = STATUS_CONFIG[q.status] || STATUS_CONFIG.PENDING
                const themeColor = q.template.themeColor || '#10B981'
                
                return (
                  <div
                    key={q.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all"
                    style={{ borderLeftColor: themeColor, borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{q.template.iconEmoji}</span>
                        <div>
                          <h4 className="font-medium">{q.template.name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {SYSTEM_LABELS[q.template.therapeuticSystem] || q.template.therapeuticSystem}
                            </Badge>
                            <span>•</span>
                            <span>
                              Enviado {formatDistanceToNow(new Date(q.sentAt), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        
                        {q.aiAnalysis && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            <Brain className="h-3 w-3 mr-1" />
                            Analisado
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar for in-progress */}
                    {q.status === 'IN_PROGRESS' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progresso</span>
                          <span>{q.progressPercent}%</span>
                        </div>
                        <Progress value={q.progressPercent} className="h-2" />
                      </div>
                    )}

                    {/* Completed info */}
                    {q.status === 'COMPLETED' && q.completedAt && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />
                          Respondido em {new Date(q.completedAt).toLocaleDateString('pt-BR')}
                        </span>
                        
                        <Button asChild variant="outline" size="sm">
                          <a href={`/questionnaires/responses/${q.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Respostas
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Expiry warning */}
                    {q.status === 'PENDING' && q.expiresAt && (
                      <div className="mt-3 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Expira {formatDistanceToNow(new Date(q.expiresAt), { addSuffix: true, locale: ptBR })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum questionário enviado</p>
              <p className="text-sm mt-1">Envie um questionário para conhecer melhor este paciente</p>
              <Button asChild className="mt-4">
                <a href={`/questionnaires?patientId=${patientId}`}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Primeiro Questionário
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
