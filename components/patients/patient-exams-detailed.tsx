'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface ExamRequest {
  id: string
  examType?: string | null
  description?: string | null
  status: string
  urgency?: string | null
  justification?: string | null
  results?: string | null
  resultsDate?: string | Date | null
  createdAt: string | Date
  doctor: {
    name: string
  }
  procedimento?: {
    id: string
    codigo: string
    nome: string
    complexidade?: string | null
  } | null
}

interface PatientExamsDetailedProps {
  exams: ExamRequest[]
}

export function PatientExamsDetailed({ exams }: PatientExamsDetailedProps) {
  if (exams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exames
          </CardTitle>
          <CardDescription>
            Histórico de solicitações e resultados de exames
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum exame solicitado
          </p>
        </CardContent>
      </Card>
    )
  }

  // Agrupar por status
  const pending = exams.filter(e => e.status === 'pending')
  const completed = exams.filter(e => e.status === 'completed')
  const inProgress = exams.filter(e => e.status === 'in_progress')
  const cancelled = exams.filter(e => e.status === 'cancelled')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído'
      case 'in_progress': return 'Em andamento'
      case 'pending': return 'Pendente'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return "default"
      case 'in_progress': return "secondary"
      case 'pending': return "outline"
      case 'cancelled': return "destructive"
      default: return "outline"
    }
  }

  const getUrgencyVariant = (urgency?: string | null): "default" | "secondary" | "destructive" => {
    if (!urgency) return "secondary"
    switch (urgency.toLowerCase()) {
      case 'urgente':
      case 'emergência':
        return "destructive"
      case 'alta':
        return "default"
      case 'normal':
      case 'rotina':
        return "secondary"
      default:
        return "secondary"
    }
  }

  const renderExamCard = (exam: ExamRequest) => {
    const isSIGTAP = !!exam.procedimento
    const examName = isSIGTAP 
      ? exam.procedimento!.nome
      : exam.examType || 'Exame não especificado'
    const hasResults = !!exam.results
    
    return (
      <div 
        key={exam.id} 
        className={`border rounded-lg p-4 ${
          exam.status === 'completed' 
            ? 'bg-green-50 dark:bg-green-950/10' 
            : exam.status === 'pending'
            ? 'bg-yellow-50 dark:bg-yellow-950/10'
            : 'bg-muted/30'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(exam.status)}
              <h4 className="font-semibold text-sm">
                {examName}
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={getStatusVariant(exam.status)} className="text-xs">
                {getStatusLabel(exam.status)}
              </Badge>
              {isSIGTAP && (
                <Badge variant="outline" className="text-xs font-mono">
                  {exam.procedimento!.codigo}
                </Badge>
              )}
              {exam.urgency && (
                <Badge variant={getUrgencyVariant(exam.urgency)} className="text-xs">
                  {exam.urgency}
                </Badge>
              )}
              {isSIGTAP && exam.procedimento!.complexidade && (
                <Badge variant="secondary" className="text-xs">
                  {exam.procedimento!.complexidade}
                </Badge>
              )}
            </div>

            {exam.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {exam.description}
              </p>
            )}

            {exam.justification && (
              <div className="text-sm mb-2">
                <span className="font-medium">Justificativa:</span>{' '}
                <span className="text-muted-foreground">{exam.justification}</span>
              </div>
            )}

            {hasResults && (
              <div className="mt-3 p-3 bg-background rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">Resultado</span>
                  {exam.resultsDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(exam.resultsDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {exam.results}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          Solicitado em {format(new Date(exam.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por 
          Dr(a). {exam.doctor.name}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Exames Pendentes */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Exames Pendentes
              <Badge variant="outline" className="bg-yellow-500/10">
                {pending.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Exames aguardando realização ou resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map(renderExamCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exames em Andamento */}
      {inProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Exames em Andamento
              <Badge variant="secondary">{inProgress.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgress.map(renderExamCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exames Concluídos */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Exames Concluídos
              <Badge variant="default" className="bg-green-500">
                {completed.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.map(renderExamCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exames Cancelados (se houver) */}
      {cancelled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Exames Cancelados
              <Badge variant="destructive">{cancelled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cancelled.slice(0, 5).map(renderExamCard)}
              {cancelled.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {cancelled.length - 5} exames cancelados
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
