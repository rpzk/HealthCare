# Integração de Templates - Quick Start

## 🎯 Objetivo
Integrar o módulo de templates de documentos com as **prescrições**, **certificados** e outros documentos.

---

## 1️⃣ Integração com Prescrições

### Passo 1: Importar serviços no `prescriptions-service.ts`

```typescript
import { DocumentTemplateService } from '@/lib/document-templates/service'
import { 
  TemplateRenderer, 
  TemplateDataContext 
} from '@/lib/document-templates/renderer'
import { getBranding } from '@/lib/branding-service'
```

### Passo 2: Criar função para renderizar prescrição com template

```typescript
export async function renderPrescriptionWithTemplate(
  prescriptionId: string,
  templateId?: string
) {
  // 1. Buscar prescrição
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      doctor: {
        include: {
          person: {
            include: {
              addresses: {
                include: { address: true }
              }
            }
          }
        }
      },
      patient: {
        include: { addresses: true }
      }
    }
  })

  if (!prescription) throw new Error('Prescrição não encontrada')

  // 2. Se não especificar template, usar o padrão
  let template = null
  if (templateId) {
    template = await DocumentTemplateService.getTemplate(templateId)
  } else {
    template = await DocumentTemplateService.getDefaultTemplate('prescription')
  }

  if (!template) {
    // Fallback: usar template padrão do sistema
    throw new Error('Nenhum template de prescrição encontrado')
  }

  // 3. Preparar contexto de dados
  const branding = await getBranding()
  const doctorAddress = prescription.doctor.person?.addresses?.[0]?.address

  const context: TemplateDataContext = {
    clinic: {
      name: branding?.clinicName,
      address: branding?.clinicAddress,
      city: branding?.clinicCity,
      state: branding?.clinicState,
      zipCode: branding?.clinicZipCode,
      phone: branding?.clinicPhone,
      logoUrl: branding?.logoUrl,
      headerUrl: branding?.headerUrl,
      footerText: branding?.footerText,
    },
    doctor: {
      name: prescription.doctor.name,
      speciality: prescription.doctor.speciality || undefined,
      crmNumber: prescription.doctor.crmNumber || undefined,
      licenseType: prescription.doctor.licenseType || undefined,
      licenseState: prescription.doctor.licenseState || undefined,
      phone: prescription.doctor.phone || undefined,
      email: prescription.doctor.email || undefined,
      address: doctorAddress?.street,
      city: doctorAddress?.city,
      state: doctorAddress?.state,
      zipCode: doctorAddress?.zipCode,
    },
    patient: {
      name: prescription.patient.name,
      email: prescription.patient.email,
      phone: prescription.patient.phone,
      cpf: prescription.patient.cpf || undefined,
      birthDate: prescription.patient.birthDate,
      gender: prescription.patient.gender,
      address: prescription.patient.addresses?.[0]?.street,
      city: prescription.patient.addresses?.[0]?.city,
      state: prescription.patient.addresses?.[0]?.state,
      zipCode: prescription.patient.addresses?.[0]?.zipCode,
    },
    document: {
      date: prescription.createdAt,
      number: prescription.id.substring(0, 8).toUpperCase(),
      type: 'Prescrição',
    }
  }

  // 4. Renderizar template
  const renderer = new TemplateRenderer(template.htmlTemplate, context)
  const html = renderer.render()

  // 5. Registrar documento gerado
  const generatedDoc = await DocumentTemplateService.recordGeneratedDocument({
    templateId: template.id,
    documentType: 'prescription',
    documentId: prescriptionId,
    doctorId: prescription.doctorId,
    patientId: prescription.patientId,
  })

  return {
    html,
    css: template.cssTemplate,
    template: {
      id: template.id,
      name: template.name,
    },
    generatedDocumentId: generatedDoc.id,
  }
}
```

### Passo 3: Criar API endpoint para renderizar

```typescript
// app/api/prescriptions/[id]/render/route.ts

import { auth } from '@/auth'
import { renderPrescriptionWithTemplate } from '@/lib/prescriptions-service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const templateId = new URL(req.url).searchParams.get('templateId')

    const { html, css, template } = await renderPrescriptionWithTemplate(
      id,
      templateId || undefined
    )

    return NextResponse.json({
      html,
      css,
      template
    })
  } catch (error: any) {
    console.error('Error rendering prescription:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao renderizar prescrição' },
      { status: 400 }
    )
  }
}
```

### Passo 4: Atualizar página de prescrição

```typescript
// app/prescriptions/[id]/page.tsx

// Adicionar estado e efeito para renderizar com template
const [renderedHtml, setRenderedHtml] = useState<string | null>(null)
const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

useEffect(() => {
  const renderWithTemplate = async () => {
    try {
      const url = `/api/prescriptions/${prescriptionId}/render`
      const params = selectedTemplate ? `?templateId=${selectedTemplate}` : ''
      
      const res = await fetch(url + params)
      const data = await res.json()
      setRenderedHtml(data.html)
    } catch (error) {
      console.error('Erro ao renderizar:', error)
    }
  }

  renderWithTemplate()
}, [prescriptionId, selectedTemplate])

// Substituir a section de impressão:
<section className="hidden print:block">
  <div dangerouslySetInnerHTML={{ __html: renderedHtml || '' }} />
</section>
```

