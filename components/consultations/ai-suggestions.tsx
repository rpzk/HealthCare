"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Sparkles, 
  Loader2, 
  Pill, 
  FlaskConical, 
  Send,
  Check,
  X,
  AlertTriangle,
  Brain
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface AISuggestion {
  prescriptions: Array<{
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    reasoning: string
  }>
  exams: Array<{
    examType: string
    description: string
    priority: string
    reasoning: string
  }>
  referrals: Array<{
    specialty: string
    description: string
    priority: string
    reasoning: string
  }>
  summary: string
  warnings: string[]
}

interface AISuggestionsProps {
  soap: {
    subjective: string
    objective: string
    assessment: string
    plan: string
  }
  patientAge?: number
  patientSex?: 'M' | 'F'
  patientHistory?: string
  onApply: (suggestions: {
    prescriptions: any[]
    exams: any[]
    referrals: any[]
  }) => void
}

export function AISuggestions({ 
  soap, 
  patientAge, 
  patientSex,
  patientHistory,
  onApply 
}: AISuggestionsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion | null>(null)
  const [selected, setSelected] = useState<{
    prescriptions: Set<number>
    exams: Set<number>
    referrals: Set<number>
  }>({
    prescriptions: new Set(),
    exams: new Set(),
    referrals: new Set()
  })

  const hasContent = soap.subjective || soap.objective || soap.assessment

  const fetchSuggestions = async () => {
    setLoading(true)
    setSuggestions(null)
    setSelected({
      prescriptions: new Set(),
      exams: new Set(),
      referrals: new Set()
    })

    try {
      const res = await fetch('/api/ai/suggest-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soap,
          patientAge,
          patientSex,
          patientHistory
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions)
        
        // Selecionar tudo por padrão
        setSelected({
          prescriptions: new Set(data.suggestions.prescriptions.map((_: any, i: number) => i)),
          exams: new Set(data.suggestions.exams.map((_: any, i: number) => i)),
          referrals: new Set(data.suggestions.referrals.map((_: any, i: number) => i))
        })
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao obter sugestões')
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível obter sugestões da IA",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (
    type: 'prescriptions' | 'exams' | 'referrals', 
    index: number
  ) => {
    setSelected(prev => {
      const newSet = new Set(prev[type])
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return { ...prev, [type]: newSet }
    })
  }

  const handleApply = () => {
    if (!suggestions) return

    const selectedData = {
      prescriptions: suggestions.prescriptions
        .filter((_, i) => selected.prescriptions.has(i))
        .map(rx => ({
          medication: rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions
        })),
      exams: suggestions.exams
        .filter((_, i) => selected.exams.has(i))
        .map(exam => ({
          examType: exam.examType,
          description: exam.description,
          priority: exam.priority
        })),
      referrals: suggestions.referrals
        .filter((_, i) => selected.referrals.has(i))
        .map(ref => ({
          specialty: ref.specialty,
          description: ref.description,
          priority: ref.priority
        }))
    }

    onApply(selectedData)
    setOpen(false)
    
    const count = selectedData.prescriptions.length + 
                  selectedData.exams.length + 
                  selectedData.referrals.length
    
    toast({
      title: "Sugestões aplicadas",
      description: `${count} item(ns) adicionado(s) à consulta`
    })
  }

  const totalSelected = selected.prescriptions.size + 
                        selected.exams.size + 
                        selected.referrals.size

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => {
          setOpen(true)
          if (!suggestions && !loading) {
            fetchSuggestions()
          }
        }}
        disabled={!hasContent}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Sugestões IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Sugestões da Inteligência Artificial
            </DialogTitle>
            <DialogDescription>
              Com base na anamnese, a IA sugere prescrições, exames e encaminhamentos.
              Revise e selecione o que deseja aplicar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Analisando dados clínicos...</p>
              </div>
            ) : suggestions ? (
              <>
                {/* Resumo da análise */}
                {suggestions.summary && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        {suggestions.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Avisos */}
                {suggestions.warnings && suggestions.warnings.length > 0 && (
                  <Card className="border-amber-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          {suggestions.warnings.map((warning, i) => (
                            <p key={i} className="text-sm">{warning}</p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Prescrições sugeridas */}
                {suggestions.prescriptions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Prescrições Sugeridas
                        <Badge variant="secondary">{suggestions.prescriptions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestions.prescriptions.map((rx, i) => (
                        <div
                          key={i}
                          onClick={() => toggleSelection('prescriptions', i)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selected.prescriptions.has(i)
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium">{rx.medication}</div>
                              <div className="text-sm text-muted-foreground">
                                {rx.dosage} - {rx.frequency} - {rx.duration}
                              </div>
                              {rx.instructions && (
                                <div className="text-sm mt-1">{rx.instructions}</div>
                              )}
                              {rx.reasoning && (
                                <div className="text-xs text-muted-foreground mt-2 italic">
                                  💡 {rx.reasoning}
                                </div>
                              )}
                            </div>
                            {selected.prescriptions.has(i) ? (
                              <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Exames sugeridos */}
                {suggestions.exams.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" />
                        Exames Sugeridos
                        <Badge variant="secondary">{suggestions.exams.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestions.exams.map((exam, i) => (
                        <div
                          key={i}
                          onClick={() => toggleSelection('exams', i)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selected.exams.has(i)
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium">{exam.examType}</div>
                              <div className="text-sm text-muted-foreground">
                                {exam.description}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {exam.priority === 'HIGH' ? 'Alta Prioridade' : 'Rotina'}
                              </Badge>
                              {exam.reasoning && (
                                <div className="text-xs text-muted-foreground mt-2 italic">
                                  💡 {exam.reasoning}
                                </div>
                              )}
                            </div>
                            {selected.exams.has(i) ? (
                              <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Encaminhamentos sugeridos */}
                {suggestions.referrals.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Encaminhamentos Sugeridos
                        <Badge variant="secondary">{suggestions.referrals.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestions.referrals.map((ref, i) => (
                        <div
                          key={i}
                          onClick={() => toggleSelection('referrals', i)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selected.referrals.has(i)
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium">{ref.specialty}</div>
                              <div className="text-sm text-muted-foreground">
                                {ref.description}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {ref.priority === 'HIGH' ? 'Urgente' : 'Eletivo'}
                              </Badge>
                              {ref.reasoning && (
                                <div className="text-xs text-muted-foreground mt-2 italic">
                                  💡 {ref.reasoning}
                                </div>
                              )}
                            </div>
                            {selected.referrals.has(i) ? (
                              <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Nenhuma sugestão */}
                {suggestions.prescriptions.length === 0 && 
                 suggestions.exams.length === 0 && 
                 suggestions.referrals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma sugestão específica para este caso</p>
                    <p className="text-sm mt-2">
                      Continue o atendimento manualmente
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Clique para obter sugestões da IA</p>
                <Button 
                  onClick={fetchSuggestions} 
                  className="mt-4"
                  disabled={loading}
                >
                  Analisar Consulta
                </Button>
              </div>
            )}
          </div>

          {suggestions && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {totalSelected} item(ns) selecionado(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={totalSelected === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Selecionados
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
