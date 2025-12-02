'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Heart, 
  Activity, 
  Droplets, 
  Weight, 
  Moon, 
  Footprints, 
  Thermometer, 
  Stethoscope,
  Shield,
  ShieldOff,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Download,
  History
} from 'lucide-react'

// Mapeamento de tipos de dados biométricos
const biometricTypes = [
  {
    type: 'HEART_RATE',
    label: 'Frequência Cardíaca',
    description: 'Batimentos por minuto (BPM), variabilidade da frequência cardíaca',
    icon: Heart,
    color: 'text-red-500'
  },
  {
    type: 'BLOOD_PRESSURE',
    label: 'Pressão Arterial',
    description: 'Pressão sistólica e diastólica (mmHg)',
    icon: Activity,
    color: 'text-blue-500'
  },
  {
    type: 'BLOOD_GLUCOSE',
    label: 'Glicemia',
    description: 'Níveis de glicose no sangue (mg/dL)',
    icon: Droplets,
    color: 'text-purple-500'
  },
  {
    type: 'SPO2',
    label: 'Saturação de Oxigênio',
    description: 'Nível de oxigênio no sangue (SpO2 %)',
    icon: Activity,
    color: 'text-cyan-500'
  },
  {
    type: 'WEIGHT',
    label: 'Peso e Composição',
    description: 'Peso corporal, IMC, gordura corporal',
    icon: Weight,
    color: 'text-amber-500'
  },
  {
    type: 'SLEEP',
    label: 'Dados de Sono',
    description: 'Duração, qualidade, fases do sono',
    icon: Moon,
    color: 'text-indigo-500'
  },
  {
    type: 'ACTIVITY',
    label: 'Atividade Física',
    description: 'Passos, distância, calorias, exercícios',
    icon: Footprints,
    color: 'text-green-500'
  },
  {
    type: 'TEMPERATURE',
    label: 'Temperatura Corporal',
    description: 'Temperatura em graus Celsius',
    icon: Thermometer,
    color: 'text-orange-500'
  },
  {
    type: 'STEPS',
    label: 'Contagem de Passos',
    description: 'Número de passos diários',
    icon: Footprints,
    color: 'text-teal-500'
  },
  {
    type: 'ECG',
    label: 'Eletrocardiograma',
    description: 'Dados de ECG de dispositivos compatíveis',
    icon: Activity,
    color: 'text-pink-500'
  },
  {
    type: 'STETHOSCOPE',
    label: 'Estetoscópio Digital',
    description: 'Áudios de ausculta cardíaca e pulmonar',
    icon: Stethoscope,
    color: 'text-sky-500'
  },
  {
    type: 'OTOSCOPE',
    label: 'Otoscópio Digital',
    description: 'Imagens do canal auditivo',
    icon: Activity,
    color: 'text-lime-500'
  }
]

interface Consent {
  id: string
  dataType: string
  isGranted: boolean
  grantedAt: string | null
  revokedAt: string | null
  updatedAt: string
}

interface AuditLog {
  id: string
  dataType: string
  action: string
  previousValue: boolean
  newValue: boolean
  reason: string | null
  createdAt: string
}

