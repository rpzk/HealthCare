'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Save, TestTube, Shield, Cloud, Server, Bot, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface AISettings {
  provider: 'groq' | 'ollama' | 'openai'
  groqApiKey: string | null
  hasGroqKey: boolean
  groqModel: string
  ollamaUrl: string
  ollamaModel: string
  enableAnonymization: boolean
  availableModels: {
    groq: string[]
    ollama: string[]
  }
}

interface TestResult {
  success: boolean
  provider?: string
  model?: string
  response?: string
  anonymizationEnabled?: boolean
  responseTime?: number
  error?: string
}

interface AnonymizationTestResult {
  original: string
  anonymized: string
  replacements: Record<string, string>
  detectedTypes: string[]
  isAnonymized: boolean
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingAnonymization, setTestingAnonymization] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [anonymizationResult, setAnonymizationResult] = useState<AnonymizationTestResult | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  
  // Form state
  const [provider, setProvider] = useState<'groq' | 'ollama' | 'openai'>('ollama')
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile')
  const [ollamaUrl, setOllamaUrl] = useState('http://ollama:11434')
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:3b')
  const [enableAnonymization, setEnableAnonymization] = useState(true)
  const [testText, setTestText] = useState(
    'Paciente João Silva, CPF 123.456.789-00, telefone (11) 98765-4321, ' +
    'email joao.silva@email.com, nascido em 15/03/1985, ' +
    'residente na Rua das Flores, 123, CEP 01234-567. ' +
    'Queixa: dor de cabeça há 3 dias.'
  )

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings')
      if (!res.ok) throw new Error('Falha ao carregar configurações')
      const data = await res.json()
      setSettings(data)
      setProvider(data.provider)
      setGroqModel(data.groqModel)
      setOllamaUrl(data.ollamaUrl)
      setOllamaModel(data.ollamaModel)
      setEnableAnonymization(data.enableAnonymization)
    } catch (error) {
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          groqApiKey: newApiKey || undefined,
          groqModel,
          ollamaUrl,
          ollamaModel,
          enableAnonymization
        })
      })
      
      if (!res.ok) throw new Error('Falha ao salvar')
      
      toast.success('Configurações salvas com sucesso')
      setNewApiKey('')
      loadSettings()
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Responda apenas com "OK, sistema de IA funcionando corretamente!"'
        })
      })
      
      const data = await res.json()
      setTestResult(data)
      
      if (data.success) {
        toast.success('Teste de IA realizado com sucesso!')
      } else {
        toast.error(`Erro no teste: ${data.error}`)
      }
    } catch (error) {
      setTestResult({ success: false, error: 'Erro de conexão' })
      toast.error('Erro ao testar IA')
    } finally {
      setTesting(false)
    }
  }

  const handleTestAnonymization = async () => {
    setTestingAnonymization(true)
    setAnonymizationResult(null)
    try {
      const res = await fetch('/api/admin/ai-settings/test-anonymization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      })
      
      if (!res.ok) throw new Error('Falha no teste')
      
      const data = await res.json()
      setAnonymizationResult(data)
      toast.success('Teste de anonimização realizado')
    } catch (error) {
      toast.error('Erro ao testar anonimização')
    } finally {
      setTestingAnonymization(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de IA</h1>
          <p className="text-muted-foreground mt-1">
            Configure provedores de inteligência artificial e proteção de dados LGPD
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="provider" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="provider" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Provedor
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            LGPD
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Provedor de IA */}
        <TabsContent value="provider" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Provedor de IA
              </CardTitle>
              <CardDescription>
                Escolha entre IA local (Ollama) ou cloud (Groq, OpenAI)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Provedor Ativo</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Ollama (Local) - Privacidade Total
                      </div>
                    </SelectItem>
                    <SelectItem value="groq">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Groq (Cloud) - Ultra Rápido
                      </div>
                    </SelectItem>
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        OpenAI (Cloud) - GPT-4
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {provider === 'ollama' && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Máxima Privacidade</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Todos os dados são processados localmente. Nenhuma informação sai do servidor.
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>URL do Ollama</Label>
                      <Input 
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://ollama:11434"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Select value={ollamaModel} onValueChange={setOllamaModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings?.availableModels.ollama.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {provider === 'groq' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Cloud className="h-5 w-5" />
                    <span className="font-medium">Alta Performance</span>
                    {enableAnonymization && (
                      <Badge variant="secondary" className="ml-2">
                        <Shield className="h-3 w-3 mr-1" />
                        LGPD Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Processamento ultra-rápido com inferência em LPU. 
                    {enableAnonymization 
                      ? ' Dados sensíveis são anonimizados antes do envio.'
                      : ' ⚠️ Ative a anonimização LGPD para proteger dados sensíveis.'}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>API Key do Groq</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type={showApiKey ? 'text' : 'password'}
                            value={newApiKey || settings?.groqApiKey || ''}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder={settings?.hasGroqKey ? '••••••••••••••••' : 'gsk_...'}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {settings?.hasGroqKey && (
                        <p className="text-xs text-muted-foreground">
                          ✓ API Key configurada. Deixe em branco para manter a atual.
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Select value={groqModel} onValueChange={setGroqModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings?.availableModels.groq.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {provider === 'openai' && (
                <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Cloud className="h-5 w-5" />
                    <span className="font-medium">OpenAI GPT-4</span>
                    {enableAnonymization && (
                      <Badge variant="secondary" className="ml-2">
                        <Shield className="h-3 w-3 mr-1" />
                        LGPD Ativo
                      </Badge>
                    )}
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuração via .env</AlertTitle>
                    <AlertDescription>
                      Configure OPENAI_API_KEY no arquivo .env do servidor.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: LGPD */}
        <TabsContent value="lgpd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Proteção de Dados - LGPD
              </CardTitle>
              <CardDescription>
                Anonimização automática de dados sensíveis antes de enviar para provedores cloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Anonimização Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Substitui dados sensíveis por placeholders antes de enviar para IA cloud
                  </p>
                </div>
                <Switch 
                  checked={enableAnonymization}
                  onCheckedChange={setEnableAnonymization}
                />
              </div>

              {enableAnonymization && (
                <div className="space-y-4">
                  <h4 className="font-medium">Dados Protegidos:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'CPF', 'RG', 'CNS', 'CRM',
                      'Telefone', 'E-mail', 'Endereço', 'CEP',
                      'Data de Nascimento', 'Nomes', 'Prontuários', 'Receitas'
                    ].map(item => (
                      <Badge key={item} variant="outline" className="justify-center py-1">
                        {item}
                      </Badge>
                    ))}
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Como funciona?</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>1. Antes de enviar dados para IA cloud, o sistema detecta informações sensíveis</p>
                      <p>2. Substitui por placeholders (ex: CPF → [CPF_1], Nome → [NOME_1])</p>
                      <p>3. A IA processa o texto anonimizado</p>
                      <p>4. Na resposta, os placeholders são revertidos para os dados originais</p>
                    </AlertDescription>
                  </Alert>

                  {provider === 'ollama' && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700 dark:text-green-300">
                        Ollama: Privacidade Total
                      </AlertTitle>
                      <AlertDescription className="text-green-600 dark:text-green-400">
                        Com Ollama, todos os dados são processados localmente no seu servidor. 
                        A anonimização não é necessária, mas está disponível por precaução.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Testes */}
        <TabsContent value="test" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Teste de Conexão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Teste de Conexão
                </CardTitle>
                <CardDescription>
                  Verifica se a IA está respondendo corretamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleTest} 
                  disabled={testing}
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {testResult.success ? 'Conexão OK' : 'Erro'}
                    </AlertTitle>
                    <AlertDescription className="space-y-1">
                      {testResult.success ? (
                        <>
                          <p><strong>Provedor:</strong> {testResult.provider}</p>
                          <p><strong>Modelo:</strong> {testResult.model}</p>
                          <p><strong>Tempo:</strong> {testResult.responseTime}ms</p>
                          <p><strong>Anonimização:</strong> {testResult.anonymizationEnabled ? 'Ativa' : 'Inativa'}</p>
                          <p className="mt-2 p-2 bg-muted rounded text-sm">
                            {testResult.response}
                          </p>
                        </>
                      ) : (
                        <p>{testResult.error}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Teste de Anonimização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Teste de Anonimização
                </CardTitle>
                <CardDescription>
                  Visualize como os dados são protegidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto de Teste</Label>
                  <Textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={4}
                    placeholder="Digite texto com dados sensíveis..."
                  />
                </div>

                <Button 
                  onClick={handleTestAnonymization} 
                  disabled={testingAnonymization || !testText}
                  variant="outline"
                  className="w-full"
                >
                  {testingAnonymization ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Testar Anonimização
                    </>
                  )}
                </Button>

                {anonymizationResult && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tipos Detectados:</Label>
                      <div className="flex flex-wrap gap-1">
                        {anonymizationResult.detectedTypes.map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Texto Anonimizado:</Label>
                      <div className="p-2 bg-muted rounded text-sm font-mono whitespace-pre-wrap">
                        {anonymizationResult.anonymized}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mapa de Substituições:</Label>
                      <div className="p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-auto">
                        {Object.entries(anonymizationResult.replacements).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-blue-600">{k}</span>
                            <span>→ {v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
