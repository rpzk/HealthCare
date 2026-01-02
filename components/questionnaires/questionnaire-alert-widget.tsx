'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface QuestionnaireAlert {
  count: number
  type: 'high_priority' | 'pending' | 'pending_analysis'
}

export function QuestionnaireAlertWidget() {
  const [alerts, setAlerts] = useState<QuestionnaireAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // Atualizar a cada minuto
    return () => clearInterval(interval)
  }, [])

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/questionnaires/alerts/summary')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Erro ao buscar alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const highPriority = alerts.find(a => a.type === 'high_priority')?.count || 0
  const pending = alerts.find(a => a.type === 'pending')?.count || 0
  const pendingAnalysis = alerts.find(a => a.type === 'pending_analysis')?.count || 0

  if (highPriority === 0 && pending === 0 && pendingAnalysis === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {highPriority > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{highPriority} insight{highPriority > 1 ? 's' : ''}</strong> de alta prioridade{' '}
            <Link
              href="/admin/questionnaire-analytics?tab=insights"
              className="underline font-medium"
            >
              requer atenção
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-amber-600" />
            Status dos Questionários
          </CardTitle>
          <CardDescription>
            Resumo rápido de atividades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending > 0 && (
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-md">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm">{pending} questionário{pending > 1 ? 'rios' : ''} pendente{pending > 1 ? 's' : ''}</span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/questionnaire-analytics">
                  Ver
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}

          {pendingAnalysis > 0 && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm">{pendingAnalysis} análise{pendingAnalysis > 1 ? 's' : ''} pendente{pendingAnalysis > 1 ? 's' : ''}</span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/questionnaire-analytics?tab=insights">
                  Analisar
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}

          <Button asChild className="w-full mt-2">
            <Link href="/admin/questionnaire-analytics">
              <Bell className="h-4 w-4 mr-2" />
              Centro de Análise de Questionários
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
