'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Heart, 
  Activity, 
  Droplets, 
  Weight, 
  Moon, 
  Footprints, 
  Thermometer, 
  UserPlus,
  Shield,
  CheckCircle,
  Loader2,
  Info,
  ArrowLeft,
  Stethoscope
} from 'lucide-react'
import Link from 'next/link'

// Tipos de dados biométricos
const biometricTypes = [
  { type: 'HEART_RATE', label: 'Frequência Cardíaca', icon: Heart, color: 'text-red-500' },
  { type: 'BLOOD_PRESSURE', label: 'Pressão Arterial', icon: Activity, color: 'text-blue-500' },
  { type: 'BLOOD_GLUCOSE', label: 'Glicemia', icon: Droplets, color: 'text-purple-500' },
  { type: 'SPO2', label: 'Saturação O₂', icon: Activity, color: 'text-cyan-500' },
  { type: 'WEIGHT', label: 'Peso', icon: Weight, color: 'text-amber-500' },
  { type: 'SLEEP', label: 'Sono', icon: Moon, color: 'text-indigo-500' },
  { type: 'ACTIVITY', label: 'Atividade', icon: Footprints, color: 'text-green-500' },
  { type: 'TEMPERATURE', label: 'Temperatura', icon: Thermometer, color: 'text-orange-500' },
]

export default function BecomePatientPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isAlreadyPatient, setIsAlreadyPatient] = useState(false)
  
  // Form state
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [selectedConsents, setSelectedConsents] = useState<string[]>([])
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated') {
      checkPatientStatus()
    }
  }, [status, router])

  const checkPatientStatus = async () => {
    try {
      const response = await fetch('/api/users/become-patient')
      if (response.ok) {
        const data = await response.json()
        if (data.isPatient) {
          setIsAlreadyPatient(true)
        }
      }
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleConsent = (type: string) => {
    setSelectedConsents(prev => 
      prev.includes(type) 
        ? prev.filter(p => p !== type)
        : [...prev, type]
    )
  }

  const handleSelectAll = () => {
    setSelectedConsents(biometricTypes.map(b => b.type))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!birthDate || !gender) {
      toast({ title: 'Preencha data de nascimento e gênero', variant: 'destructive' })
      return
    }

    if (!acceptTerms) {
      toast({ title: 'Você precisa aceitar os termos', variant: 'destructive' })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/users/become-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          gender,
          phone,
          cpf: cpf || undefined,
          address: address || undefined,
          emergencyContact: emergencyContact || undefined,
          allergies: allergies || undefined,
          medicalHistory: medicalHistory || undefined,
          currentMedications: currentMedications || undefined,
          biometricConsents: selectedConsents
        })
      })

      if (response.ok) {
        toast({ title: 'Perfil de paciente ativado com sucesso!' })
        router.push('/settings/privacy')
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Erro ao ativar perfil', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao ativar perfil', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Já é paciente
  if (isAlreadyPatient) {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-700 dark:text-green-300">
              Você já é paciente!
            </CardTitle>
            <CardDescription>
              Seu perfil de paciente já está ativo. Você pode gerenciar suas permissões de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/settings/privacy">
                <Shield className="h-4 w-4 mr-2" />
                Gerenciar Permissões
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/devices">
                <Activity className="h-4 w-4 mr-2" />
                Meus Dispositivos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Ativar Perfil de Paciente
          </h1>
          <p className="text-muted-foreground">
            Como <strong>{session?.user?.name}</strong>, você pode também ser atendido como paciente
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Duplo Papel</AlertTitle>
        <AlertDescription>
          Você continuará com acesso de <Badge variant="outline">{session?.user?.role}</Badge> e 
          também poderá ser atendido como paciente, registrar sinais vitais e compartilhar dados 
          biométricos com outros profissionais.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Básicos</CardTitle>
            <CardDescription>
              Informações necessárias para seu prontuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero *</Label>
                <Select value={gender} onValueChange={setGender} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF (opcional)</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                placeholder="Rua, número, bairro, cidade"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Contato de Emergência</Label>
              <Input
                id="emergencyContact"
                placeholder="Nome e telefone"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Histórico Médico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Histórico Médico
            </CardTitle>
            <CardDescription>
              Informações para melhor atendimento (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                placeholder="Liste suas alergias conhecidas..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Histórico Médico</Label>
              <Textarea
                id="medicalHistory"
                placeholder="Doenças crônicas, cirurgias anteriores..."
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentMedications">Medicamentos em Uso</Label>
              <Textarea
                id="currentMedications"
                placeholder="Liste os medicamentos que você toma atualmente..."
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Consentimentos Biométricos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Dados Biométricos
                </CardTitle>
                <CardDescription>
                  Escolha quais dados você quer poder registrar e compartilhar
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                Selecionar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {biometricTypes.map((item) => {
                const Icon = item.icon
                const isSelected = selectedConsents.includes(item.type)
                
                return (
                  <div
                    key={item.type}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => handleToggleConsent(item.type)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleToggleConsent(item.type)}
                    />
                    <div className={`p-1.5 rounded ${item.color} bg-muted`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Termos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Declaro que li e aceito os <Link href="/terms" className="text-primary underline">Termos de Uso</Link> e 
                a <Link href="/privacy" className="text-primary underline">Política de Privacidade</Link>. 
                Autorizo o tratamento dos meus dados pessoais e de saúde conforme a LGPD (Lei 13.709/2018), 
                podendo revogar este consentimento a qualquer momento em Configurações → Privacidade.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Ativar Perfil de Paciente
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/profile">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
