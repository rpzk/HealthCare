'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  Presentation,
  FileText,
  QrCode,
  User,
  Play,
  Copy,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'

export default function DemoPage() {
  const { toast } = useToast()
  const [demoAccount, setDemoAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    checkDemoAccount()
  }, [])

  const checkDemoAccount = async () => {
    try {
      const response = await fetch('/api/demo/account')
      if (response.ok) {
        const data = await response.json()
        setDemoAccount(data)
      }
    } catch (error) {
      console.error('Error checking demo account:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDemoAccount = async () => {
    try {
      setCreating(true)
      const response = await fetch('/api/demo/account', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        toast({ title: data.message })
        checkDemoAccount()
      }
    } catch (error) {
      toast({ title: 'Erro ao criar conta demo', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const generateQRCode = async (url: string) => {
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2
      })
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('Error generating QR:', error)
    }
  }

  const handleInviteUrlChange = (url: string) => {
    setInviteUrl(url)
    if (url) {
      generateQRCode(url)
    } else {
      setQrCodeUrl('')
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast({ title: 'Copiado!' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Centro de Demonstração</h1>
        <p className="text-muted-foreground">
          Recursos para apresentar o sistema para clientes
        </p>
      </div>

      {/* Main Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Script de Demo */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Script de Demonstração</CardTitle>
            <CardDescription>
              Roteiro passo-a-passo com cronômetro e checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/demo/script">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Script
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Slides */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-2">
              <Presentation className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle>Apresentação de Slides</CardTitle>
            <CardDescription>
              8 slides com visão geral do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/demo/slides">
                <Play className="h-4 w-4 mr-2" />
                Ver Slides
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Conta Demo */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-2">
              <User className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Conta Demo</CardTitle>
            <CardDescription>
              Conta de demonstração com acesso de médico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demoAccount?.exists ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Conta ativa</span>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <code>{demoAccount.credentials?.email}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Senha:</span>
                    <code>{demoAccount.credentials?.password}</code>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => copyToClipboard(`${demoAccount.credentials?.email} / ${demoAccount.credentials?.password}`)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Credenciais
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={createDemoAccount}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Criar Conta Demo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Gerador de QR Code
          </CardTitle>
          <CardDescription>
            Cole o link do convite para gerar um QR Code que o cliente pode escanear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link do Convite</label>
                <Input
                  placeholder="https://healthcare.../invite/abc123..."
                  value={inviteUrl}
                  onChange={(e) => handleInviteUrlChange(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/patients/invite', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Criar Convite
                </Button>
                {inviteUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => copyToClipboard(inviteUrl)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center">
              {qrCodeUrl ? (
                <div className="text-center space-y-2">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code"
                    className="border rounded-lg p-2 bg-white mx-auto"
                  />
                  <p className="text-xs text-muted-foreground">
                    Escaneie com o celular
                  </p>
                </div>
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center p-4">
                    Cole um link para gerar o QR Code
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links Úteis para Demonstração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Dashboard', url: '/', icon: '📊' },
              { label: 'Pacientes', url: '/patients', icon: '👥' },
              { label: 'Convidar Paciente', url: '/patients/invite', icon: '✉️' },
              { label: 'Consultas', url: '/consultations', icon: '📅' },
              { label: 'Prescrições', url: '/prescriptions', icon: '💊' },
              { label: 'Gerenciar Papéis', url: '/admin/users/roles', icon: '👤' },
              { label: 'Dispositivos', url: '/devices', icon: '⌚' },
              { label: 'Privacidade', url: '/settings/privacy', icon: '🔒' },
            ].map(link => (
              <Button
                key={link.url}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => window.open(link.url, '_blank')}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
