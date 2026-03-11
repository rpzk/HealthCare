"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Cloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  LogOut,
  Timer,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

interface CloudProvider {
  id: string
  name: string
  configured: boolean
}

interface CloudSession {
  active: boolean
  provider?: string
  providerName?: string
  cpf?: string
  expiresAt?: string
  remainingSeconds?: number
}

export function CloudCertificateConfig() {
  const [providers, setProviders] = useState<CloudProvider[]>([])
  const [session, setSession] = useState<CloudSession>({ active: false })
  const [loading, setLoading] = useState(true)
  const [authorizing, setAuthorizing] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [cpf, setCpf] = useState('')
  const [method, setMethod] = useState<'qrcode' | 'push'>('qrcode')

  // Push polling
  const [pushState, setPushState] = useState<string | null>(null)
  const [pushCode, setPushCode] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // QR Code window
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrState, setQrState] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/certificates/cloud')
      if (!res.ok) return
      const data = await res.json()
      setProviders(data.providers || [])
      setSession(data.session || { active: false })
      if (data.providers?.length && !selectedProvider) {
        const configured = data.providers.find((p: CloudProvider) => p.configured)
        if (configured) setSelectedProvider(configured.id)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [selectedProvider])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Timer display
  const [remainingDisplay, setRemainingDisplay] = useState('')
  useEffect(() => {
    if (!session.active || !session.remainingSeconds) return
    let remaining = session.remainingSeconds
    const interval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(interval)
        setSession({ active: false })
        return
      }
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      setRemainingDisplay(`${h}h ${m}min`)
    }, 1000)
    const h = Math.floor(remaining / 3600)
    const m = Math.floor((remaining % 3600) / 60)
    setRemainingDisplay(`${h}h ${m}min`)
    return () => clearInterval(interval)
  }, [session.active, session.remainingSeconds])

  const formatCpfInput = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }

  const handleAuthorize = async () => {
    if (!selectedProvider) {
      toast.error('Selecione um provedor')
      return
    }
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      toast.error('CPF inválido')
      return
    }

    setAuthorizing(true)
    setQrUrl(null)
    setPushState(null)
    setPushCode(null)

    try {
      const res = await fetch('/api/certificates/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, method, cpf: cleanCpf }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Falha na autorização')
        setAuthorizing(false)
        return
      }

      if (data.method === 'qrcode' && data.authorizeUrl) {
        setQrUrl(data.authorizeUrl)
        setQrState(data.state)
        window.open(data.authorizeUrl, '_blank', 'width=500,height=600')
        toast.info('Janela de autorização aberta. Escaneie o QR Code no app do provedor.')
        startQRPolling(data.state)
      } else if (data.method === 'push') {
        setPushState(data.state)
        setPushCode(data.pushCode)
        toast.info(data.message || 'Notificação enviada!')
        startPushPolling(data.state, data.pushCode)
      }
    } catch (err) {
      toast.error('Erro ao conectar com provedor')
      setAuthorizing(false)
    }
  }

  const startPushPolling = (state: string, code: string) => {
    setPollCount(0)
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      setPollCount((c) => {
        if (c >= 120) {
          if (pollRef.current) clearInterval(pollRef.current)
          setAuthorizing(false)
          toast.error('Tempo esgotado. Tente novamente.')
          return c
        }
        return c + 1
      })

      try {
        const res = await fetch('/api/certificates/cloud/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, pushCode: code }),
        })
        const data = await res.json()
        if (data.status === 'success') {
          if (pollRef.current) clearInterval(pollRef.current)
          setAuthorizing(false)
          setPushState(null)
          setPushCode(null)
          toast.success(`Conectado ao ${data.providerName}!`)
          loadStatus()
        }
      } catch { /* continue polling */ }
    }, 2000)
  }

  const startQRPolling = (state: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    setPollCount(0)

    pollRef.current = setInterval(async () => {
      setPollCount((c) => {
        if (c >= 60) {
          if (pollRef.current) clearInterval(pollRef.current)
          setAuthorizing(false)
          setQrUrl(null)
          toast.error('Tempo esgotado. Tente novamente.')
          return c
        }
        return c + 1
      })

      try {
        const res = await fetch('/api/certificates/cloud')
        if (!res.ok) return
        const data = await res.json()
        if (data.session?.active) {
          if (pollRef.current) clearInterval(pollRef.current)
          setAuthorizing(false)
          setQrUrl(null)
          toast.success(`Conectado ao ${data.session.providerName}!`)
          loadStatus()
        }
      } catch { /* continue */ }
    }, 3000)
  }

  const handleDisconnect = async () => {
    try {
      await fetch('/api/certificates/cloud', { method: 'DELETE' })
      setSession({ active: false })
      toast.success('Sessão cloud encerrada')
    } catch {
      toast.error('Erro ao encerrar sessão')
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const configuredProviders = providers.filter((p) => p.configured)

  if (configuredProviders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Certificado em Nuvem
          </CardTitle>
          <CardDescription>BirdID (Soluti) e VIDaaS (VALID)</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum provedor de certificado em nuvem configurado.
              O administrador precisa configurar <code>VIDAAS_CLIENT_ID</code> / <code>BIRDID_CLIENT_ID</code> nas
              variáveis de ambiente do sistema.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Certificado em Nuvem
        </CardTitle>
        <CardDescription>
          Assine documentos com seu certificado digital em nuvem (BirdID ou VIDaaS)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.active ? (
          <div className="space-y-3">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Conectado ao {session.providerName}</span>
                    {session.cpf && <span className="text-sm ml-2">({session.cpf})</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-3.5 w-3.5" />
                    {remainingDisplay}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <LogOut className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Provedor</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProviders.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>CPF do titular</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Método de autorização</Label>
              <div className="flex gap-2">
                <Button
                  variant={method === 'qrcode' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMethod('qrcode')}
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  QR Code
                </Button>
                <Button
                  variant={method === 'push' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMethod('push')}
                >
                  <Smartphone className="h-4 w-4 mr-1" />
                  Notificação Push
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAuthorize}
              disabled={authorizing || !selectedProvider || cpf.replace(/\D/g, '').length !== 11}
              className="w-full"
            >
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {pushState
                    ? `Aguardando autorização no celular... (${pollCount}s)`
                    : qrUrl
                      ? `Aguardando leitura do QR Code... (${pollCount * 3}s)`
                      : 'Conectando...'}
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Conectar certificado em nuvem
                </>
              )}
            </Button>

            {qrUrl && (
              <div className="text-center">
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir página de autorização novamente
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
