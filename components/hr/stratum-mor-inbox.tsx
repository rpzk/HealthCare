'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { Loader2, ShieldCheck } from 'lucide-react'

type MorAssessment = {
  id: string
  status: string
  assessmentType: string
  jobRoleId: string | null
  calculatedStratum: string | null
  timeSpanMonths: number | null
  confidenceScore: number | null
  completedAt: string | null
  morValidatedAt: string | null
  morEvidence: string | null
  user: { id: string; name: string | null; email: string | null; role: string }
  jobRole?: { id: string; title: string; requiredMinStratum: string; requiredMaxStratum: string | null } | null
}

export function StratumMorInbox() {
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<MorAssessment[]>([])
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [evidence, setEvidence] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/stratum/assessments?view=mor')
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao carregar validações', variant: 'destructive' })
        return
      }
      setAssessments(data.assessments || [])
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar validações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const pending = useMemo(() => {
    return assessments.filter(a =>
      a.assessmentType === 'MANAGER' &&
      a.jobRoleId &&
      a.status === 'COMPLETED' &&
      !a.morValidatedAt
    )
  }, [assessments])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Validações MoR
        </CardTitle>
        <CardDescription>
          Role-assessments concluídos aguardando validação do MoR (evidência obrigatória).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : pending.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma validação pendente.</div>
        ) : (
          pending.map((a) => (
            <div key={a.id} className="rounded-lg border p-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Cargo</Badge>
                <span className="font-medium">{a.jobRole?.title || a.jobRoleId}</span>
                {a.calculatedStratum && (
                  <Badge>{a.calculatedStratum}</Badge>
                )}
                {typeof a.timeSpanMonths === 'number' && (
                  <span className="text-sm text-muted-foreground">{a.timeSpanMonths} meses</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Avaliador: {a.user?.name || a.user?.email || a.user?.id}
              </div>

              <Dialog
                open={validatingId === a.id}
                onOpenChange={(open) => {
                  if (open) {
                    setEvidence('')
                    setValidatingId(a.id)
                  } else {
                    setValidatingId(null)
                    setEvidence('')
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" className="w-fit">
                    Validar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Validar MoR</DialogTitle>
                    <DialogDescription>
                      Informe a evidência usada para validar o Time Span do cargo.
                    </DialogDescription>
                  </DialogHeader>

                  <Textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Ex.: documentos, exemplos de decisões, entregas e horizonte temporal observado…"
                    rows={6}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={async () => {
                        const ev = evidence.trim()
                        if (!ev) {
                          toast({ title: 'Erro', description: 'Evidência é obrigatória', variant: 'destructive' })
                          return
                        }

                        try {
                          const res = await fetch('/api/stratum/assessments', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assessmentId: a.id, action: 'validate_mor', evidence: ev })
                          })
                          const data = await res.json()
                          if (!res.ok) {
                            toast({ title: 'Erro', description: data?.error || 'Falha ao validar', variant: 'destructive' })
                            return
                          }

                          toast({ title: 'Validado', description: 'Validação registrada e perfil do cargo atualizado.' })
                          setValidatingId(null)
                          setEvidence('')
                          await load()
                        } catch {
                          toast({ title: 'Erro', description: 'Falha ao validar', variant: 'destructive' })
                        }
                      }}
                    >
                      Confirmar validação
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
