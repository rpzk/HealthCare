'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Heart, 
  Activity, 
  Droplets, 
  Weight, 
  Moon, 
  Footprints, 
  Thermometer, 
  Mail,
  Send,
  Copy,
  CheckCircle,
  Loader2,
  Info,
  ArrowLeft,
  User
} from 'lucide-react'
import Link from 'next/link'

// Tipos de dados biométricos disponíveis
const biometricTypes = [
  {
    type: 'HEART_RATE',
    label: 'Frequência Cardíaca',
    description: 'BPM, variabilidade cardíaca',
    icon: Heart,
    color: 'text-red-500',
    recommended: true
  },
  {
    type: 'BLOOD_PRESSURE',
    label: 'Pressão Arterial',
    description: 'Sistólica e diastólica',
    icon: Activity,
    color: 'text-blue-500',
    recommended: true
  },
  {
    type: 'BLOOD_GLUCOSE',
    label: 'Glicemia',
    description: 'Níveis de glicose',
    icon: Droplets,
    color: 'text-purple-500',
    recommended: false
  },
  {
    type: 'OXYGEN_SATURATION',
    label: 'Saturação O₂',
    description: 'Oximetria de pulso',
    icon: Activity,
    color: 'text-cyan-500',
    recommended: true
  },
  {
    type: 'WEIGHT',
    label: 'Peso',
    description: 'Peso e composição corporal',
    icon: Weight,
    color: 'text-amber-500',
    recommended: false
  },
  {
    type: 'SLEEP',
    label: 'Sono',
    description: 'Qualidade e duração',
    icon: Moon,
    color: 'text-indigo-500',
    recommended: false
  },
  {
    type: 'STEPS',
    label: 'Atividade',
    description: 'Exercícios e calorias',
    icon: Footprints,
    color: 'text-green-500',
    recommended: false
  },
  {
    type: 'BODY_TEMPERATURE',
    label: 'Temperatura',
    description: 'Temperatura corporal',
    icon: Thermometer,
    color: 'text-orange-500',
    recommended: false
  }
]

