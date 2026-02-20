'use client'

import { useState, useEffect, useCallback } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TIPOS ============

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AllergyAlert {
  severity: AlertSeverity
  type: 'ALLERGY_MATCH' | 'CROSS_REACTIVITY' | 'DRUG_CLASS' | 'ADVERSE_HISTORY'
  medicationName: string
  medicationId?: string
  allergen: string
  message: string
  recommendation: string
}

export interface AllergyCheckResult {
  hasAlerts: boolean
  alerts: AllergyAlert[]
  patientAllergies: string[]
  checkedMedications: string[]
}

interface AllergyAlertDisplayProps {
  patientId: string
  medications: Array<{ name: string; id?: string }>
  onAlertConfirmed?: (acknowledged: boolean) => void
  className?: string
  showSummary?: boolean
}

// ============ HELPERS ============

function getSeverityConfig(severity: AlertSeverity) {
  const configs = {
    CRITICAL: {
      color: 'bg-red-100 border-red-500 text-red-900',
      badgeVariant: 'destructive' as const,
      icon: AlertOctagon,
      iconColor: 'text-red-600',
      label: 'CRÍTICO'
    },
    HIGH: {
      color: 'bg-orange-100 border-orange-500 text-orange-900',
      badgeVariant: 'destructive' as const,
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      label: 'ALTO'
    },
    MEDIUM: {
      color: 'bg-yellow-100 border-yellow-500 text-yellow-900',
      badgeVariant: 'default' as const,
      icon: ShieldAlert,
      iconColor: 'text-yellow-600',
      label: 'MÉDIO'
    },
    LOW: {
      color: 'bg-blue-100 border-blue-500 text-blue-900',
      badgeVariant: 'secondary' as const,
      icon: Info,
      iconColor: 'text-blue-600',
      label: 'BAIXO'
    }
  }
  return configs[severity]
}

// ============ COMPONENTE PRINCIPAL ============

