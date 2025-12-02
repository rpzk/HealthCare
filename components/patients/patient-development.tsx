'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { DevelopmentDashboard } from '@/components/hr/development-dashboard'
import {
  Sparkles,
  Brain,
  Gem,
  TrendingUp,
  Send,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Assessment {
  id: string
  type: 'stratum' | 'strengths'
  status: string
  completedAt?: string
  result?: string
}

interface PatientDevelopmentProps {
  patientId: string
  patientName: string
  patientEmail?: string
}

export function PatientDevelopment({ patientId, patientName, patientEmail }: PatientDevelopmentProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copying, setCopying] = useState(false)
  const [sending, setSending] = useState(false)

  const fetchAssessments = useCallback(async () => {
    try {
      // Buscar assessments de stratum do paciente
      const stratumRes = await fetch(`/api/stratum/assessments?patientId=${patientId}`)
      const stratumData = stratumRes.ok ? await stratumRes.json() : []

      // Buscar assessments de forças do paciente
      const strengthsRes = await fetch(`/api/strengths/assessments?patientId=${patientId}`)
      const strengthsData = strengthsRes.ok ? await strengthsRes.json() : []

      const allAssessments: Assessment[] = [
        ...stratumData.map((a: { id: string; status: string; completedAt?: string; stratumLevel?: string }) => ({
          id: a.id,
          type: 'stratum' as const,
          status: a.status,
          completedAt: a.completedAt,
          result: a.stratumLevel,
        })),
        ...strengthsData.map((a: { id: string; status: string; completedAt?: string }) => ({
          id: a.id,
          type: 'strengths' as const,
          status: a.status,
          completedAt: a.completedAt,
        })),
      ]

      setAssessments(allAssessments)
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const generateInviteLink = () => {
    // Link para o paciente acessar suas avaliações
    const baseUrl = window.location.origin
    const link = `${baseUrl}/development?patient=${patientId}&invited=true`
    setInviteLink(link)
    setShowInviteDialog(true)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopying(true)
      toast({ title: 'Link copiado!' })
      setTimeout(() => setCopying(false), 2000)
    } catch {
      toast({ title: 'Erro ao copiar link', variant: 'destructive' })
    }
  }

  const sendInviteEmail = async () => {
    if (!patientEmail) {
      toast({ title: 'Paciente não possui email cadastrado', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      // Aqui seria a chamada para enviar email
      // Por enquanto, simular
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({ title: `Convite enviado para ${patientEmail}` })
      setShowInviteDialog(false)
    } catch {
      toast({ title: 'Erro ao enviar convite', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const createPlanForPatient = async () => {
    try {
      const res = await fetch('/api/development/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId,
          focusArea: 'Saúde Integral',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao gerar plano')
      }

      toast({ title: 'Plano de desenvolvimento criado para o paciente!' })
      fetchAssessments()
    } catch (error) {
      console.error('Erro:', error)
      toast({ title: error instanceof Error ? error.message : 'Erro ao gerar plano', variant: 'destructive' })
    }
  }

  const stratumAssessment = assessments.find(a => a.type === 'stratum' && a.status === 'COMPLETED')
  const strengthsAssessment = assessments.find(a => a.type === 'strengths' && a.status === 'COMPLETED')
  const hasCompletedAssessments = stratumAssessment || strengthsAssessment

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Desenvolvimento de {patientName}
              </CardTitle>
              <CardDescription className="mt-1">
                Acompanhe o progresso e prescreva planos de desenvolvimento
              </CardDescription>
            </div>
            <Button onClick={generateInviteLink} variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Convidar para Avaliações
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Status das Avaliações */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stratumAssessment ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Brain className={`h-6 w-6 ${stratumAssessment ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Horizonte Temporal</h3>
                {stratumAssessment ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-100 text-green-700">
                      Estrato {stratumAssessment.result}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {stratumAssessment.completedAt && 
                        new Date(stratumAssessment.completedAt).toLocaleDateString('pt-BR')
                      }
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Aguardando avaliação
                  </p>
                )}
              </div>
              {stratumAssessment && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${strengthsAssessment ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Gem className={`h-6 w-6 ${strengthsAssessment ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Forças de Caráter</h3>
                {strengthsAssessment ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-100 text-green-700">
                      Concluído
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {strengthsAssessment.completedAt && 
                        new Date(strengthsAssessment.completedAt).toLocaleDateString('pt-BR')
                      }
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Aguardando avaliação
                  </p>
                )}
              </div>
              {strengthsAssessment && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      {hasCompletedAssessments && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Plano de Desenvolvimento</h3>
                <p className="text-sm text-gray-500">
                  Crie um plano personalizado baseado nas avaliações do paciente
                </p>
              </div>
              <Button onClick={createPlanForPatient}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Gerar Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard do Paciente */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : hasCompletedAssessments ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Progresso do Paciente</h2>
            <Button variant="ghost" size="sm" onClick={fetchAssessments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <DevelopmentDashboard patientId={patientId} />
        </div>
      ) : (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-medium text-gray-700 mb-2">
              Aguardando avaliações do paciente
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
              Envie um convite para que o paciente complete as avaliações 
              de Horizonte Temporal e Forças de Caráter.
            </p>
            <Button onClick={generateInviteLink} variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Convite */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Paciente para Avaliações</DialogTitle>
            <DialogDescription>
              Envie o link abaixo para {patientName} completar suas avaliações de desenvolvimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                />
                <Button variant="ghost" size="sm" onClick={copyLink}>
                  {copying ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">
                O que o paciente irá fazer:
              </h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Avaliação de Horizonte Temporal (~10 min)
                </li>
                <li className="flex items-center gap-2">
                  <Gem className="h-4 w-4" />
                  Descoberta de Forças de Caráter (~8 min)
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Fechar
            </Button>
            {patientEmail && (
              <Button onClick={sendInviteEmail} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar por Email
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