export default function InvitePatientPage() {
  const { data: _session } = useSession()
  const _router = useRouter()
  const { toast } = useToast()

  const userRole = (_session?.user as any)?.role as string | undefined
  
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [resending, setResending] = useState(false)

  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; speciality: string | null }>>([])
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('')
  
  // Form state
  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION' // Recomendados por padrão
  ])

  useEffect(() => {
    if (userRole === 'DOCTOR' && _session?.user?.id) {
      setAssignedDoctorId(String(_session.user.id))
      return
    }

    if (!userRole || userRole === 'PATIENT' || userRole === 'DOCTOR') return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/professionals/doctors')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        setDoctors(Array.isArray(json?.doctors) ? json.doctors : [])
      } catch {
        // seleção é opcional; falha silenciosa
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userRole, _session?.user?.id])

  const setPermissionChecked = (type: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      const alreadyChecked = prev.includes(type)
      if (checked && !alreadyChecked) return [...prev, type]
      if (!checked && alreadyChecked) return prev.filter((p) => p !== type)
      return prev
    })
  }

  const handleTogglePermission = (type: string) => {
    setSelectedPermissions((prev) => {
      const alreadyChecked = prev.includes(type)
      if (alreadyChecked) return prev.filter((p) => p !== type)
      return [...prev, type]
    })
  }

  const handleSelectAll = () => {
    setSelectedPermissions(biometricTypes.map(b => b.type))
  }

  const handleSelectRecommended = () => {
    setSelectedPermissions(biometricTypes.filter(b => b.recommended).map(b => b.type))
  }

  const handleClearAll = () => {
    setSelectedPermissions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!patientName || !patientEmail) {
      toast({ title: 'Preencha nome e email do paciente', variant: 'destructive' })
      return
    }

    if (selectedPermissions.length === 0) {
      toast({ title: 'Selecione ao menos um tipo de dado', variant: 'destructive' })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/patient-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          email: patientEmail,
          customMessage: message,
          requestedBiometrics: selectedPermissions,
          ...(assignedDoctorId ? { assignedDoctorId } : {})
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.inviteLink || data.inviteUrl || null)
        setInviteToken(data?.invite?.token || null)
        if (data?.emailEnabled && data?.emailSent) {
          toast({ title: 'Convite criado e enviado por e-mail!' })
        } else if (data?.emailEnabled && !data?.emailSent) {
          toast({ title: 'Convite criado, mas falhou ao enviar e-mail. Copie o link.', variant: 'destructive' })
        } else {
          toast({ title: 'Convite criado! Copie o link para enviar.' })
        }
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Erro ao criar convite', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao criar convite', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({ title: 'Link copiado!' })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNewInvite = () => {
    setInviteLink(null)
    setInviteToken(null)
    setPatientName('')
    setPatientEmail('')
    setMessage('')
    setSelectedPermissions(['HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION'])
    if (userRole === 'DOCTOR' && _session?.user?.id) {
      setAssignedDoctorId(String(_session.user.id))
    } else {
      setAssignedDoctorId('')
    }
  }

  const handleResendEmail = async () => {
    if (!inviteToken) {
      toast({ title: 'Token do convite não encontrado', variant: 'destructive' })
      return
    }
    try {
      setResending(true)
      const res = await fetch(`/api/patient-invites/${inviteToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ title: data?.error || 'Falha ao reenviar convite', variant: 'destructive' })
        return
      }
      toast({ title: 'Convite reenviado por e-mail!' })
    } catch (e) {
      toast({ title: 'Falha ao reenviar convite', variant: 'destructive' })
    } finally {
      setResending(false)
    }
  }

  // Tela de sucesso com link
  if (inviteLink) {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-700 dark:text-green-300">
              Convite Criado!
            </CardTitle>
            <CardDescription>
              Envie o link abaixo para <strong>{patientName}</strong> ({patientEmail})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="bg-white dark:bg-gray-900"
              />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O convite expira em <strong>7 dias</strong>. O paciente poderá escolher 
                quais dados biométricos deseja compartilhar ao aceitar.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleNewInvite} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Novo Convite
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendEmail}
                disabled={resending || !inviteToken}
              >
                {resending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Reenviar
                  </>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/patients">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Convidar Paciente
          </h1>
          <p className="text-muted-foreground">
            Envie um convite para o paciente se cadastrar e compartilhar dados biométricos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Nome do paciente"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem Personalizada (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Olá! Gostaria de acompanhar sua saúde remotamente..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {userRole && userRole !== 'PATIENT' && userRole !== 'DOCTOR' && (
              <div className="space-y-2">
                <Label>Vincular paciente a um médico (opcional)</Label>
                <Select value={assignedDoctorId} onValueChange={setAssignedDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não vincular agora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não vincular agora</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.speciality ? ` (${d.speciality})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se selecionado, o paciente já entra com o médico responsável definido.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissões Solicitadas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Dados Biométricos Solicitados
                </CardTitle>
                <CardDescription>
                  Selecione os tipos de dados que deseja solicitar ao paciente
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSelectRecommended}>
                  Recomendados
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                  Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {biometricTypes.map((item) => {
                const Icon = item.icon
                const isSelected = selectedPermissions.includes(item.type)
                
                return (
                  <div
                    key={item.type}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => handleTogglePermission(item.type)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setPermissionChecked(item.type, e.target.checked)}
                      className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                      aria-label={item.label}
                    />
                    <div className={`p-1.5 rounded ${item.color} bg-muted`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.recommended && (
                          <Badge variant="secondary" className="text-xs">
                            Recomendado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {selectedPermissions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedPermissions.length}</strong> tipo(s) de dado selecionado(s).
                  O paciente poderá aceitar ou recusar cada um individualmente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LGPD Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Conformidade LGPD:</strong> O paciente receberá informações claras sobre 
            quais dados serão coletados e poderá autorizar ou negar cada tipo individualmente. 
            Todas as autorizações são registradas com data, hora e IP para fins de auditoria.
          </AlertDescription>
        </Alert>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando convite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Criar Convite
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/patients">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
