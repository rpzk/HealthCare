'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function RestrictedPatientView({ patientId, patientName, patientCpf }: { patientId: string, patientName: string, patientCpf: string }) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleRequestAccess = async () => {
    if (reason.length < 5) {
      toast({ title: 'Justificativa muito curta', description: 'Por favor, detalhe o motivo do acesso emergencial.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/emergency-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, durationMinutes: 120 })
      })

      const data = await res.json()

      if (res.ok) {
        toast({ title: 'Acesso Liberado', description: 'Acesso de emergência concedido com sucesso. Atualizando...' })
        // Reload page to fetch full details
        window.location.reload()
      } else {
        toast({ title: 'Erro', description: data.error || 'Não foi possível liberar o acesso.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Ocorreu um erro no servidor.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
      <Card className="max-w-md w-full border-red-200 dark:border-red-900 border-2 shadow-lg">
        <CardHeader className="bg-red-50 dark:bg-red-900/20 text-center rounded-t-lg pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl text-red-700 dark:text-red-400">Acesso Restrito</CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80 mt-2">
            Você não faz parte da equipe de cuidado deste paciente. O acesso não autorizado a prontuários é uma violação da LGPD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{patientName}</h3>
            <p className="text-muted-foreground">{patientCpf}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 text-sm flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              Caso esteja realizando um <strong>Atendimento de Última Hora</strong> ou <strong>Cobertura</strong>, você pode declarar acesso de emergência. Esta ação será rigidamente <strong>auditada e registrada</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Justificativa Médica para o Acesso *</label>
            <Textarea 
              placeholder="Descreva o motivo clínico ou administrativo (Ex: Plantão, atendimento de urgência...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRequestAccess}
            disabled={isSubmitting || reason.length < 5}
          >
            {isSubmitting ? 'Liberando...' : 'Declarar Emergência'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
