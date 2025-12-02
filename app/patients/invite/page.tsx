'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    type: 'SPO2',
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
    type: 'ACTIVITY',
    label: 'Atividade',
    description: 'Exercícios e calorias',
    icon: Footprints,
    color: 'text-green-500',
    recommended: false
  },
  {
    type: 'TEMPERATURE',
    label: 'Temperatura',
    description: 'Temperatura corporal',
    icon: Thermometer,
    color: 'text-orange-500',
    recommended: false
  }
]

export default function InvitePatientPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Form state
  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'HEART_RATE', 'BLOOD_PRESSURE', 'SPO2' // Recomendados por padrão
  ])

  const handleTogglePermission = (type: string) => {
    setSelectedPermissions(prev => 
      prev.includes(type) 
        ? prev.filter(p => p !== type)
        : [...prev, type]
    )
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
          message,
          requestedPermissions: selectedPermissions
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.inviteUrl)
        toast({ title: 'Convite criado com sucesso!' })
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
    setPatientName('')
    setPatientEmail('')
    setMessage('')
    setSelectedPermissions(['HEART_RATE', 'BLOOD_PRESSURE', 'SPO2'])
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
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleTogglePermission(item.type)}
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