---

## 2️⃣ Integração com Certificados

Similar ao acima, mas com `documentType: 'certificate'`

```typescript
export async function renderCertificateWithTemplate(
  certificateId: string,
  templateId?: string
) {
  // ... similar à prescrição
  // documentType: 'certificate'
}
```

---

## 3️⃣ Integração com Atestados Médicos

```typescript
export async function renderAttestationWithTemplate(
  attestationId: string,
  templateId?: string
) {
  // ... similar à prescrição
  // documentType: 'attestation'
}
```

---

## 4️⃣ Seletor de Template no Frontend

```typescript
// Componente para seletor de template
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TemplateSelector {
  documentType: string
  value: string | null
  onChange: (templateId: string | null) => void
}

export function TemplateSelector({
  documentType,
  value,
  onChange,
}: TemplateSelector) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch(
          `/api/document-templates?documentType=${documentType}`
        )
        const data = await res.json()
        setTemplates(data.templates || [])
      } catch (error) {
        console.error('Erro ao carregar templates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [documentType])

  if (loading) return <p>Carregando templates...</p>

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Modelo de Documento</label>
      <Select value={value || 'default'} onValueChange={(v) => onChange(v === 'default' ? null : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um modelo..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Padrão do Sistema</SelectItem>
          {templates.map((t: any) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} {t.isDefault && '(Padrão)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

---

## 5️⃣ Conversão para PDF

### Opção 1: Usar `html2pdf` (Client-side)

```bash
npm install html2pdf.js
```

```typescript
import html2pdf from 'html2pdf.js'

function downloadPrescriptionPDF(html: string) {
  const element = document.createElement('div')
  element.innerHTML = html

  const options = {
    margin: 10,
    filename: 'prescricao.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  }

  html2pdf().set(options).from(element).save()
}
```

### Opção 2: Usar `puppeteer` (Server-side)

```bash
npm install puppeteer
```

```typescript
import puppeteer from 'puppeteer'

export async function htmlToPdf(html: string, filename: string): Promise<Buffer> {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle2' })
  const pdf = await page.pdf({ format: 'A4' })
  await browser.close()
  return pdf
}
```

---

## 6️⃣ Assinatura Digital (Opcional)

Se usar assinatura digital no PDF:

```typescript
import { SignatureService } from '@/lib/signature-service'

const pdf = await htmlToPdf(html, 'prescricao.pdf')
const signed = await SignatureService.signPdf(pdf, userId)

// Registrar documento assinado
const signedDoc = await prisma.signedDocument.create({
  data: {
    documentType: 'PRESCRIPTION',
    documentId: prescriptionId,
    certificateId: userCertificateId,
    signerId: userId,
    signatureValue: signed.signature,
    signatureHash: signed.hash,
  }
})

// Vincular ao documento gerado
await prisma.generatedDocument.update({
  where: { id: generatedDocId },
  data: { signedDocumentId: signedDoc.id }
})
```

---

## 🚀 Checklist de Integração

- [ ] Importar serviços no `prescriptions-service.ts`
- [ ] Criar função `renderPrescriptionWithTemplate()`
- [ ] Criar API endpoint `/api/prescriptions/[id]/render`
- [ ] Atualizar página prescrição para usar template
- [ ] Implementar seletor de template no formulário
- [ ] Testar render com múltiplos templates
- [ ] Testar impressão
- [ ] (Opcional) Integrar conversão PDF
- [ ] (Opcional) Integrar assinatura digital
- [ ] Repetir para certificados, atestados, etc.

---

## 🧪 Testes

```typescript
// Test: Renderizar prescrição com template
describe('Prescription Template Rendering', () => {
  it('should render prescription with template variables', async () => {
    const html = await renderPrescriptionWithTemplate(prescriptionId)
    
    expect(html).toContain('Dr. João Silva')
    expect(html).toContain('Maria Santos')
    expect(html).toContain('Clínica Saúde')
  })

  it('should use default template if none specified', async () => {
    const html = await renderPrescriptionWithTemplate(prescriptionId)
    expect(html).toBeDefined()
  })

  it('should return valid HTML', async () => {
    const html = await renderPrescriptionWithTemplate(prescriptionId)
    expect(html).toMatch(/^<div/)
  })
})
```

---

## 📚 Referências

- [Documentação Principal](DOCUMENT_TEMPLATES_IMPLEMENTATION.md)
- [Guia de Uso](DOCUMENT_TEMPLATES_USAGE_GUIDE.md)
- [Plano Detalhado](DOCUMENT_TEMPLATE_MODULE_PLAN.md)

---

## 💬 Próximas Passos

1. **Implementar integração com prescrições** (este guia)
2. **Testar com múltiplos templates**
3. **Integrar certificados e atestados**
4. **Adicionar conversão para PDF**
5. **Implementar assinatura digital**
6. **Criar documentação para usuários finais**

---

**Bom desenvolvimento! 🚀**
