'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Settings, Building2, CreditCard, Mail, MessageSquare, 
  HardDrive, Video, ChevronRight, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigStatus {
  category: string
  configured: number
  total: number
  isComplete: boolean
}

const CONFIG_SECTIONS = [
  {
    id: 'clinic',
    title: 'Dados da Clínica',
    description: 'Nome, CNPJ, endereço e informações de contato',
    href: '/admin/settings/clinic',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    priority: 1,
  },
  {
    id: 'payments',
    title: 'Pagamentos',
    description: 'PIX, cartões, criptomoedas e gateways',
    href: '/admin/settings/payments',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    priority: 2,
  },
  {
    id: 'email',
    title: 'E-mail',
    description: 'SMTP para envio de confirmações e lembretes',
    href: '/admin/settings/email',
    icon: Mail,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    priority: 3,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Integração para notificações e confirmações',
    href: '/admin/settings/whatsapp',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    priority: 4,
  },
  {
    id: 'storage',
    title: 'Armazenamento',
    description: 'Local, S3 ou MinIO para arquivos e gravações',
    href: '/admin/settings/storage',
    icon: HardDrive,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    priority: 5,
  },
  {
    id: 'telemedicine',
    title: 'Telemedicina',
    description: 'WebRTC, TURN server e configurações de vídeo',
    href: '/admin/settings/telemedicine',
    icon: Video,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
    priority: 6,
  },
]

export default function SettingsHubPage() {
  const [loading, setLoading] = useState(true)
  const [statusMap, setStatusMap] = useState<Record<string, ConfigStatus>>({})

  useEffect(() => {
    loadConfigStatus()
  }, [])

  const loadConfigStatus = async () => {
    try {
      setLoading(true)
      
      // Carregar todas as configurações para verificar status
      const res = await fetch('/api/system/settings')
      const data = await res.json()
      
      if (data.success) {
        // Calcular status por categoria
        const categoryMap: Record<string, string[]> = {
          clinic: ['CLINIC_NAME', 'CLINIC_CNPJ', 'CLINIC_ADDRESS', 'CLINIC_PHONE'],
          payments: ['PAYMENT_PIX_ENABLED', 'PAYMENT_PIX_KEY', 'PAYMENT_REDOTPAY_ENABLED'],
          email: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
          whatsapp: ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY', 'WHATSAPP_INSTANCE_ID'],
          storage: ['STORAGE_TYPE', 'LOCAL_STORAGE_PATH'],
          telemedicine: ['WEBRTC_STUN_SERVER', 'WEBRTC_TURN_SERVER'],
        }
        
        const status: Record<string, ConfigStatus> = {}
        
        for (const [category, requiredKeys] of Object.entries(categoryMap)) {
          const configured = requiredKeys.filter(key => 
            data.settings.some((s: any) => s.key === key && s.value && s.value.trim() !== '')
          ).length
          
          status[category] = {
            category,
            configured,
            total: requiredKeys.length,
            isComplete: configured >= Math.ceil(requiredKeys.length * 0.5), // 50% = básico OK
          }
        }
        
        setStatusMap(status)
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
      toast.error('Erro ao verificar status das configurações')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (sectionId: string) => {
    const status = statusMap[sectionId]
    if (!status) return null
    
    if (status.isComplete) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Configurado
        </Badge>
      )
    }
    
    if (status.configured > 0) {
      return (
        <Badge variant="secondary">
          {status.configured}/{status.total}
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Calcular progresso geral
  const totalConfigured = Object.values(statusMap).filter(s => s.isComplete).length
  const totalSections = CONFIG_SECTIONS.length
  const progressPercent = Math.round((totalConfigured / totalSections) * 100)

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure sua clínica de forma simples e organizada
        </p>
      </div>

      {/* Progresso Geral */}
      {progressPercent < 100 && (
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertTitle>Configuração em andamento</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{totalConfigured} de {totalSections} seções configuradas</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Configuração */}
      <div className="grid gap-4 md:grid-cols-2">
        {CONFIG_SECTIONS.map((section) => (
          <Link key={section.id} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <section.icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(section.id)}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle className="mt-3">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Aviso sobre .env */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Lock className="h-5 w-5" />
            Configurações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Algumas configurações críticas de segurança só podem ser alteradas no servidor 
            pelo administrador técnico. São elas:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>Credenciais do banco de dados</li>
            <li>Chaves de criptografia</li>
            <li>Secrets de autenticação</li>
            <li>Tokens de API de gateways (Mercado Pago, Stripe)</li>
          </ul>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            Se precisar alterar essas configurações, entre em contato com o suporte técnico.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
