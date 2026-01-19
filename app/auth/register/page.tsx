'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, HeartPulse, Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export default function RegisterPatientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Dados obrigatórios
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')

  // Dados opcionais
  const [showOptional, setShowOptional] = useState(false)
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')
  
  const [allergiesInput, setAllergiesInput] = useState('')
  const [bloodType, setBloodType] = useState('')

  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
  }

  const formatZipCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`
    }
    return digits
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFieldErrors({})

    // Validações básicas
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (!acceptedTerms) {
      setError('Você deve aceitar os termos de uso')
      setLoading(false)
      return
    }

    try {
      const allergies = allergiesInput
        .split(',')
        .map(a => a.trim())
        .filter(Boolean)

      const payload: any = {
        email: email.trim(),
        password,
        name: name.trim(),
        cpf: cpf.replace(/\D/g, ''),
        birthDate,
        gender,
        phone: phone.replace(/\D/g, ''),
        acceptedTerms,
      }

      // Adicionar dados opcionais se preenchidos
      if (showOptional) {
        if (street || city) {
          payload.address = {
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: state.trim(),
            zipCode: zipCode.replace(/\D/g, ''),
          }
        }

        if (emergencyName && emergencyPhone) {
          payload.emergencyContact = {
            name: emergencyName.trim(),
            phone: emergencyPhone.replace(/\D/g, ''),
            relation: emergencyRelation.trim() || 'Não informado',
          }
        }

        if (allergies.length > 0) {
          payload.allergies = allergies
        }

        if (bloodType) {
          payload.bloodType = bloodType
        }
      }

      const response = await fetch('/api/auth/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setFieldErrors(data.details)
        }
        setError(data.error || 'Erro ao criar cadastro')
        return
      }

      setSuccess(true)
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push('/auth/signin?message=Cadastro realizado com sucesso! Faça login para continuar.')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Erro ao criar cadastro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Cadastro Realizado!</h2>
            <p className="text-muted-foreground">
              Seu cadastro foi criado com sucesso. Você será redirecionado para o login...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <HeartPulse className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Cadastro de Paciente</h1>
          <p className="text-muted-foreground mt-2">
            Crie sua conta para agendar consultas
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados de Acesso */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
              🔐 Dados de Acesso
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="seu@email.com"
              />
              {fieldErrors.email && (
                <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Mínimo 8 caracteres"
                />
                {fieldErrors.password && (
                  <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Digite a senha novamente"
                />
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
              👤 Dados Pessoais
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                placeholder="João Silva Santos"
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  required
                  disabled={loading}
                  placeholder="12345678900"
                  maxLength={11}
                />
                {fieldErrors.cpf && (
                  <p className="text-sm text-red-600">{fieldErrors.cpf[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  disabled={loading}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
                {fieldErrors.birthDate && (
                  <p className="text-sm text-red-600">{fieldErrors.birthDate[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero *</Label>
                <Select value={gender} onValueChange={setGender} disabled={loading} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.gender && (
                  <p className="text-sm text-red-600">{fieldErrors.gender[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                  disabled={loading}
                  placeholder="11999999999"
                  maxLength={11}
                />
                {fieldErrors.phone && (
                  <p className="text-sm text-red-600">{fieldErrors.phone[0]}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dados Opcionais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                📋 Informações Adicionais (Opcional)
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOptional(!showOptional)}
                disabled={loading}
              >
                {showOptional ? 'Ocultar' : 'Preencher'}
              </Button>
            </div>

            {showOptional && (
              <div className="space-y-4 pl-4 border-l-2">
                {/* Endereço */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                      disabled={loading}
                      placeholder="12345-678"
                      maxLength={9}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        disabled={loading}
                        placeholder="Rua das Flores"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        disabled={loading}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        disabled={loading}
                        placeholder="Apto 45"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        disabled={loading}
                        placeholder="Centro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={loading}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={loading}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Contato de Emergência */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Contato de Emergência</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Nome</Label>
                    <Input
                      id="emergencyName"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      disabled={loading}
                      placeholder="Maria Silva"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Telefone</Label>
                      <Input
                        id="emergencyPhone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(formatPhone(e.target.value))}
                        disabled={loading}
                        placeholder="11999999999"
                        maxLength={11}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelation">Relação</Label>
                      <Input
                        id="emergencyRelation"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        disabled={loading}
                        placeholder="Mãe, Esposa, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Médicas */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Informações Médicas</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bloodType">Tipo Sanguíneo</Label>
                      <Select value={bloodType} onValueChange={setBloodType} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allergies">Alergias</Label>
                      <Input
                        id="allergies"
                        value={allergiesInput}
                        onChange={(e) => setAllergiesInput(e.target.value)}
                        disabled={loading}
                        placeholder="Penicilina, Dipirona (separadas por vírgula)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Termos de Uso */}
          <div className="flex items-start space-x-2 pt-4">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              disabled={loading}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Eu aceito os{' '}
              <Link href="/termos-de-uso" className="text-blue-600 hover:underline" target="_blank">
                termos de uso
              </Link>{' '}
              e a{' '}
              <Link href="/politica-privacidade" className="text-blue-600 hover:underline" target="_blank">
                política de privacidade
              </Link>
            </label>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-4 pt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Fazer login
              </Link>
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}