export default function PrivacySettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [consents, setConsents] = useState<Consent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokingAll, setRevokingAll] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      fetchConsents()
    }
  }, [status, router])

  const fetchConsents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/my-consents')
      if (response.ok) {
        const data = await response.json()
        setConsents(data.consents)
        setAuditLogs(data.auditLogs)
      } else if (response.status === 400) {
        // Usuário não é paciente
        toast({ title: 'Esta funcionalidade é apenas para pacientes', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao carregar permissões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleConsent = async (dataType: string, currentValue: boolean) => {
    try {
      setUpdating(dataType)
      const response = await fetch('/api/my-consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType,
          isGranted: !currentValue
        })
      })

      if (response.ok) {
        toast({
          title: !currentValue 
            ? 'Permissão concedida com sucesso' 
            : 'Permissão revogada com sucesso'
        })
        fetchConsents()
      } else {
        toast({ title: 'Erro ao atualizar permissão', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao atualizar permissão', variant: 'destructive' })
    } finally {
      setUpdating(null)
    }
  }

  const handleRevokeAll = async () => {
    try {
      setRevokingAll(true)
      const response = await fetch('/api/my-consents', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: data.message })
        setShowRevokeAllDialog(false)
        setRevokeReason('')
        fetchConsents()
      } else {
        toast({ title: 'Erro ao revogar permissões', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao revogar permissões', variant: 'destructive' })
    } finally {
      setRevokingAll(false)
    }
  }

  const getConsentStatus = (dataType: string) => {
    const consent = consents.find(c => c.dataType === dataType)
    return consent?.isGranted ?? false
  }

  const grantedCount = consents.filter(c => c.isGranted).length
  const totalTypes = biometricTypes.length

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Privacidade e Permissões
        </h1>
        <p className="text-muted-foreground">
          Gerencie quais dados biométricos você compartilha com a equipe de saúde.
          Você pode alterar suas preferências a qualquer momento.
        </p>
      </div>

      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo das Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{grantedCount} tipos de dados permitidos</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-400" />
                <span className="text-muted-foreground">
                  {totalTypes - grantedCount} tipos de dados bloqueados
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryDialog(true)}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              {grantedCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowRevokeAllDialog(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Revogar Todas
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta LGPD */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Lei Geral de Proteção de Dados (LGPD)</AlertTitle>
        <AlertDescription>
          Conforme a LGPD, você tem o direito de autorizar, modificar ou revogar 
          o compartilhamento dos seus dados biométricos a qualquer momento. 
          Todas as alterações são registradas para sua segurança.
        </AlertDescription>
      </Alert>

      {/* Lista de Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Biométricos</CardTitle>
          <CardDescription>
            Ative ou desative o compartilhamento de cada tipo de dado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {biometricTypes.map((item, index) => {
            const Icon = item.icon
            const isGranted = getConsentStatus(item.type)
            const isUpdating = updating === item.type
            const consent = consents.find(c => c.dataType === item.type)

            return (
              <div key={item.type}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start justify-between py-2">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {isGranted ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                            Permitido
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      {consent && isGranted && consent.grantedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Permitido em: {new Date(consent.grantedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={isGranted}
                      onCheckedChange={() => handleToggleConsent(item.type, isGranted)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seus Direitos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Acesso:</strong> Você pode solicitar uma cópia de todos os seus dados 
            biométricos armazenados.
          </p>
          <p>
            <strong>Correção:</strong> Você pode solicitar a correção de dados incorretos.
          </p>
          <p>
            <strong>Portabilidade:</strong> Você pode solicitar a exportação dos seus dados 
            em formato legível.
          </p>
          <p>
            <strong>Exclusão:</strong> Você pode solicitar a exclusão dos seus dados, 
            respeitando as obrigações legais de retenção.
          </p>
          <div className="pt-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Solicitar Meus Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Revogar Todas */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Revogar Todas as Permissões
            </DialogTitle>
            <DialogDescription>
              Esta ação irá revogar o compartilhamento de TODOS os tipos de dados 
              biométricos. A equipe de saúde não terá mais acesso às suas medições.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Isso pode afetar o acompanhamento do seu tratamento e a capacidade 
                da equipe de saúde de monitorar sua saúde remotamente.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivo (opcional)
              </label>
              <Textarea
                placeholder="Descreva o motivo da revogação..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAllDialog(false)}
              disabled={revokingAll}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAll}
              disabled={revokingAll}
            >
              {revokingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revogando...
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Revogar Todas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </DialogTitle>
            <DialogDescription>
              Todas as alterações nas suas permissões de dados biométricos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              auditLogs.map((log) => {
                const biometric = biometricTypes.find(b => b.type === log.dataType)
                const Icon = biometric?.icon || Activity
                
                return (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-1.5 rounded ${biometric?.color || 'text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {biometric?.label || log.dataType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.action === 'GRANTED' && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Permitido
                          </Badge>
                        )}
                        {log.action === 'REVOKED' && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Revogado
                          </Badge>
                        )}
                        {log.action === 'MODIFIED' && (
                          <Badge variant="secondary">
                            Modificado
                          </Badge>
                        )}
                      </div>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground">
                          {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
