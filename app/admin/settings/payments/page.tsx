'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { 
  Loader2, Save, Eye, EyeOff, CreditCard, Wallet, QrCode, 
  Building2, Bitcoin, CheckCircle2, XCircle, Info, HelpCircle,
  ArrowRight, Shield
} from 'lucide-react'

interface PaymentProvider {
  provider: string
  name: string
  description: string
  isConfigured: boolean
  icon: string
}

interface PaymentSettings {
  // PIX
  pix_enabled: boolean
  pix_key: string
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  pix_merchant_name: string
  pix_merchant_city: string
  
  // RedotPay
  redotpay_enabled: boolean
  redotpay_pix_key: string
  redotpay_crypto_type: 'USDT' | 'USDC' | 'BTC'
  
  // Crypto direto
  crypto_enabled: boolean
  crypto_btc_address: string
  crypto_eth_address: string
  crypto_usdt_address: string
  crypto_network: 'ethereum' | 'tron' | 'polygon'
  
  // MercadoPago (mantém no .env por ser token de API)
  mercadopago_enabled: boolean
}

const DEFAULT_SETTINGS: PaymentSettings = {
  pix_enabled: false,
  pix_key: '',
  pix_key_type: 'random',
  pix_merchant_name: '',
  pix_merchant_city: '',
  redotpay_enabled: false,
  redotpay_pix_key: '',
  redotpay_crypto_type: 'USDT',
  crypto_enabled: false,
  crypto_btc_address: '',
  crypto_eth_address: '',
  crypto_usdt_address: '',
  crypto_network: 'ethereum',
  mercadopago_enabled: false,
}

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS)
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('pix')
  const [hasChanges, setHasChanges] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      // Carregar configurações do sistema
      const settingsRes = await fetch('/api/system/settings?category=PAYMENTS')
      const settingsData = await settingsRes.json()
      
      if (settingsData.success && settingsData.settings) {
        const loaded: Partial<PaymentSettings> = {}
        for (const s of settingsData.settings) {
          const key = s.key.toLowerCase().replace(/^payment_/, '') as keyof PaymentSettings
          if (s.value === 'true') {
            (loaded as any)[key] = true
          } else if (s.value === 'false') {
            (loaded as any)[key] = false
          } else {
            (loaded as any)[key] = s.value
          }
        }
        setSettings(prev => ({ ...prev, ...loaded }))
      }
      
      // Carregar status dos provedores
      const providersRes = await fetch('/api/payments/providers')
      if (providersRes.ok) {
        const providersData = await providersRes.json()
        setProviders(providersData.providers || [])
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Converter settings para formato de API
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key: `PAYMENT_${key.toUpperCase()}`,
        value: String(value),
        category: 'PAYMENTS',
        encrypted: key.includes('key') || key.includes('address'),
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Configurações de pagamento salvas!')
        setHasChanges(false)
        await loadSettings()
      } else {
        toastApiError(data, 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      pix_enabled: 'Habilitar pagamentos via PIX',
      pix_key: 'Sua chave PIX para recebimentos',
      pix_merchant_name: 'Nome que aparece no comprovante PIX',
      redotpay_enabled: 'Habilitar PIX que converte para crypto',
      redotpay_pix_key: 'Chave PIX da sua conta RedotPay',
      crypto_enabled: 'Habilitar pagamentos diretos em crypto',
    }
    return descriptions[key] || ''
  }

  const isProviderConfigured = (provider: string) => {
    return providers.find(p => p.provider === provider)?.isConfigured || false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Configurações de Pagamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure como sua clínica receberá pagamentos dos pacientes
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Alterações não salvas</AlertTitle>
          <AlertDescription>
            Você tem alterações pendentes. Clique em &quot;Salvar Alterações&quot; para aplicar.
          </AlertDescription>
        </Alert>
      )}

      {/* Status dos Provedores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status dos Provedores</CardTitle>
          <CardDescription>Veja quais métodos de pagamento estão ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'pix', name: 'PIX', icon: <QrCode className="h-5 w-5" />, enabled: settings.pix_enabled },
              { id: 'redotpay', name: 'PIX→Crypto', icon: <Wallet className="h-5 w-5" />, enabled: settings.redotpay_enabled },
              { id: 'crypto', name: 'Crypto', icon: <Bitcoin className="h-5 w-5" />, enabled: settings.crypto_enabled },
              { id: 'mercadopago', name: 'Mercado Pago', icon: <CreditCard className="h-5 w-5" />, enabled: isProviderConfigured('mercadopago') },
            ].map(p => (
              <div 
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  p.enabled ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-muted'
                }`}
              >
                {p.icon}
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                </div>
                {p.enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações por Provedor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pix" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            PIX
          </TabsTrigger>
          <TabsTrigger value="redotpay" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            RedotPay
          </TabsTrigger>
          <TabsTrigger value="crypto" className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4" />
            Crypto
          </TabsTrigger>
          <TabsTrigger value="gateways" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Gateways
          </TabsTrigger>
        </TabsList>

        {/* PIX */}
        <TabsContent value="pix">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    PIX Tradicional
                  </CardTitle>
                  <CardDescription>
                    Receba pagamentos instantâneos via PIX (em Reais)
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.pix_enabled}
                  onCheckedChange={(v) => updateSetting('pix_enabled', v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pix_key_type">Tipo da Chave PIX</Label>
                  <Select
                    value={settings.pix_key_type}
                    onValueChange={(v) => updateSetting('pix_key_type', v as any)}
                    disabled={!settings.pix_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pix_key"
                      type={showSecrets['pix_key'] ? 'text' : 'password'}
                      value={settings.pix_key}
                      onChange={(e) => updateSetting('pix_key', e.target.value)}
                      placeholder="Sua chave PIX"
                      disabled={!settings.pix_enabled}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('pix_key')}
                    >
                      {showSecrets['pix_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pix_merchant_name">Nome no Comprovante</Label>
                  <Input
                    id="pix_merchant_name"
                    value={settings.pix_merchant_name}
                    onChange={(e) => updateSetting('pix_merchant_name', e.target.value)}
                    placeholder="Ex: Clínica Saúde"
                    disabled={!settings.pix_enabled}
                    maxLength={25}
                  />
                  <p className="text-xs text-muted-foreground">Máximo 25 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_merchant_city">Cidade</Label>
                  <Input
                    id="pix_merchant_city"
                    value={settings.pix_merchant_city}
                    onChange={(e) => updateSetting('pix_merchant_city', e.target.value)}
                    placeholder="Ex: São Paulo"
                    disabled={!settings.pix_enabled}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">Máximo 15 caracteres</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RedotPay */}
        <TabsContent value="redotpay">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    RedotPay (PIX → Crypto)
                  </CardTitle>
                  <CardDescription>
                    Paciente paga via PIX, você recebe em criptomoeda
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.redotpay_enabled}
                  onCheckedChange={(v) => updateSetting('redotpay_enabled', v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle>Como funciona</AlertTitle>
                <AlertDescription className="text-sm space-y-2">
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">1</span>
                    <span>Paciente paga via PIX (usando qualquer banco)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">2</span>
                    <span>RedotPay converte automaticamente para {settings.redotpay_crypto_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">3</span>
                    <span>Você recebe crypto na sua carteira RedotPay</span>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="redotpay_pix_key">Chave PIX RedotPay</Label>
                  <div className="flex gap-2">
                    <Input
                      id="redotpay_pix_key"
                      type={showSecrets['redotpay_pix_key'] ? 'text' : 'password'}
                      value={settings.redotpay_pix_key}
                      onChange={(e) => updateSetting('redotpay_pix_key', e.target.value)}
                      placeholder="Chave PIX da sua conta RedotPay"
                      disabled={!settings.redotpay_enabled}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('redotpay_pix_key')}
                    >
                      {showSecrets['redotpay_pix_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encontre no app RedotPay → Receber → PIX
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redotpay_crypto_type">Receber em</Label>
                  <Select
                    value={settings.redotpay_crypto_type}
                    onValueChange={(v) => updateSetting('redotpay_crypto_type', v as any)}
                    disabled={!settings.redotpay_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT (Tether)</SelectItem>
                      <SelectItem value="USDC">USDC (Circle)</SelectItem>
                      <SelectItem value="BTC">Bitcoin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Stablecoins mantêm valor estável em dólar
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Proteja seu patrimônio contra desvalorização do Real
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Crypto Direto */}
        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5" />
                    Criptomoedas Direto
                  </CardTitle>
                  <CardDescription>
                    Receba Bitcoin, Ethereum ou USDT diretamente na sua carteira
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.crypto_enabled}
                  onCheckedChange={(v) => updateSetting('crypto_enabled', v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Para pacientes familiarizados com crypto</AlertTitle>
                <AlertDescription>
                  Use esta opção se seus pacientes já possuem carteiras de criptomoedas.
                  Para a maioria, recomendamos o RedotPay (paciente paga PIX normal).
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto_btc_address" className="flex items-center gap-2">
                    <span className="text-orange-500">₿</span> Endereço Bitcoin
                  </Label>
                  <Input
                    id="crypto_btc_address"
                    value={settings.crypto_btc_address}
                    onChange={(e) => updateSetting('crypto_btc_address', e.target.value)}
                    placeholder="bc1q..."
                    disabled={!settings.crypto_enabled}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto_eth_address" className="flex items-center gap-2">
                    <span className="text-blue-500">Ξ</span> Endereço Ethereum
                  </Label>
                  <Input
                    id="crypto_eth_address"
                    value={settings.crypto_eth_address}
                    onChange={(e) => updateSetting('crypto_eth_address', e.target.value)}
                    placeholder="0x..."
                    disabled={!settings.crypto_enabled}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="crypto_usdt_address" className="flex items-center gap-2">
                      <span className="text-green-500">₮</span> Endereço USDT
                    </Label>
                    <Input
                      id="crypto_usdt_address"
                      value={settings.crypto_usdt_address}
                      onChange={(e) => updateSetting('crypto_usdt_address', e.target.value)}
                      placeholder="0x... ou T..."
                      disabled={!settings.crypto_enabled}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crypto_network">Rede USDT</Label>
                    <Select
                      value={settings.crypto_network}
                      onValueChange={(v) => updateSetting('crypto_network', v as any)}
                      disabled={!settings.crypto_enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum (ERC-20)</SelectItem>
                        <SelectItem value="tron">Tron (TRC-20) - Taxas menores</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gateways Tradicionais */}
        <TabsContent value="gateways">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gateways de Pagamento
              </CardTitle>
              <CardDescription>
                Aceite cartões de crédito, débito e boleto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Configuração via Ambiente</AlertTitle>
                <AlertDescription>
                  Por segurança, as credenciais de gateways como Mercado Pago e Stripe 
                  devem ser configuradas no arquivo <code className="bg-muted px-1 rounded">.env</code> do servidor.
                  Isso protege suas chaves de API contra exposição.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {[
                  { 
                    name: 'Mercado Pago', 
                    id: 'mercadopago',
                    description: 'Cartões, PIX, boleto. Popular no Brasil.',
                    envVars: ['MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_PUBLIC_KEY'],
                  },
                  { 
                    name: 'Stripe', 
                    id: 'stripe',
                    description: 'Cartões internacionais. Ideal para pacientes estrangeiros.',
                    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'],
                  },
                  { 
                    name: 'PagSeguro', 
                    id: 'pagseguro',
                    description: 'Alternativa brasileira com boleto e transferência.',
                    envVars: ['PAGSEGURO_EMAIL', 'PAGSEGURO_TOKEN'],
                  },
                ].map(gateway => (
                  <div 
                    key={gateway.id}
                    className={`p-4 rounded-lg border ${
                      isProviderConfigured(gateway.id) 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {gateway.name}
                          {isProviderConfigured(gateway.id) && (
                            <Badge variant="default" className="bg-green-600">Configurado</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{gateway.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Variáveis: {gateway.envVars.map(v => <code key={v} className="bg-muted px-1 rounded mr-1">{v}</code>)}
                        </p>
                      </div>
                      {isProviderConfigured(gateway.id) ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50">
              <p className="text-sm text-muted-foreground">
                💡 Dica: Para configurar gateways, edite o arquivo <code>.env</code> e reinicie a aplicação.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
