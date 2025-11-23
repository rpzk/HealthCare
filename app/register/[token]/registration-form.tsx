"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

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
}

export function RegistrationForm({ invite, terms }: RegistrationFormProps) {
  const router = useRouter()
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
    acceptedTerms: {} as Record<string, boolean>
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

  const handleSubmit = async () => {
    if (!validateStep2()) return

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
          acceptedTerms: Object.keys(formData.acceptedTerms).filter(key => formData.acceptedTerms[key])
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao realizar cadastro.')
      }

      // Success
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const prevStep = () => {
    setStep(1)
    setError('')
  }

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cadastro - Passo {step} de 2</span>
          <span className="text-sm font-normal text-gray-500">{invite.email}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                  <pre className="whitespace-pre-wrap font-sans">{term.content}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step === 2 ? (
          <Button variant="outline" onClick={prevStep} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        ) : (
          <div></div> // Spacer
        )}

        {step === 1 ? (
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
      </CardFooter>
    </Card>
  )
}
