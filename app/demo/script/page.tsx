'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw,
  CheckCircle,
  Circle,
  Clock,
  Monitor,
  Smartphone,
  Copy,
  QrCode,
  ExternalLink,
  ChevronRight,
  Loader2,
  Presentation
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import QRCode from 'qrcode'

interface DemoStep {
  id: number
  phase: string
  title: string
  description: string
  action: string
  url?: string
  device: 'apresentador' | 'cliente' | 'ambos'
  duration: number // segundos estimados
  tips?: string[]
}

const demoSteps: DemoStep[] = [
  // FASE 1: Preparação
  {
    id: 1,
    phase: 'Preparação',
    title: 'Login como Administrador',
    description: 'Acesse o sistema com sua conta de administrador/médico',
    action: 'Faça login com suas credenciais',
    url: '/auth/login',
    device: 'apresentador',
    duration: 30,
    tips: ['Tenha as credenciais prontas', 'Verifique se está como ADMIN ou DOCTOR']
  },
  {
    id: 2,
    phase: 'Preparação',
    title: 'Mostrar Dashboard',
    description: 'Apresente rapidamente o painel principal do sistema',
    action: 'Navegue pelo dashboard, mostre os cards de estatísticas',
    url: '/',
    device: 'apresentador',
    duration: 60,
    tips: ['Destaque os números de pacientes e consultas', 'Mencione que tudo é em tempo real']
  },
  
  // FASE 2: Convite do Paciente
  {
    id: 3,
    phase: 'Experiência do Paciente',
    title: 'Criar Convite para o Cliente',
    description: 'Demonstre como convidar um paciente para o sistema',
    action: 'Vá em Pacientes → Convidar Paciente',
    url: '/patients/invite',
    device: 'apresentador',
    duration: 45,
    tips: ['Use o email real do cliente', 'Selecione alguns dados biométricos']
  },
  {
    id: 4,
    phase: 'Experiência do Paciente',
    title: 'Gerar QR Code do Convite',
    description: 'Gere o QR Code para o cliente escanear',
    action: 'Copie o link e mostre o QR Code nesta página',
    device: 'apresentador',
    duration: 30,
    tips: ['O QR Code facilita o acesso pelo celular']
  },
  {
    id: 5,
    phase: 'Experiência do Paciente',
    title: 'Cliente Aceita o Convite',
    description: 'O cliente escaneia o QR e aceita o convite',
    action: 'Cliente abre o link, vê os termos e cria sua conta',
    device: 'cliente',
    duration: 120,
    tips: ['Deixe o cliente ler os termos LGPD', 'Mostre que ele escolhe quais dados compartilhar']
  },
  
  // FASE 3: Teleconsulta (cliente como paciente)
  {
    id: 6,
    phase: 'Teleconsulta',
    title: 'Agendar Consulta',
    description: 'Agende uma consulta para o cliente recém-cadastrado',
    action: 'Vá em Agenda, selecione horário e paciente',
    url: '/consultations',
    device: 'apresentador',
    duration: 45,
    tips: ['Mostre a facilidade de agendar', 'Pode ser consulta imediata']
  },
  {
    id: 7,
    phase: 'Teleconsulta',
    title: 'Iniciar Videochamada',
    description: 'Inicie a teleconsulta com o cliente',
    action: 'Clique em iniciar consulta, ative câmera e microfone',
    device: 'ambos',
    duration: 180,
    tips: ['Teste áudio e vídeo antes', 'Demonstre o prontuário durante a chamada']
  },
  {
    id: 8,
    phase: 'Teleconsulta',
    title: 'Criar Prescrição',
    description: 'Demonstre a criação de uma prescrição durante a consulta',
    action: 'Abra o painel de prescrição, adicione medicamento',
    url: '/prescriptions',
    device: 'apresentador',
    duration: 60,
    tips: ['Use medicamento fictício', 'Mostre a assinatura digital']
  },
  
  // FASE 4: Inversão de Papéis
  {
    id: 9,
    phase: 'Inversão de Papéis',
    title: 'Promover Cliente para Médico',
    description: 'Transforme o cliente em médico no sistema',
    action: 'Vá em Admin → Gerenciar Papéis → Alterar para DOCTOR',
    url: '/admin/users/roles',
    device: 'apresentador',
    duration: 45,
    tips: ['Explique que o perfil de paciente é mantido', 'Preencha CRM fictício']
  },
  {
    id: 10,
    phase: 'Inversão de Papéis',
    title: 'Cliente Faz Novo Login',
    description: 'Cliente faz logout e login para ver novo papel',
    action: 'Cliente acessa novamente e vê dashboard de médico',
    device: 'cliente',
    duration: 60,
    tips: ['Destaque a mudança na interface', 'Agora ele tem menu de médico']
  },
  {
    id: 11,
    phase: 'Inversão de Papéis',
    title: 'Cliente Envia Convite',
    description: 'Agora o cliente, como médico, envia convite para você',
    action: 'Cliente vai em Pacientes → Convidar e convida você',
    url: '/patients/invite',
    device: 'cliente',
    duration: 60,
    tips: ['Papéis invertidos!', 'Mostra flexibilidade do sistema']
  },
  {
    id: 12,
    phase: 'Inversão de Papéis',
    title: 'Você Aceita como Paciente',
    description: 'Aceite o convite ou ative perfil de paciente',
    action: 'Acesse o link ou vá em Perfil → Ativar Perfil de Paciente',
    url: '/profile/become-patient',
    device: 'apresentador',
    duration: 60,
    tips: ['Demonstra que qualquer um pode ter ambos os papéis']
  },
  {
    id: 13,
    phase: 'Inversão de Papéis',
    title: 'Cliente Faz Teleconsulta com Você',
    description: 'Agora o cliente é o médico e você é o paciente!',
    action: 'Cliente inicia consulta, você participa como paciente',
    device: 'ambos',
    duration: 120,
    tips: ['Momento impactante da demo', 'Mostra a versatilidade']
  },
  
  // FASE 5: Encerramento
  {
    id: 14,
    phase: 'Encerramento',
    title: 'Mostrar Configurações de Privacidade',
    description: 'Demonstre o painel de privacidade LGPD',
    action: 'Vá em Configurações → Privacidade',
    url: '/settings/privacy',
    device: 'apresentador',
    duration: 45,
    tips: ['Destaque conformidade LGPD', 'Paciente controla seus dados']
  },
  {
    id: 15,
    phase: 'Encerramento',
    title: 'Perguntas e Discussão',
    description: 'Abra para perguntas do cliente',
    action: 'Responda dúvidas, discuta próximos passos',
    device: 'ambos',
    duration: 300,
    tips: ['Tenha proposta comercial pronta', 'Ofereça período de teste']
  }
]

