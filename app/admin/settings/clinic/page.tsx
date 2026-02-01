'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { 
  Loader2, Save, Building2, Phone, Mail, MapPin, Clock, 
  Info, Globe, FileText
} from 'lucide-react'

interface ClinicSettings {
  clinic_name: string
  clinic_trade_name: string
  clinic_cnpj: string
  clinic_phone: string
  clinic_email: string
  clinic_address: string
  clinic_city: string
  clinic_state: string
  clinic_cep: string
  clinic_website: string
  clinic_opening_hours: string
  clinic_about: string
  clinic_cnes: string // Código CNES do estabelecimento
}

const DEFAULT_SETTINGS: ClinicSettings = {
  clinic_name: '',
  clinic_trade_name: '',
  clinic_cnpj: '',
  clinic_phone: '',
  clinic_email: '',
  clinic_address: '',
  clinic_city: '',
  clinic_state: '',
  clinic_cep: '',
  clinic_website: '',
  clinic_opening_hours: '',
  clinic_about: '',
  clinic_cnes: '',
}

export default function ClinicSettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const res = await fetch('/api/system/settings?category=CLINIC')
      const data = await res.json()
      
      if (data.success && data.settings) {
        const loaded: Partial<ClinicSettings> = {}
        for (const s of data.settings) {
          const key = s.key.toLowerCase() as keyof ClinicSettings
          loaded[key] = s.value
        }
        setSettings(prev => ({ ...prev, ...loaded }))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações da clínica')
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
      
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key: key.toUpperCase(),
        value: String(value || ''),
        category: 'CLINIC',
        encrypted: false,
        isPublic: !['clinic_cnpj', 'clinic_cnes'].includes(key),
        description: getSettingDescription(key),
      }))

      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Dados da clínica salvos!')
        setHasChanges(false)
      } else {
        toastApiError(data, 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      clinic_name: 'Razão social da clínica',
      clinic_trade_name: 'Nome fantasia (como aparece para pacientes)',
      clinic_cnpj: 'CNPJ da empresa',
      clinic_phone: 'Telefone principal',
      clinic_email: 'E-mail de contato',
      clinic_address: 'Endereço completo',
      clinic_cnes: 'Código CNES do estabelecimento',
    }
    return descriptions[key] || ''
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
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
            <Building2 className="h-8 w-8" />
            Dados da Clínica
          </h1>
          <p className="text-muted-foreground mt-1">
            Informações que aparecem em receitas, atestados e documentos
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
              Salvar
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Alterações não salvas</AlertTitle>
          <AlertDescription>
            Você tem alterações pendentes. Clique em &quot;Salvar&quot; para aplicar.
          </AlertDescription>
        </Alert>
      )}

      {/* Identificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Identificação
          </CardTitle>
          <CardDescription>
            Dados legais e de identificação da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clinic_name">Razão Social</Label>
              <Input
                id="clinic_name"
                value={settings.clinic_name}
                onChange={(e) => updateSetting('clinic_name', e.target.value)}
                placeholder="Ex: Clínica Saúde Total Ltda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_trade_name">Nome Fantasia</Label>
              <Input
                id="clinic_trade_name"
                value={settings.clinic_trade_name}
                onChange={(e) => updateSetting('clinic_trade_name', e.target.value)}
                placeholder="Ex: Clínica Saúde Total"
              />
              <p className="text-xs text-muted-foreground">
                Como o nome aparece para os pacientes
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clinic_cnpj">CNPJ</Label>
              <Input
                id="clinic_cnpj"
                value={settings.clinic_cnpj}
                onChange={(e) => updateSetting('clinic_cnpj', formatCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_cnes">Código CNES</Label>
              <Input
                id="clinic_cnes"
                value={settings.clinic_cnes}
                onChange={(e) => updateSetting('clinic_cnes', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="0000000"
                maxLength={7}
              />
              <p className="text-xs text-muted-foreground">
                Cadastro Nacional de Estabelecimentos de Saúde
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </CardTitle>
          <CardDescription>
            Como os pacientes podem entrar em contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clinic_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="clinic_phone"
                value={settings.clinic_phone}
                onChange={(e) => updateSetting('clinic_phone', formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="clinic_email"
                type="email"
                value={settings.clinic_email}
                onChange={(e) => updateSetting('clinic_email', e.target.value)}
                placeholder="contato@clinica.com.br"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic_website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="clinic_website"
              value={settings.clinic_website}
              onChange={(e) => updateSetting('clinic_website', e.target.value)}
              placeholder="https://www.clinica.com.br"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
          <CardDescription>
            Localização física do estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic_address">Endereço</Label>
            <Input
              id="clinic_address"
              value={settings.clinic_address}
              onChange={(e) => updateSetting('clinic_address', e.target.value)}
              placeholder="Av. Paulista, 1000, Sala 101"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="clinic_city">Cidade</Label>
              <Input
                id="clinic_city"
                value={settings.clinic_city}
                onChange={(e) => updateSetting('clinic_city', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_state">Estado</Label>
              <Input
                id="clinic_state"
                value={settings.clinic_state}
                onChange={(e) => updateSetting('clinic_state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_cep">CEP</Label>
              <Input
                id="clinic_cep"
                value={settings.clinic_cep}
                onChange={(e) => updateSetting('clinic_cep', formatCEP(e.target.value))}
                placeholder="01310-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Funcionamento
          </CardTitle>
          <CardDescription>
            Horários e informações adicionais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic_opening_hours">Horário de Atendimento</Label>
            <Input
              id="clinic_opening_hours"
              value={settings.clinic_opening_hours}
              onChange={(e) => updateSetting('clinic_opening_hours', e.target.value)}
              placeholder="Seg-Sex: 8h-18h | Sáb: 8h-12h"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic_about">Sobre a Clínica</Label>
            <Textarea
              id="clinic_about"
              value={settings.clinic_about}
              onChange={(e) => updateSetting('clinic_about', e.target.value)}
              placeholder="Descrição breve da clínica, especialidades, diferenciais..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Esta descrição pode aparecer em relatórios e documentos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
