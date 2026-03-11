'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pill, AlertTriangle, Shield, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PrescriptionItem {
  medication: string
  [key: string]: unknown
}

interface DrugInteraction {
  drugs: string[]
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  recommendation: string
}

interface DrugInteractionCheckButtonProps {
  prescriptions: PrescriptionItem[]
}

export function DrugInteractionCheckButton({ prescriptions }: DrugInteractionCheckButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    medications: string[]
    interactions: DrugInteraction[]
    contraindications: string[]
    message?: string
  } | null>(null)

  const medNames = prescriptions.map((p) => p.medication?.trim()).filter(Boolean)
  const canCheck = medNames.length >= 2

  const check = async () => {
    if (!canCheck) return
    setOpen(true)
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/ai/drug-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: medNames }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao verificar')
      setResults(json.data || json)
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Não foi possível verificar interações',
        variant: 'destructive',
      })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (s: string) =>
    s === 'severe' ? 'bg-red-600 text-white' : s === 'moderate' ? 'bg-amber-500 text-black' : 'bg-green-600 text-white'

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1"
        onClick={check}
        disabled={!canCheck}
        title={canCheck ? 'Verificar interações entre os medicamentos prescritos' : 'Adicione 2 ou mais medicamentos'}
      >
        <Pill className="h-3 w-3" />
        Interações
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Verificação de Interações
            </DialogTitle>
            <DialogDescription>
              Ferramenta de apoio. A decisão clínica permanece com o profissional.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Analisando...</span>
            </div>
          ) : results ? (
            <div className="space-y-4">
              {results.interactions && results.interactions.length > 0 ? (
                <div className="space-y-2">
                  {results.interactions.map((i, idx) => (
                    <div
                      key={idx}
                      className={`rounded p-3 text-sm ${getSeverityColor(i.severity)}`}
                    >
                      <div className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {i.drugs.join(' + ')}
                        <span className="text-xs opacity-90">({i.severity})</span>
                      </div>
                      <p className="mt-1 opacity-95">{i.description}</p>
                      {i.recommendation && (
                        <p className="mt-1 text-xs opacity-90">{i.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
                  <Shield className="h-6 w-6" />
                  Nenhuma interação relevante identificada entre os medicamentos.
                </div>
              )}
              {results.contraindications && results.contraindications.length > 0 && (
                <div className="text-amber-600 dark:text-amber-400 text-sm">
                  <strong>Contraindicações:</strong> {results.contraindications.join('; ')}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
