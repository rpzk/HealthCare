'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, Copy, HelpCircle } from 'lucide-react'
import { TEMPLATE_VARIABLES } from '@/lib/document-templates/variables'

interface TemplateVariable {
  name: string
  description: string
  example: string
  category: string
}

interface TemplateEditorProps {
  template?: any
  onSave: (data: any) => Promise<void>
  loading?: boolean
}

export function TemplateEditor({ template, onSave, loading }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    documentType: template?.documentType || 'prescription',
    description: template?.description || '',
    htmlTemplate: template?.htmlTemplate || '',
    cssTemplate: template?.cssTemplate || '',
    signaturePosition: template?.signaturePosition || 'bottom-center',
    signatureSize: template?.signatureSize || 'medium',
    qrcodePosition: template?.qrcodePosition || 'bottom-right',
    qrcodeSize: template?.qrcodeSize || '1cm',
    showQrcode: template?.showQrcode ?? true,
    clinicName: template?.clinicName ?? true,
    clinicLogo: template?.clinicLogo ?? true,
    clinicAddress: template?.clinicAddress ?? true,
    clinicPhone: template?.clinicPhone ?? true,
    doctorName: template?.doctorName ?? true,
    doctorSpec: template?.doctorSpec ?? true,
    doctorCRM: template?.doctorCRM ?? true,
    doctorAddress: template?.doctorAddress ?? false,
    doctorLogo: template?.doctorLogo ?? false,
    showFooter: template?.showFooter ?? true,
    footerText: template?.footerText || '',
    isActive: template?.isActive ?? true,
    isDefault: template?.isDefault ?? false,
  })

  const [htmlPreview, setHtmlPreview] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('clinic')
  const [saving, setSaving] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleToggle = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name as keyof typeof prev],
    }))
  }

  const handleInsertVariable = (variable: string) => {
    const textarea = document.getElementById(
      'htmlTemplate'
    ) as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = textarea.value.substring(0, start)
      const after = textarea.value.substring(end)
      const newValue = `${before}{{${variable}}}${after}`

      setFormData((prev) => ({
        ...prev,
        htmlTemplate: newValue,
      }))

      // Restaurar cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4
        textarea.focus()
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.htmlTemplate.trim()) {
      toast.error('Template HTML é obrigatório')
      return
    }

    try {
      setSaving(true)
      await onSave(formData)
      toast.success('Template salvo com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar template')
    } finally {
      setSaving(false)
    }
  }

  const categoriesAvailable = Array.from(
    new Set(TEMPLATE_VARIABLES.map((v) => v.category))
  )
  const variablesInCategory = TEMPLATE_VARIABLES.filter(
    (v) => v.category === selectedCategory
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Dados gerais do template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Prescrição Padrão"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <select
                id="documentType"
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="prescription">Prescrição</option>
                <option value="certificate">Atestado/Certificado</option>
                <option value="attestation">Atestado Médico</option>
                <option value="referral">Encaminhamento</option>
                <option value="report">Relatório</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva o template..."
              rows={2}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={() => handleToggle('isActive')}
              />
              <span className="text-sm">Ativo</span>
            </label>

            <label className="flex items-center gap-2">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={() => handleToggle('isDefault')}
              />
              <span className="text-sm">Template Padrão</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Editor HTML e CSS */}
      <Card>
        <CardHeader>
          <CardTitle>Template HTML e CSS</CardTitle>
          <CardDescription>
            Use placeholders como {'{'}clinic.name{'}'} para inserir dados dinâmicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="variables">Variáveis</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="space-y-2">
              <Textarea
                id="htmlTemplate"
                name="htmlTemplate"
                value={formData.htmlTemplate}
                onChange={handleInputChange}
                placeholder="<div>Template HTML aqui...</div>"
                rows={12}
                className="font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="css" className="space-y-2">
              <Textarea
                id="cssTemplate"
                name="cssTemplate"
                value={formData.cssTemplate}
                onChange={handleInputChange}
                placeholder=".clinic-name { font-weight: bold; }"
                rows={8}
                className="font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione uma categoria:</Label>
                <div className="flex gap-2 flex-wrap">
                  {categoriesAvailable.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={
                        selectedCategory === cat ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                {variablesInCategory.map((variable) => (
                  <div
                    key={variable.name}
                    className="flex justify-between items-start p-3 border rounded-md hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium">
                        {'{'}
                        {'{'}
                        {variable.name}
                        {'}'}
                        {'}'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {variable.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ex: {variable.example}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInsertVariable(variable.name)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Configurações de Leiaute */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assinatura */}
          <div className="space-y-3 pb-4 border-b">
            <h3 className="font-semibold text-sm">Assinatura</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="signaturePosition">Posição</Label>
                <select
                  id="signaturePosition"
                  name="signaturePosition"
                  value={formData.signaturePosition}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="bottom-left">Inferior Esquerdo</option>
                  <option value="bottom-center">Inferior Centro</option>
                  <option value="bottom-right">Inferior Direito</option>
                  <option value="top-right">Superior Direito</option>
                  <option value="top-left">Superior Esquerdo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureSize">Tamanho</Label>
                <select
                  id="signatureSize"
                  name="signatureSize"
                  value={formData.signatureSize}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </select>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">QR Code</h3>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.showQrcode}
                  onCheckedChange={() => handleToggle('showQrcode')}
                />
              </label>
            </div>

            {formData.showQrcode && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qrcodePosition">Posição</Label>
                  <select
                    id="qrcodePosition"
                    name="qrcodePosition"
                    value={formData.qrcodePosition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="bottom-left">Inferior Esquerdo</option>
                    <option value="bottom-center">Inferior Centro</option>
                    <option value="bottom-right">Inferior Direito</option>
                    <option value="top-right">Superior Direito</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrcodeSize">Tamanho</Label>
                  <Input
                    id="qrcodeSize"
                    name="qrcodeSize"
                    value={formData.qrcodeSize}
                    onChange={handleInputChange}
                    placeholder="1cm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Elementos de Clínica */}
          <div className="space-y-3 pb-4 border-b">
            <h3 className="font-semibold text-sm">Dados da Clínica</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.clinicName}
                  onCheckedChange={() => handleToggle('clinicName')}
                />
                <span className="text-sm">Nome da Clínica</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.clinicLogo}
                  onCheckedChange={() => handleToggle('clinicLogo')}
                />
                <span className="text-sm">Logo da Clínica</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.clinicAddress}
                  onCheckedChange={() => handleToggle('clinicAddress')}
                />
                <span className="text-sm">Endereço da Clínica</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.clinicPhone}
                  onCheckedChange={() => handleToggle('clinicPhone')}
                />
                <span className="text-sm">Telefone da Clínica</span>
              </label>
            </div>
          </div>

          {/* Elementos de Médico */}
          <div className="space-y-3 pb-4 border-b">
            <h3 className="font-semibold text-sm">Dados do Médico</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.doctorName}
                  onCheckedChange={() => handleToggle('doctorName')}
                />
                <span className="text-sm">Nome</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.doctorSpec}
                  onCheckedChange={() => handleToggle('doctorSpec')}
                />
                <span className="text-sm">Especialidade</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.doctorCRM}
                  onCheckedChange={() => handleToggle('doctorCRM')}
                />
                <span className="text-sm">CRM</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.doctorAddress}
                  onCheckedChange={() => handleToggle('doctorAddress')}
                />
                <span className="text-sm">Endereço Profissional</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.doctorLogo}
                  onCheckedChange={() => handleToggle('doctorLogo')}
                />
                <span className="text-sm">Logo Pessoal</span>
              </label>
            </div>
          </div>

          {/* Rodapé */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Rodapé</h3>
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.showFooter}
                  onCheckedChange={() => handleToggle('showFooter')}
                />
              </label>
            </div>

            {formData.showFooter && (
              <Textarea
                name="footerText"
                value={formData.footerText}
                onChange={handleInputChange}
                placeholder="Texto do rodapé..."
                rows={2}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex gap-2 justify-end">
        <Button type="submit" size="lg" disabled={saving || loading}>
          {saving || loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Salvar Template
        </Button>
      </div>
    </form>
  )
}