export function AllergyAlertDisplay({
  patientId,
  medications,
  onAlertConfirmed,
  className,
  showSummary = true
}: AllergyAlertDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AllergyCheckResult | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)

  // Verificar alergias quando medicamentos mudam
  const checkAllergies = useCallback(async () => {
    if (!patientId || medications.length === 0) {
      setResult(null)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/allergies/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medications })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setAcknowledged(false)
      }
    } catch (error) {
      console.error('Erro ao verificar alergias:', error)
    } finally {
      setLoading(false)
    }
  }, [patientId, medications])

  useEffect(() => {
    // Debounce para não fazer muitas requisições
    const timer = setTimeout(() => {
      checkAllergies()
    }, 500)

    return () => clearTimeout(timer)
  }, [checkAllergies])

  // Sem alertas
  if (!result || !result.hasAlerts) {
    if (!showSummary) return null

    // Se não temos resultado ainda, mostrar mensagem genérica
    if (!result) {
      return (
        <Alert className={cn('bg-gray-50 border-gray-200', className)}>
          <CheckCircle2 className="h-4 w-4 text-gray-600" />
          <AlertTitle className="text-gray-800">Verificando alergias...</AlertTitle>
          <AlertDescription className="text-gray-700">
            Aguardando seleção de medicamentos para verificar possíveis alergias.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Alert className={cn('bg-green-50 border-green-200', className)}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Nenhuma alergia detectada</AlertTitle>
        <AlertDescription className="text-green-700">
          {result.patientAllergies.length === 0 ? (
            'Paciente não possui alergias registradas no sistema.'
          ) : (
            `Paciente possui alergias registradas (${result.patientAllergies.join(', ')}), mas não há conflito com os medicamentos selecionados.`
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Alertas encontrados
  const criticalAlerts = result.alerts.filter(a => a.severity === 'CRITICAL')
  const highAlerts = result.alerts.filter(a => a.severity === 'HIGH')
  const otherAlerts = result.alerts.filter(a => a.severity !== 'CRITICAL' && a.severity !== 'HIGH')

  const hasCritical = criticalAlerts.length > 0
  const hasHigh = highAlerts.length > 0

  return (
    <div className={cn('space-y-3', className)}>
      {/* Banner principal */}
      <Alert className={cn(
        'border-2',
        hasCritical ? 'bg-red-100 border-red-500' : 'bg-orange-100 border-orange-500'
      )}>
        <AlertOctagon className={cn(
          'h-5 w-5',
          hasCritical ? 'text-red-600' : 'text-orange-600'
        )} />
        <AlertTitle className={cn(
          'text-lg font-bold',
          hasCritical ? 'text-red-900' : 'text-orange-900'
        )}>
          ⚠️ ALERTA DE ALERGIA {hasCritical ? '- RISCO CRÍTICO' : ''}
        </AlertTitle>
        <AlertDescription className={cn(
          hasCritical ? 'text-red-800' : 'text-orange-800'
        )}>
          Foram detectados <strong>{result.alerts.length} alertas</strong> de possível
          reação alérgica com os medicamentos selecionados.
          {hasCritical && (
            <span className="block mt-1 font-semibold">
              ATENÇÃO: Existem conflitos críticos que exigem revisão imediata!
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Lista de alertas expansível */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>
              {expanded ? 'Ocultar' : 'Ver'} detalhes dos alertas
              ({criticalAlerts.length} críticos, {highAlerts.length} altos, {otherAlerts.length} outros)
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 mt-2">
          {/* Alertas críticos primeiro */}
          {criticalAlerts.map((alert, index) => (
            <AlertCard key={`critical-${index}`} alert={alert} />
          ))}
          
          {/* Alertas altos */}
          {highAlerts.map((alert, index) => (
            <AlertCard key={`high-${index}`} alert={alert} />
          ))}

          {/* Outros alertas */}
          {otherAlerts.map((alert, index) => (
            <AlertCard key={`other-${index}`} alert={alert} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Botão de confirmação (se houver alertas críticos) */}
      {hasCritical && (
        <AcknowledgeDialog
          alerts={result.alerts}
          acknowledged={acknowledged}
          onAcknowledge={(value) => {
            setAcknowledged(value)
            onAlertConfirmed?.(value)
          }}
        />
      )}
    </div>
  )
}

// ============ COMPONENTES AUXILIARES ============

function AlertCard({ alert }: { alert: AllergyAlert }) {
  const config = getSeverityConfig(alert.severity)
  const Icon = config.icon

  return (
    <div className={cn('rounded-lg border-l-4 p-4', config.color)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', config.iconColor)} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <span className="font-semibold">{alert.medicationName}</span>
            <span className="text-sm opacity-75">× {alert.allergen}</span>
          </div>
          <p className="text-sm mb-2">{alert.message}</p>
          <p className="text-xs opacity-80">
            <strong>Recomendação:</strong> {alert.recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}

function AcknowledgeDialog({
  alerts,
  acknowledged,
  onAcknowledge
}: {
  alerts: AllergyAlert[]
  acknowledged: boolean
  onAcknowledge: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  if (acknowledged) {
    return (
      <Alert className="bg-amber-50 border-amber-300">
        <CheckCircle2 className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-800">
            Alertas reconhecidos pelo prescritor. Prossiga com cautela.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAcknowledge(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Reconhecer alertas e prosseguir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" />
            Confirmação de Risco
          </DialogTitle>
          <DialogDescription>
            Você está prestes a prescrever medicamentos que podem causar reações
            alérgicas graves no paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4 max-h-60 overflow-y-auto">
          {alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').map((alert, i) => (
            <div key={i} className="text-sm p-2 bg-red-50 rounded">
              <strong className="text-red-700">{alert.medicationName}</strong>
              <span className="text-red-600"> - {alert.message}</span>
            </div>
          ))}
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ao prosseguir, você assume total responsabilidade clínica por esta prescrição.
            Esta ação será registrada no prontuário do paciente.
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar e revisar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onAcknowledge(true)
              setOpen(false)
            }}
          >
            Reconheço os riscos e desejo prosseguir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ HOOK PARA USO EM FORMULÁRIOS ============

export function useAllergyCheck(patientId: string) {
  const [result, setResult] = useState<AllergyCheckResult | null>(null)
  const [loading, setLoading] = useState(false)

  const checkMedications = useCallback(async (medications: Array<{ name: string; id?: string }>) => {
    if (!patientId || medications.length === 0) {
      setResult(null)
      return null
    }

    try {
      setLoading(true)
      const response = await fetch('/api/allergies/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medications })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        return data
      }
      return null
    } catch (error) {
      console.error('Erro ao verificar alergias:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [patientId])

  return {
    result,
    loading,
    checkMedications,
    hasAlerts: result?.hasAlerts ?? false,
    hasCriticalAlerts: result?.alerts.some(a => a.severity === 'CRITICAL') ?? false
  }
}
