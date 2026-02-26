'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, Save, Image, Building2, MapPin, Phone } from 'lucide-react'

interface BrandingData {
  clinicName: string
  clinicPhone: string
  clinicAddress: string
  clinicCity: string
  clinicState: string
  clinicZipCode: string
  footerText: string
  logoUrl?: string
  headerUrl?: string
}

const DEFAULT: BrandingData = {
  clinicName: '',
  clinicPhone: '',
  clinicAddress: '',
  clinicCity: '',
  clinicState: '',
  clinicZipCode: '',
  footerText: '',
}

export default function BrandingAdminPage() {
  const [data, setData] = useState<BrandingData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/branding')
      .then((r) => r.json())
      .then((b) => {
        if (b && typeof b === 'object') {
          setData({
            clinicName: b.clinicName ?? '',
            clinicPhone: b.clinicPhone ?? '',
            clinicAddress: b.clinicAddress ?? '',
            clinicCity: b.clinicCity ?? '',
            clinicState: b.clinicState ?? '',
            clinicZipCode: b.clinicZipCode ?? '',
            footerText: b.footerText ?? '',
            logoUrl: b.logoUrl,
            headerUrl: b.headerUrl,
          })
        }
      })
      .catch(() => toast.error('Erro ao carregar branding'))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('clinicName', data.clinicName)
      formData.set('footerText', data.footerText)
      formData.set('clinicPhone', data.clinicPhone)
      formData.set('clinicAddress', data.clinicAddress)
      formData.set('clinicCity', data.clinicCity)
      formData.set('clinicState', data.clinicState)
      formData.set('clinicZipCode', data.clinicZipCode)
      const logoFile = formData.get('logo') as File | null
      const headerFile = formData.get('headerImage') as File | null
      if (data.logoUrl && (!logoFile?.size)) formData.set('keepLogo', data.logoUrl)
      if (data.headerUrl && (!headerFile?.size)) formData.set('keepHeader', data.headerUrl)

      const res = await fetch('/api/branding', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result?.error || 'Erro ao salvar')
        return
      }
      setData((prev) => ({
        ...prev,
        clinicName: result.clinicName ?? prev.clinicName,
        footerText: result.footerText ?? prev.footerText,
        clinicPhone: result.clinicPhone ?? prev.clinicPhone,
        clinicAddress: result.clinicAddress ?? prev.clinicAddress,
        clinicCity: result.clinicCity ?? prev.clinicCity,
        clinicState: result.clinicState ?? prev.clinicState,
        clinicZipCode: result.clinicZipCode ?? prev.clinicZipCode,
        logoUrl: result.logoUrl ?? prev.logoUrl,
        headerUrl: result.headerUrl ?? prev.headerUrl,
      }))
      toast.success('Identidade visual e dados salvos!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof BrandingData>(key: K, value: BrandingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Image className="h-8 w-8" />
          Identidade Visual e Dados da Clínica
        </h1>
        <p className="text-muted-foreground mt-1">
          Logo, endereço e informações que aparecem em prescrições, atestados e demais documentos impressos
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Marca e Logo</CardTitle>
            <CardDescription>
              Nome e imagens exibidos no cabeçalho dos documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                name="clinicName"
                value={data.clinicName}
                onChange={(e) => update('clinicName', e.target.value)}
                placeholder="Ex: Clínica Saúde Integral"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Logo</Label>
                <Input name="logo" type="file" accept="image/*" />
                {data.logoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={data.logoUrl} alt="Logo atual" className="h-16 object-contain border rounded" />
                    <span className="text-sm text-muted-foreground">Logo atual (deixe em branco para manter)</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Imagem de Cabeçalho</Label>
                <Input name="headerImage" type="file" accept="image/*" />
                {data.headerUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={data.headerUrl} alt="Cabeçalho atual" className="h-16 object-cover border rounded w-32" />
                    <span className="text-sm text-muted-foreground">Deixe em branco para manter</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerText">Rodapé dos PDFs</Label>
              <Textarea
                id="footerText"
                name="footerText"
                value={data.footerText}
                onChange={(e) => update('footerText', e.target.value)}
                placeholder="Texto exibido no rodapé dos documentos (opcional)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Endereço e Contato
            </CardTitle>
            <CardDescription>
              Dados obrigatórios em documentos médicos (CFM). Exibidos em prescrições, atestados etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Endereço completo</Label>
              <Input
                id="clinicAddress"
                name="clinicAddress"
                value={data.clinicAddress}
                onChange={(e) => update('clinicAddress', e.target.value)}
                placeholder="Rua, número, complemento, bairro"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicCity">Cidade</Label>
                <Input
                  id="clinicCity"
                  name="clinicCity"
                  value={data.clinicCity}
                  onChange={(e) => update('clinicCity', e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicState">UF</Label>
                <Input
                  id="clinicState"
                  name="clinicState"
                  value={data.clinicState}
                  onChange={(e) => update('clinicState', e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicZipCode">CEP</Label>
                <Input
                  id="clinicZipCode"
                  name="clinicZipCode"
                  value={data.clinicZipCode}
                  onChange={(e) => update('clinicZipCode', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicPhone">Telefone</Label>
              <Input
                id="clinicPhone"
                name="clinicPhone"
                value={data.clinicPhone}
                onChange={(e) => update('clinicPhone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </CardContent>
        </Card>

        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Para CNPJ, razão social e dados jurídicos adicionais, use{' '}
            <a href="/admin/settings/clinic" className="underline font-medium">
              Configurações &gt; Dados da Clínica
            </a>
            . Os documentos usam ambas as fontes, priorizando Branding para logo e endereço quando preenchidos.
          </AlertDescription>
        </Alert>

        <Button type="submit" disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar identidade visual
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
