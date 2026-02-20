'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  AlertTriangle,
  Info,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TIPOS ============

export type ControlledList = 
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2'
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5'
  | 'D1' | 'D2'
  | 'E' | 'F'
  | 'ANTIMICROBIAL'
  | 'NONE'

export type PaperColor = 'WHITE' | 'BLUE' | 'YELLOW'

export interface MedicationControlInfo {
  name: string
  list: ControlledList
  prescriptionType: string
  validityDays: number
  maxQuantityDays: number
  requiresNotification: boolean
  copies: number
  paperColor: PaperColor
  specialInstructions: string[]
}

interface ControlledMedicationBadgeProps {
  medicationName: string
  showTooltip?: boolean
  className?: string
}

interface ControlledPrescriptionIndicatorProps {
  medications: Array<{ name: string; id?: string }>
  className?: string
}

// ============ HELPERS ============

function getListConfig(list: ControlledList) {
  const configs: Record<ControlledList, { 
    color: string
    bgColor: string
    label: string
    description: string
  }> = {
    'A1': { color: 'text-amber-800', bgColor: 'bg-amber-100', label: 'A1', description: 'Notificação Amarela - Entorpecentes' },
    'A2': { color: 'text-amber-800', bgColor: 'bg-amber-100', label: 'A2', description: 'Notificação Amarela - Entorpecentes' },
    'A3': { color: 'text-amber-800', bgColor: 'bg-amber-100', label: 'A3', description: 'Notificação Amarela - Psicotrópicos' },
    'B1': { color: 'text-blue-800', bgColor: 'bg-blue-100', label: 'B1', description: 'Notificação Azul - Psicotrópicos' },
    'B2': { color: 'text-blue-800', bgColor: 'bg-blue-100', label: 'B2', description: 'Notificação Azul - Anorexígenos' },
    'C1': { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'C1', description: 'Receita Branca 2 vias' },
    'C2': { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'C2', description: 'Retinóides - Receita 2 vias' },
    'C3': { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'C3', description: 'Imunossupressores' },
    'C4': { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'C4', description: 'Anti-retrovirais' },
    'C5': { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'C5', description: 'Anabolizantes' },
    'D1': { color: 'text-purple-800', bgColor: 'bg-purple-100', label: 'D1', description: 'Precursores' },
    'D2': { color: 'text-purple-800', bgColor: 'bg-purple-100', label: 'D2', description: 'Precursores' },
    'E': { color: 'text-green-800', bgColor: 'bg-green-100', label: 'E', description: 'Plantas' },
    'F': { color: 'text-red-800', bgColor: 'bg-red-100', label: 'F', description: 'PROIBIDO' },
    'ANTIMICROBIAL': { color: 'text-orange-800', bgColor: 'bg-orange-100', label: 'ATB', description: 'Antimicrobiano - RDC 20' },
    'NONE': { color: 'text-gray-500', bgColor: 'bg-gray-50', label: '-', description: 'Sem controle especial' }
  }
  return configs[list]
}

// ============ COMPONENTES ============

/**
 * Badge indicador de medicamento controlado
 */