export default function DemoScriptPage() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [inviteLink, setInviteLink] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  const generateQRCode = async (link: string) => {
    try {
      const url = await QRCode.toDataURL(link, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
      setQrCodeUrl(url)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handleSetInviteLink = (link: string) => {
    setInviteLink(link)
    if (link) {
      generateQRCode(link)
    }
  }

  const handleNextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
    setCompletedSteps([])
    setElapsedTime(0)
    setIsRunning(false)
    setInviteLink('')
    setQrCodeUrl('')
  }

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      toast({ title: 'Link copiado!' })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalDuration = demoSteps.reduce((acc, step) => acc + step.duration, 0)
  const currentPhase = demoSteps[currentStep]?.phase
  const phases = [...new Set(demoSteps.map(s => s.phase))]

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Presentation className="h-6 w-6 text-primary" />
            Script de Demonstração
          </h1>
          <p className="text-muted-foreground">
            Roteiro passo-a-passo para apresentar o sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              Estimado: ~{Math.ceil(totalDuration / 60)} min
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isRunning ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {demoSteps.length} passos
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {phases.map((phase, i) => (
              <Badge 
                key={phase}
                variant={currentPhase === phase ? 'default' : 'outline'}
                className="text-xs"
              >
                {phase}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Step */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge>{demoSteps[currentStep].phase}</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  ~{demoSteps[currentStep].duration}s
                  {demoSteps[currentStep].device === 'apresentador' && (
                    <Badge variant="outline"><Monitor className="h-3 w-3 mr-1" />Você</Badge>
                  )}
                  {demoSteps[currentStep].device === 'cliente' && (
                    <Badge variant="outline"><Smartphone className="h-3 w-3 mr-1" />Cliente</Badge>
                  )}
                  {demoSteps[currentStep].device === 'ambos' && (
                    <Badge variant="secondary">Ambos</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-xl">
                Passo {currentStep + 1}: {demoSteps[currentStep].title}
              </CardTitle>
              <CardDescription className="text-base">
                {demoSteps[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="font-medium flex items-center gap-2">
                  <ChevronRight className="h-5 w-5 text-primary" />
                  {demoSteps[currentStep].action}
                </p>
              </div>

              {demoSteps[currentStep].url && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {baseUrl}{demoSteps[currentStep].url}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(demoSteps[currentStep].url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {demoSteps[currentStep].tips && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">💡 Dicas:</p>
                  <ul className="text-sm space-y-1">
                    {demoSteps[currentStep].tips?.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                >
                  Anterior
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNextStep}
                  disabled={currentStep === demoSteps.length - 1}
                >
                  Próximo Passo
                  <SkipForward className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Steps List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Todos os Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {demoSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`
                      flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                      ${index === currentStep ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                    onClick={() => setCurrentStep(index)}
                  >
                    {completedSteps.includes(index) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : index === currentStep ? (
                      <Circle className="h-5 w-5 text-primary fill-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={`flex-1 text-sm ${index === currentStep ? 'font-medium' : ''}`}>
                      {step.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {step.phase}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code do Convite
              </CardTitle>
              <CardDescription>
                Cole o link do convite para gerar o QR Code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cole o link do convite aqui..."
                  value={inviteLink}
                  onChange={(e) => handleSetInviteLink(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                {inviteLink && (
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {qrCodeUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code do Convite"
                    className="border rounded-lg p-2 bg-white"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Cliente pode escanear este QR Code<br />para acessar o convite
                  </p>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Cole o link do convite<br />para gerar o QR Code
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Links Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Dashboard', url: '/' },
                { label: 'Convidar Paciente', url: '/patients/invite' },
                { label: 'Gerenciar Papéis', url: '/admin/users/roles' },
                { label: 'Ativar Paciente', url: '/profile/become-patient' },
                { label: 'Privacidade', url: '/settings/privacy' },
                { label: 'Dispositivos', url: '/devices' },
              ].map(link => (
                <Button
                  key={link.url}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
