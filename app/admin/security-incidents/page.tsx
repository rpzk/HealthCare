'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Send,
  Users,
  Plus,
  Eye,
  RefreshCw,
  Building2,
  Loader2,
  Info,
  BookOpen
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Tipos
interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  incidentType: string
  status: string
  affectedDataTypes: string[]
  estimatedAffected: number | null
  confirmedAffected: number | null
  detectedAt: string
  occurredAt: string | null
  containedAt: string | null
  resolvedAt: string | null
  anpdNotifiedAt: string | null
  anpdNotificationNumber: string | null
  titularsNotifiedAt: string | null
  rootCause: string | null
  actionsTaken: string | null
  preventiveMeasures: string | null
  logs: Array<{
    id: string
    action: string
    description: string
    createdAt: string
  }>
}

// Configurações visuais
const severityConfig = {
  LOW: { label: 'Baixo', color: 'bg-green-100 text-green-800 border-green-300', icon: Shield },
  MEDIUM: { label: 'Médio', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: ShieldAlert },
  HIGH: { label: 'Alto', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle },
  CRITICAL: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DETECTED: { label: 'Detectado', color: 'bg-red-100 text-red-800' },
  INVESTIGATING: { label: 'Investigando', color: 'bg-yellow-100 text-yellow-800' },
  CONTAINED: { label: 'Contido', color: 'bg-blue-100 text-blue-800' },
  ERADICATED: { label: 'Erradicado', color: 'bg-purple-100 text-purple-800' },
  RECOVERED: { label: 'Recuperado', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Encerrado', color: 'bg-gray-100 text-gray-800' },
  POST_INCIDENT: { label: 'Pós-incidente', color: 'bg-indigo-100 text-indigo-800' }
}

const incidentTypes: Record<string, string> = {
  DATA_BREACH: 'Vazamento de Dados',
  UNAUTHORIZED_ACCESS: 'Acesso Não Autorizado',
  MALWARE: 'Malware/Ransomware',
  PHISHING: 'Phishing',
  SYSTEM_FAILURE: 'Falha de Sistema',
  HUMAN_ERROR: 'Erro Humano',
  PHYSICAL_SECURITY: 'Segurança Física',
  THIRD_PARTY: 'Incidente em Terceiro',
  OTHER: 'Outro'
}

const dataTypes = [
  { value: 'CPF', label: 'CPF' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'personal_data', label: 'Dados Pessoais' },
  { value: 'medical_records', label: 'Prontuários Médicos' },
  { value: 'health_data', label: 'Dados de Saúde' },
  { value: 'prescriptions', label: 'Prescrições' },
  { value: 'biometric', label: 'Dados Biométricos' },
  { value: 'financial', label: 'Dados Financeiros' }
]

// Componente de guia
function HelpGuide() {
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <BookOpen className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">📖 Guia - Gestão de Incidentes de Segurança (LGPD Art. 48)</AlertTitle>
      <AlertDescription className="text-blue-700 mt-2">
        <div className="space-y-3">
          <p>
            Este painel gerencia incidentes de segurança que podem afetar dados pessoais, 
            conforme exigido pela LGPD.
          </p>
          
          <div className="bg-white/70 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-3">📋 Fluxo de Resposta a Incidentes:</h4>
            <div className="grid grid-cols-6 gap-2 text-xs text-center">
              <div className="bg-red-100 p-2 rounded">1. Detectar</div>
              <div className="bg-yellow-100 p-2 rounded">2. Investigar</div>
              <div className="bg-blue-100 p-2 rounded">3. Conter</div>
              <div className="bg-purple-100 p-2 rounded">4. Erradicar</div>
              <div className="bg-green-100 p-2 rounded">5. Recuperar</div>
              <div className="bg-gray-100 p-2 rounded">6. Documentar</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> ⚠️ Prazos Legais LGPD Art. 48
            </h4>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li><strong>72 horas (recomendado)</strong> para notificar a ANPD após detecção</li>
              <li>Notificar titulares <strong>sem demora injustificada</strong></li>
              <li>Documentar <strong>todas as ações</strong> para auditoria</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Componente de estatísticas
function StatsCards({ stats }: { stats: Record<string, number> }) {
  const open = (stats.DETECTED || 0) + (stats.INVESTIGATING || 0)
  const contained = (stats.CONTAINED || 0) + (stats.ERADICATED || 0)
  const resolved = (stats.RECOVERED || 0) + (stats.CLOSED || 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-900">{open}</p>
            <p className="text-xs text-red-700">Abertos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-200 rounded-lg">
            <Shield className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{contained}</p>
            <p className="text-xs text-blue-700">Contidos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-200 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-900">{resolved}</p>
            <p className="text-xs text-green-700">Resolvidos</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-200 rounded-lg">
            <Building2 className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">{stats.POST_INCIDENT || 0}</p>
            <p className="text-xs text-purple-700">Pós-incidente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Modal de novo incidente
function NewIncidentDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    incidentType: string
    affectedDataTypes: string[]
    estimatedAffected: string
  }>({
    title: '',
    description: '',
    severity: 'MEDIUM',
    incidentType: 'OTHER',
    affectedDataTypes: [],
    estimatedAffected: ''
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || formData.affectedDataTypes.length === 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/security-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedAffected: formData.estimatedAffected ? parseInt(formData.estimatedAffected) : undefined
        })
      })

      if (response.ok) {
        toast.success('Incidente registrado com sucesso')
        onCreated()
        onClose()
        setFormData({
          title: '',
          description: '',
          severity: 'MEDIUM',
          incidentType: 'OTHER',
          affectedDataTypes: [],
          estimatedAffected: ''
        })
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao registrar incidente')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Registrar Novo Incidente de Segurança
          </DialogTitle>
          <DialogDescription>
            Registre um incidente que pode afetar dados pessoais dos pacientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título do Incidente *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Tentativa de acesso não autorizado detectada"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição Detalhada *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o incidente: o que aconteceu, quando foi detectado, como foi detectado..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severidade *</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">🟢 Baixo</SelectItem>
                  <SelectItem value="MEDIUM">🟡 Médio</SelectItem>
                  <SelectItem value="HIGH">🟠 Alto</SelectItem>
                  <SelectItem value="CRITICAL">🔴 Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Incidente *</Label>
              <Select
                value={formData.incidentType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, incidentType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(incidentTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tipos de Dados Afetados *</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {dataTypes.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.value}
                    checked={formData.affectedDataTypes.includes(type.value)}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        affectedDataTypes: checked
                          ? [...prev.affectedDataTypes, type.value]
                          : prev.affectedDataTypes.filter(t => t !== type.value)
                      }))
                    }}
                  />
                  <label htmlFor={type.value} className="text-sm">{type.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="estimated">Número Estimado de Titulares Afetados</Label>
            <Input
              id="estimated"
              type="number"
              value={formData.estimatedAffected}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedAffected: e.target.value }))}
              placeholder="Ex: 100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Registrar Incidente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Modal de detalhes e ações