export function ControlledMedicationBadge({
  medicationName,
  showTooltip = true,
  className
}: ControlledMedicationBadgeProps) {
  const [info, setInfo] = useState<MedicationControlInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkControl = async () => {
      try {
        const response = await fetch(
          `/api/prescriptions/controlled?medications=${encodeURIComponent(medicationName)}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.medications?.[0]) {
            setInfo(data.medications[0])
          }
        }
      } catch (error) {
        console.error('Erro ao verificar controle:', error)
      } finally {
        setLoading(false)
      }
    }

    checkControl()
  }, [medicationName])

  if (loading || !info || info.list === 'NONE') {
    return null
  }

  const config = getListConfig(info.list)
  
  const badge = (
    <Badge 
      variant="outline" 
      className={cn(config.bgColor, config.color, 'text-xs font-bold', className)}
    >
      {config.label}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">{config.description}</p>
          <ul className="text-xs mt-1 space-y-1">
            <li>• Validade: {info.validityDays} dias</li>
            <li>• Quantidade máx: {info.maxQuantityDays} dias</li>
            <li>• Vias: {info.copies}</li>
            {info.requiresNotification && (
              <li className="text-amber-600">• Notificação obrigatória</li>
            )}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Indicador de tipo de receituário necessário
 */
export function ControlledPrescriptionIndicator({
  medications,
  className
}: ControlledPrescriptionIndicatorProps) {
  const [summary, setSummary] = useState<{
    hasControlled: boolean
    requiresNotification: boolean
    highestControlList: string
    paperColor: PaperColor
    copies: number
    minValidityDays: number
    medicationsInfo: MedicationControlInfo[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (medications.length === 0) {
      setSummary(null)
      return
    }

    const checkMedications = async () => {
      try {
        setLoading(true)
        const names = medications.map(m => m.name).join(',')
        const response = await fetch(
          `/api/prescriptions/controlled?medications=${encodeURIComponent(names)}`
        )
        if (response.ok) {
          const data = await response.json()
          setSummary({
            ...data.summary,
            medicationsInfo: data.medications
          })
        }
      } catch (error) {
        console.error('Erro ao verificar medicamentos:', error)
      } finally {
        setLoading(false)
      }
    }

    checkMedications()
  }, [medications])

  if (loading || !summary || !summary.hasControlled) {
    return null
  }

  const paperColorConfig = {
    YELLOW: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', label: 'AMARELA' },
    BLUE: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', label: 'AZUL' },
    WHITE: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', label: 'BRANCA' }
  }

  const colorConfig = paperColorConfig[summary.paperColor]

  return (
    <Alert className={cn(colorConfig.bg, colorConfig.border, 'border-2', className)}>
      <FileText className={cn('h-4 w-4', colorConfig.text)} />
      <AlertDescription className={colorConfig.text}>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold">
              {summary.requiresNotification ? 'Notificação' : 'Receita'} {colorConfig.label}
            </span>
            <span className="ml-2 text-sm">
              ({summary.copies} vias • Válida por {summary.minValidityDays} dias)
            </span>
          </div>
          {summary.requiresNotification && (
            <Badge variant="outline" className={cn(colorConfig.text, 'font-bold')}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              NOTIFICAÇÃO OBRIGATÓRIA
            </Badge>
          )}
        </div>
        
        <div className="mt-2 text-xs space-y-1">
          {summary.medicationsInfo.filter(m => m.list !== 'NONE').map((med, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Lista {med.list}
              </Badge>
              <span>{med.name}</span>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Dialog de preview e impressão do receituário
 */
export function ControlledPrescriptionPreview({
  patientId,
  medications,
  onGenerated
}: {
  patientId: string
  medications: Array<{
    name: string
    concentration?: string
    form?: string
    quantity: number
    dosage: string
    instructions?: string
  }>
  onGenerated?: (notificationNumber?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [prescriptionInfo, setPrescriptionInfo] = useState<{
    type: string
    paperColor: string
    copies: number
    validityDays: number
    notificationNumber?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generatePrescription = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/prescriptions/controlled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          medications
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar receituário')
      }

      setHtml(data.prescription.html)
      setPrescriptionInfo(data.prescription)
      onGenerated?.(data.prescription.notificationNumber)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!html) return

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receituario_${prescriptionInfo?.notificationNumber || 'controlado'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => { setOpen(true); generatePrescription() }}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar Receituário Especial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receituário Controlado</DialogTitle>
          <DialogDescription>
            {prescriptionInfo && (
              <span className="flex items-center gap-2">
                Tipo: {prescriptionInfo.type} • 
                Papel: {prescriptionInfo.paperColor} • 
                {prescriptionInfo.copies} vias
                {prescriptionInfo.notificationNumber && (
                  <Badge variant="outline">
                    Nº {prescriptionInfo.notificationNumber}
                  </Badge>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {html && (
          <>
            <div 
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="default" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar HTML
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
