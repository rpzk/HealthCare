'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Markdown } from '@/components/ui/markdown'
import { formatCPF, isValidCPF } from '@/lib/cpf-utils'
import {
  Shield,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from 'lucide-react'

interface BiometricConsent {
  id: string
  dataType: string
  purpose: string
  info: {
    label: string
    description: string
    icon: string
  }
}

interface InviteTerm {
  id: string
  slug: string
  title: string
  content: string
  version: string
  updatedAt: string
}

interface InviteData {
  invite: {
    id: string
    email: string
    patientName: string
    birthDate: string | null
    cpf: string | null
    allergies: string | null
    gender: string | null
    emergencyContact: string | null
    customMessage: string | null
    expiresAt: string
  }
  invitedBy: {
    name: string
    speciality: string | null
  }
  biometricConsents: BiometricConsent[]
  terms: InviteTerm[]
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const [token, setToken] = useState<string>('')
  const [data, setData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [cpf, setCpf] = useState('')
  const [allergies, setAllergies] = useState('')
  const [gender, setGender] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [acceptedConsents, setAcceptedConsents] = useState<string[]>([])
  const [acceptedTermIds, setAcceptedTermIds] = useState<string[]>([])
  const [showAllConsents, setShowAllConsents] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const inviteToken = params.token
    setToken(inviteToken)
    void loadInvite(inviteToken)
  }, [params.token])

  const loadInvite = async (inviteToken: string) => {
    try {
      const res = await fetch(`/api/patient-invites/${inviteToken}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Convite não encontrado')
        return
      }
      const json = await res.json()
      setData(json)
      setBirthDate(json?.invite?.birthDate ? String(json.invite.birthDate).slice(0, 10) : '')
      setCpf(json?.invite?.cpf ? String(json.invite.cpf) : '')
      setAllergies(json?.invite?.allergies ? String(json.invite.allergies) : '')
      setGender(json?.invite?.gender ? String(json.invite.gender) : '')
      setEmergencyContact(json?.invite?.emergencyContact ? String(json.invite.emergencyContact) : '')
      // Selecionar todos por padrão
      setAcceptedConsents(json.biometricConsents.map((c: BiometricConsent) => c.dataType))
      setAcceptedTermIds([])
    } catch (e) {
      setError('Erro ao carregar convite')
    } finally {
      setLoading(false)
    }
  }

  const toggleTerm = (termId: string) => {
    setAcceptedTermIds((prev) => (prev.includes(termId) ? prev.filter((t) => t !== termId) : [...prev, termId]))
  }

  const toggleConsent = (dataType: string) => {
    setAcceptedConsents(prev => 
      prev.includes(dataType)
        ? prev.filter(t => t !== dataType)
        : [...prev, dataType]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive'
      })
      return
    }

    // Validar CPF se fornecido
    if (cpf && !isValidCPF(cpf)) {
      toast({
        title: 'Erro',
        description: 'CPF inválido',
        variant: 'destructive'
      })
      return
    }

    const requiredTerms = Array.isArray(data?.terms) ? data.terms : []
    const hasAllTerms = requiredTerms.every((t) => acceptedTermIds.includes(t.id))
    if (requiredTerms.length > 0 && !hasAllTerms) {
      toast({
        title: 'Erro',
        description: 'Você precisa aceitar todos os termos para continuar',
        variant: 'destructive'
      })
      return
    }

    const effectiveBirthDate = birthDate || data?.invite?.birthDate
    if (!effectiveBirthDate) {
      toast({
        title: 'Erro',
        description: 'Informe sua data de nascimento para continuar',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/patient-invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedConsents,
          acceptedTermIds,
          password,
          phone,
          birthDate: effectiveBirthDate,
          cpf,
          allergies,
          gender,
          emergencyContact
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao processar aceite')
      }

      toast({
        title: 'Cadastro realizado!',
        description: 'Sua conta foi criada com sucesso. Você será redirecionado para o login.',
      })

      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar aceite',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Carregando convite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Convite Inválido</h2>
            <p className="text-gray-600">{error}</p>
            <Button className="mt-6" onClick={() => router.push('/')}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const displayedConsents = showAllConsents 
    ? data.biometricConsents 
    : data.biometricConsents.slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Heart className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            Bem-vindo(a), {data.invite.patientName}!
          </h1>
          <p className="text-gray-600 mt-2">
            {data.invitedBy.name}
            {data.invitedBy.speciality && ` (${data.invitedBy.speciality})`}
            {' '}convidou você para se cadastrar no sistema de saúde.
          </p>
        </div>

        {/* Mensagem personalizada */}
        {data.invite.customMessage && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-blue-800 italic">"{data.invite.customMessage}"</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          {/* Dados pessoais mínimos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Dados para Cadastro
              </CardTitle>
              <CardDescription>
                Confirme seus dados para concluir o cadastro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento <span className="text-red-500">*</span></Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados de Saúde & Segurança */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Informações de Saúde & Segurança
              </CardTitle>
              <CardDescription>
                Dados essenciais para seu acompanhamento médico seguro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo Sanguíneo */}
              <div className="space-y-2">
                <Label htmlFor="bloodType">
                  Tipo Sanguíneo
                </Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger id="bloodType">
                    <SelectValue placeholder="Selecione seu tipo sanguíneo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não informado</SelectItem>
                    <SelectItem value="A_POSITIVE">A+</SelectItem>
                    <SelectItem value="A_NEGATIVE">A-</SelectItem>
                    <SelectItem value="B_POSITIVE">B+</SelectItem>
                    <SelectItem value="B_NEGATIVE">B-</SelectItem>
                    <SelectItem value="AB_POSITIVE">AB+</SelectItem>
                    <SelectItem value="AB_NEGATIVE">AB-</SelectItem>
                    <SelectItem value="O_POSITIVE">O+</SelectItem>
                    <SelectItem value="O_NEGATIVE">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gênero */}
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gênero <span className="text-red-500">*</span>
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Alergias */}
              <div className="space-y-2">
                <Label htmlFor="allergies">
                  Alergias <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="allergies"
                  placeholder="Ex: Penicilina, Amendoim, Látex (separe com vírgulas)"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-amber-600">
                  ⚠️ Importante: informar todas as alergias conhecidas para sua segurança.
                </p>
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf">
                  CPF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  maxLength={14}
                />
                {cpf && !isValidCPF(cpf) && (
                  <p className="text-xs text-red-500">CPF inválido</p>
                )}
              </div>

              {/* Contato de Emergência */}
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">
                  Contato de Emergência
                </Label>
                <Input
                  id="emergencyContact"
                  placeholder="Nome e telefone (Ex: Maria Silva - 11 99999-8888)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Pessoa a contactar em caso de emergência médica.
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Card de Dados Biométricos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Compartilhamento de Dados de Saúde
              </CardTitle>
              <CardDescription>
                Selecione quais dados dos seus dispositivos (smartwatch, balança, etc.) 
                você autoriza compartilhar com a clínica para melhor acompanhamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayedConsents.map(consent => (
                  <div
                    key={consent.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      acceptedConsents.includes(consent.dataType)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => toggleConsent(consent.dataType)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={acceptedConsents.includes(consent.dataType)}
                        onCheckedChange={() => toggleConsent(consent.dataType)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{consent.info.icon}</span>
                          <span className="font-medium">{consent.info.label}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {consent.info.description}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Finalidade:</strong> {consent.purpose}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {data.biometricConsents.length > 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowAllConsents(!showAllConsents)}
                  >
                    {showAllConsents ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Mostrar mais ({data.biometricConsents.length - 5} tipos)
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAcceptedConsents(data.biometricConsents.map(c => c.dataType))}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAcceptedConsents([])}
                >
                  Desmarcar Todos
                </Button>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>Importante:</strong> Você pode alterar essas permissões a qualquer 
                    momento nas configurações da sua conta. Os dados só serão compartilhados 
                    após você instalar o aplicativo e sincronizar seus dispositivos.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Criação de Conta */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Criar Sua Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={data.invite.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label>Telefone (opcional)</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label>Criar Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>Confirmar Senha *</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Card de Termos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Termos e Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.isArray(data.terms) && data.terms.length > 0 ? (
                <div className="space-y-4">
                  {data.terms.map((term) => (
                    <div key={term.id} className="border rounded-md p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={term.id}
                          checked={acceptedTermIds.includes(term.id)}
                          onCheckedChange={() => toggleTerm(term.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor={term.id} className="cursor-pointer">
                            Li e aceito {term.title} <span className="text-muted-foreground">(v{term.version})</span> *
                          </Label>
                          <p className="text-xs text-muted-foreground font-mono">{term.slug}</p>
                        </div>
                      </div>
                      <div className="h-32 overflow-y-auto text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                        <pre className="whitespace-pre-wrap font-sans">{term.content}</pre>
                      </div>
                    </div>
                  ))}

                  <div className="text-sm text-muted-foreground">
                    Você pode consultar também em{' '}
                    <a href="/terms" target="_blank" className="text-blue-600 underline">/terms</a> e{' '}
                    <a href="/privacy" target="_blank" className="text-blue-600 underline">/privacy</a>.
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum termo ativo configurado.</p>
              )}

              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>🔒 Seus dados estão protegidos</strong>
                <p className="mt-1">
                  Seguimos a Lei Geral de Proteção de Dados (LGPD). Seus dados de saúde são 
                  criptografados e nunca serão compartilhados com terceiros sem sua autorização.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">Resumo do seu consentimento:</h3>
              <div className="flex flex-wrap gap-2">
                {acceptedConsents.length > 0 ? (
                  acceptedConsents.map(dt => {
                    const consent = data.biometricConsents.find(c => c.dataType === dt)
                    return (
                      <Badge key={dt} variant="secondary" className="bg-green-100 text-green-800">
                        {consent?.info.icon} {consent?.info.label}
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-gray-500">Nenhum dado selecionado</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botão de Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Aceitar e Criar Conta
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Ao clicar em "Aceitar e Criar Conta", você concorda em compartilhar os dados 
            selecionados com a clínica para fins de acompanhamento médico.
          </p>
        </form>
      </div>
    </div>
  )
}
