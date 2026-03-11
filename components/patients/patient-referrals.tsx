'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRightCircle, Building2, UserCircle } from 'lucide-react'

interface Referral {
  id: string
  specialty?: string | null
  reason: string
  priority?: string | null
  status: string
  createdAt: string | Date
  doctor: {
    name: string
  }
  targetOccupation?: {
    id: string
    code: string
    title: string
    familyGroup?: {
      code: string
      title: string
    }
  } | null
  destinationUnit?: {
    id: string
    name: string
    type: string
  } | null
}

interface PatientReferralsProps {
  referrals: Referral[]
}

export function PatientReferrals({ referrals }: PatientReferralsProps) {
  if (referrals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5" />
            Encaminhamentos
          </CardTitle>
          <CardDescription>
            Histórico de encaminhamentos para especialistas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum encaminhamento registrado
          </p>
        </CardContent>
      </Card>
    )
  }

  // Agrupar por status
  const pending = referrals.filter(r => r.status === 'pending')
  const scheduled = referrals.filter(r => r.status === 'scheduled')
  const completed = referrals.filter(r => r.status === 'completed')
  const others = referrals.filter(r => !['pending', 'scheduled', 'completed'].includes(r.status))

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return "default"
      case 'scheduled': return "secondary"
      case 'pending': return "outline"
      case 'cancelled': return "destructive"
      default: return "outline"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído'
      case 'scheduled': return 'Agendado'
      case 'pending': return 'Pendente'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getPriorityVariant = (priority?: string | null): "default" | "secondary" | "destructive" => {
    if (!priority) return "secondary"
    switch (priority.toLowerCase()) {
      case 'urgente':
      case 'alta':
        return "destructive"
      case 'média':
      case 'moderada':
        return "default"
      case 'baixa':
      case 'rotina':
        return "secondary"
      default:
        return "secondary"
    }
  }

  const renderReferralCard = (referral: Referral) => {
    const isCBO = !!referral.targetOccupation
    const specialtyName = isCBO
      ? referral.targetOccupation!.title
      : referral.specialty || 'Especialidade não especificada'
    
    return (
      <div 
        key={referral.id} 
        className={`border rounded-lg p-4 ${
          referral.status === 'completed' 
            ? 'bg-green-50 dark:bg-green-950/10' 
            : referral.status === 'pending'
            ? 'bg-yellow-50 dark:bg-yellow-950/10'
            : 'bg-muted/30'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="h-4 w-4" />
              <h4 className="font-semibold text-sm">
                {specialtyName}
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={getStatusVariant(referral.status)} className="text-xs">
                {getStatusLabel(referral.status)}
              </Badge>
              {referral.priority && (
                <Badge variant={getPriorityVariant(referral.priority)} className="text-xs">
                  Prioridade: {referral.priority}
                </Badge>
              )}
              {isCBO && (
                <Badge variant="outline" className="text-xs font-mono">
                  CBO: {referral.targetOccupation!.code}
                </Badge>
              )}
            </div>

            {isCBO && referral.targetOccupation!.familyGroup && (
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Grupo Familiar:</span>{' '}
                {referral.targetOccupation!.familyGroup.code} - {referral.targetOccupation!.familyGroup.title}
              </div>
            )}

            {referral.destinationUnit && (
              <div className="flex items-center gap-1 text-sm mb-2">
                <Building2 className="h-3 w-3" />
                <span className="font-medium">Unidade:</span>{' '}
                <span className="text-muted-foreground">
                  {referral.destinationUnit.name}
                </span>
                <Badge variant="secondary" className="text-xs ml-2">
                  {referral.destinationUnit.type}
                </Badge>
              </div>
            )}

            <div className="text-sm mt-2">
              <span className="font-medium">Motivo:</span>
              <p className="text-muted-foreground mt-1 border-l-2 border-blue-300 pl-2">
                {referral.reason}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          Encaminhado em {format(new Date(referral.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por 
          Dr(a). {referral.doctor.name}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Encaminhamentos Pendentes */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-yellow-500" />
              Encaminhamentos Pendentes
              <Badge variant="outline" className="bg-yellow-500/10">
                {pending.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Aguardando agendamento ou consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map(renderReferralCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encaminhamentos Agendados */}
      {scheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-blue-500" />
              Encaminhamentos Agendados
              <Badge variant="secondary">{scheduled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduled.map(renderReferralCard)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encaminhamentos Concluídos */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-green-500" />
              Encaminhamentos Concluídos
              <Badge variant="default" className="bg-green-500">
                {completed.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.slice(0, 5).map(renderReferralCard)}
              {completed.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {completed.length - 5} encaminhamentos concluídos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outros Status */}
      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-muted-foreground" />
              Outros Encaminhamentos
              <Badge variant="outline">{others.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {others.map(renderReferralCard)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
