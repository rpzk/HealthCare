"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Markdown } from '@/components/ui/markdown'
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, Fingerprint, Camera, Mic, Activity, Shield } from 'lucide-react'

interface Term {
  id: string
  slug: string
  title: string
  content: string
  version: string
}

interface Invite {
  id: string
  email: string
  role: string
  token: string
}

interface RegistrationFormProps {
  invite: Invite
  terms: Term[]
  isPatient: boolean
}

// Tipos de consentimento biométrico
const BIOMETRIC_CONSENT_TYPES = [
  {
    type: 'FACIAL_RECOGNITION',
    icon: Camera,
    title: 'Reconhecimento Facial',
    description: 'Usado para verificação de identidade segura durante check-in e acesso a informações sensíveis.',
    benefits: ['Check-in automático', 'Acesso seguro ao prontuário', 'Prevenção de fraudes']
  },
  {
    type: 'FINGERPRINT',
    icon: Fingerprint,
    title: 'Impressão Digital',
    description: 'Autenticação rápida e segura via dispositivos com leitor biométrico.',
    benefits: ['Login instantâneo', 'Confirmação de presença', 'Assinatura de documentos']
  },
  {
    type: 'VOICE_RECOGNITION',
    icon: Mic,
    title: 'Reconhecimento de Voz',
    description: 'Identificação por padrões vocais para interações por telefone ou assistentes.',
    benefits: ['Atendimento telefônico', 'Comandos de voz', 'Acessibilidade']
  },
  {
    type: 'VITAL_SIGNS',
    icon: Activity,
    title: 'Sinais Vitais',
    description: 'Coleta automática de dados de dispositivos vestíveis (smartwatch, etc).',
    benefits: ['Monitoramento contínuo', 'Alertas de emergência', 'Histórico de saúde']
  }
]

export function RegistrationForm({ invite, terms, isPatient }: RegistrationFormProps) {
  const router = useRouter()
  const totalSteps = isPatient ? 3 : 2
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    birthDate: '',
    gender: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: {} as Record<string, boolean>,
    biometricConsents: {
      FACIAL_RECOGNITION: false,
      FINGERPRINT: false,
      VOICE_RECOGNITION: false,
      VITAL_SIGNS: false
    } as Record<string, boolean>
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleTermChange = (termId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      acceptedTerms: {
        ...prev.acceptedTerms,
        [termId]: checked
      }
    }))
  }

  const handleBiometricChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      biometricConsents: {
        ...prev.biometricConsents,
        [type]: checked
      }
    }))
  }

  const validateStep1 = () => {
    if (!formData.name || !formData.cpf || !formData.password || !formData.birthDate || !formData.gender) {
      setError('Preencha todos os campos obrigatórios.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.')
      return false
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return false
    }
    setError('')
    return true
  }

  const validateStep2 = () => {
    const allAccepted = terms.every(term => formData.acceptedTerms[term.id])
    if (!allAccepted) {
      setError('Você deve aceitar todos os termos para continuar.')
      return false
    }
    setError('')
    return true
  }

  // Step 3 (biometric) is optional - no validation needed, just informational
  const validateStep3 = () => {
    setError('')
    return true
  }

  const handleSubmit = async () => {
    // Validate current step
    if (isPatient && step === 3 && !validateStep3()) return
    if (!isPatient && step === 2 && !validateStep2()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invite.token,
          name: formData.name,
          cpf: formData.cpf,
          phone: formData.phone,
          birthDate: formData.birthDate,
          gender: formData.gender,
          password: formData.password,
          acceptedTerms: Object.keys(formData.acceptedTerms).filter(key => formData.acceptedTerms[key]),
          biometricConsents: isPatient ? formData.biometricConsents : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao realizar cadastro.')
      }

      // Success
      router.push('/auth/signin?registered=true')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar cadastro.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      if (isPatient) {
        setStep(3)
      }
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

  const isLastStep = step === totalSteps

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cadastro - Passo {step} de {totalSteps}</span>
          <span className="text-sm font-normal text-gray-500">{invite.email}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input 
                  id="cpf" 
                  name="cpf" 
                  value={formData.cpf} 
                  onChange={handleChange} 
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input 
                  id="birthDate" 
                  name="birthDate" 
                  type="date"
                  value={formData.birthDate} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero *</Label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="MALE">Masculino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Por favor, leia e aceite os termos abaixo para continuar.
            </p>
            
            {terms.map(term => (
              <div key={term.id} className="border rounded-md p-4 space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id={term.id} 
                    checked={formData.acceptedTerms[term.id] || false}
                    onCheckedChange={(checked) => handleTermChange(term.id, checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor={term.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Li e aceito os {term.title}
                    </Label>
                  </div>
                </div>
                <div className="h-32 overflow-y-auto text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                  <Markdown content={term.content} className="text-xs" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Biometric Consents (only for patients) */}
        {step === 3 && isPatient && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Consentimentos Biométricos</h3>
                <p className="text-sm text-blue-700">
                  Estes são <strong>opcionais</strong>. Você pode alterá-los depois em Configurações → Privacidade.
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              Para melhorar sua experiência e segurança, você pode autorizar o uso de dados biométricos. 
              Aplicamos controles de acesso e recursos de privacidade. A criptografia de dados sensíveis depende da configuração do sistema.
            </p>

            <div className="space-y-4">
              {BIOMETRIC_CONSENT_TYPES.map(consent => {
                const Icon = consent.icon
                const isEnabled = formData.biometricConsents[consent.type]
                
                return (
                  <div 
                    key={consent.type}
                    className={`border rounded-lg p-4 transition-colors ${
                      isEnabled ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Icon className={`h-5 w-5 ${isEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{consent.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{consent.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {consent.benefits.map(benefit => (
                              <span 
                                key={benefit}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleBiometricChange(consent.type, checked)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
              <strong>Nota:</strong> Você pode pular esta etapa sem ativar nenhum consentimento. 
              Essas autorizações podem ser gerenciadas a qualquer momento nas configurações de privacidade.
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {/* Mensagem de erro visível próxima aos botões (melhor UX em mobile) */}
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription className="text-center">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between w-full">
          {step > 1 ? (
            <Button variant="outline" onClick={prevStep} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          ) : (
            <div></div> // Spacer
          )}

          {!isLastStep ? (
            <Button onClick={nextStep}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                </>
              ) : (
                <>
                  Finalizar Cadastro <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