function IncidentDetailDialog({
  incident,
  onClose,
  onUpdated
}: {
  incident: SecurityIncident | null
  onClose: () => void
  onUpdated: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [notificationMessage, setNotificationMessage] = useState('')

  if (!incident) return null

  const severity = severityConfig[incident.severity]
  const SeverityIcon = severity.icon

  const handleNotifyANPD = async () => {
    setLoading('anpd')
    try {
      const response = await fetch(`/api/admin/security-incidents/${incident.id}/notify-anpd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Notificação ANPD gerada! Protocolo: ${data.protocolNumber}`)
        onUpdated()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao gerar notificação')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(null)
    }
  }

  const handleNotifyTitulars = async () => {
    if (!notificationMessage || notificationMessage.length < 50) {
      toast.error('A mensagem deve ter pelo menos 50 caracteres')
      return
    }

    setLoading('titulars')
    try {
      const response = await fetch(`/api/admin/security-incidents/${incident.id}/notify-titulars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: notificationMessage,
          notificationMethod: 'both'
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.notifiedCount} titulares notificados!`)
        onUpdated()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao notificar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(null)
    }
  }

  const loadNotificationTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/security-incidents/${incident.id}/notify-titulars`)
      if (response.ok) {
        const data = await response.json()
        setNotificationMessage(data.template)
      }
    } catch {
      toast.error('Erro ao carregar template')
    }
  }

  return (
    <Dialog open={!!incident} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SeverityIcon className="h-5 w-5" />
            {incident.title}
          </DialogTitle>
          <DialogDescription>
            ID: {incident.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notify-anpd">
              Notificar ANPD
              {!incident.anpdNotifiedAt && <Badge variant="destructive" className="ml-2 text-xs">Pendente</Badge>}
            </TabsTrigger>
            <TabsTrigger value="notify-titulars">
              Notificar Titulares
              {!incident.titularsNotifiedAt && <Badge variant="destructive" className="ml-2 text-xs">Pendente</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Status e Severidade */}
            <div className="flex gap-4">
              <Badge className={severity.color}>
                <SeverityIcon className="h-3 w-3 mr-1" />
                Severidade: {severity.label}
              </Badge>
              <Badge className={statusConfig[incident.status]?.color}>
                Status: {statusConfig[incident.status]?.label}
              </Badge>
              <Badge variant="outline">
                Tipo: {incidentTypes[incident.incidentType] || incident.incidentType}
              </Badge>
            </div>

            {/* Descrição */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
              </CardContent>
            </Card>

            {/* Dados Afetados */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Dados Afetados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {incident.affectedDataTypes.map(type => (
                    <Badge key={type} variant="secondary">
                      {dataTypes.find(d => d.value === type)?.label || type}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Estimado:</span>
                    <p className="font-medium">{incident.estimatedAffected || 'Não informado'} titulares</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confirmado:</span>
                    <p className="font-medium">{incident.confirmedAffected || 'Em apuração'} titulares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datas importantes */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Detectado:</span>
                    <p className="font-medium">
                      {format(new Date(incident.detectedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contido:</span>
                    <p className="font-medium">
                      {incident.containedAt 
                        ? format(new Date(incident.containedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : 'Pendente'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ANPD Notificada:</span>
                    <p className="font-medium">
                      {incident.anpdNotifiedAt 
                        ? format(new Date(incident.anpdNotifiedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '⚠️ Pendente'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Titulares Notificados:</span>
                    <p className="font-medium">
                      {incident.titularsNotifiedAt 
                        ? format(new Date(incident.titularsNotifiedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '⚠️ Pendente'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {incident.logs && incident.logs.length > 0 ? (
                  <div className="space-y-4">
                    {incident.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm border-l-2 border-primary pl-4">
                        <div className="flex-1">
                          <p className="font-medium">{log.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum registro de atividade</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notify-anpd" className="mt-4">
            {incident.anpdNotifiedAt ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">✅ ANPD já foi notificada</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p>Data: {format(new Date(incident.anpdNotifiedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  {incident.anpdNotificationNumber && (
                    <p>Protocolo: {incident.anpdNotificationNumber}</p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">⚠️ Notificação à ANPD Pendente</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <p>A LGPD Art. 48 exige que incidentes de segurança sejam comunicados à ANPD em prazo razoável.</p>
                    <p className="mt-2">
                      <strong>Tempo desde detecção:</strong>{' '}
                      {formatDistanceToNow(new Date(incident.detectedAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Gerar Notificação à ANPD
                    </CardTitle>
                    <CardDescription>
                      Clique para gerar o documento de comunicação conforme Art. 48, §1º
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      O documento incluirá:
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground mb-4">
                      <li>Natureza dos dados afetados</li>
                      <li>Informações sobre os titulares</li>
                      <li>Medidas de segurança adotadas</li>
                      <li>Riscos relacionados</li>
                      <li>Medidas de mitigação</li>
                    </ul>
                    <Button onClick={handleNotifyANPD} disabled={loading === 'anpd'}>
                      {loading === 'anpd' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Gerar Notificação ANPD
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notify-titulars" className="mt-4">
            {incident.titularsNotifiedAt ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">✅ Titulares já foram notificados</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p>Data: {format(new Date(incident.titularsNotifiedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p>Método: {incident.confirmedAffected || 'N/A'} titulares notificados</p>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <Users className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">⚠️ Notificação aos Titulares Pendente</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Conforme LGPD Art. 48, os titulares afetados devem ser comunicados sem demora injustificada.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Notificar Pacientes Afetados
                    </CardTitle>
                    <CardDescription>
                      Envie uma notificação para todos os pacientes potencialmente afetados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={loadNotificationTemplate}>
                        Carregar Template Sugerido
                      </Button>
                    </div>
                    <div>
                      <Label>Mensagem de Notificação *</Label>
                      <Textarea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        placeholder="Digite a mensagem que será enviada aos pacientes..."
                        rows={10}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo 50 caracteres. Atual: {notificationMessage.length}
                      </p>
                    </div>
                    <Button 
                      onClick={handleNotifyTitulars} 
                      disabled={loading === 'titulars' || notificationMessage.length < 50}
                    >
                      {loading === 'titulars' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Notificação aos Titulares
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Página principal
export default function SecurityIncidentsPage() {
  const { data: session } = useSession()
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null)

  const loadIncidents = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/security-incidents')
      if (response.ok) {
        const data = await response.json()
        setIncidents(data.incidents || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            Incidentes de Segurança
          </h1>
          <p className="text-muted-foreground">
            Gestão de incidentes conforme LGPD Art. 48
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <Info className="h-4 w-4 mr-1" />
            {showHelp ? 'Ocultar Guia' : 'Mostrar Guia'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadIncidents}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar Incidente
          </Button>
        </div>
      </div>

      {/* Guia */}
      {showHelp && <HelpGuide />}

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Incidentes</CardTitle>
          <CardDescription>
            {incidents.length} incidente(s) registrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">Nenhum incidente registrado</p>
              <p className="text-sm text-muted-foreground">Isso é uma boa notícia! 🎉</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detectado</TableHead>
                  <TableHead>ANPD</TableHead>
                  <TableHead>Titulares</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => {
                  const severity = severityConfig[incident.severity]
                  const SeverityIcon = severity.icon
                  return (
                    <TableRow key={incident.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SeverityIcon className="h-4 w-4" />
                          <span className="font-medium">{incident.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {incidentTypes[incident.incidentType]}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={severity.color}>{severity.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[incident.status]?.color}>
                          {statusConfig[incident.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(incident.detectedAt), "dd/MM/yy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.detectedAt), { addSuffix: true, locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {incident.anpdNotifiedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {incident.titularsNotifiedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewIncidentDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={loadIncidents}
      />

      <IncidentDetailDialog
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={loadIncidents}
      />
    </div>
  )
}
