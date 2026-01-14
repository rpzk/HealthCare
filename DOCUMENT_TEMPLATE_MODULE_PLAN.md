# Módulo de Criação e Edição de Documentos - Plano Detalhado

## Objetivo
Criar um sistema flexível de templates de documentos que permite customização do layout de acordo com as necessidades do cliente, linkado com dados reais do banco de dados.

## Análise de Dados Disponíveis

### Estrutura de Clínica
- **Modelo Branding**: Armazena informações globais da clínica
  - `clinicName`: Nome da clínica
  - `logoUrl`: URL do logo
  - `headerUrl`: URL do header
  - `footerText`: Texto rodapé

### Estrutura de Médico/Profissional
- **Modelo User**: Informações do usuário/médico
  - `name`: Nome completo
  - `speciality`: Especialidade
  - `crmNumber`: Número CRM
  - `licenseNumber`: Número de licença genérico
  - `licenseType`: Tipo de licença (CRM, COREN, etc.)
  - `licenseState`: Estado da licença
  - `phone`: Telefone
- **Modelo Person**: Dados demográficos estendidos
  - `email`: Email
  - `phone`: Telefone
  - `addresses`: Múltiplos endereços (via PersonAddress)
- **Modelo Professional**: Dados profissionais
  - `registryNumber`: CNS/CNES
  - `councilNumber`: CRM, COREN
  - `councilType`: Tipo de conselho

### Estrutura de Endereço
- **Modelo Address**: Endereço completo
  - `street`: Rua
  - `number`: Número
  - `complement`: Complemento
  - `neighborhood`: Bairro
  - `city`: Cidade
  - `state`: Estado
  - `zipCode`: CEP
  - `latitude`, `longitude`: Coordenadas
- **Modelo PersonAddress**: Vinculação de endereço a pessoa
  - `type`: RESIDENTIAL, COMMERCIAL
  - `isPrimary`: É endereço principal?

### Estrutura de Paciente
- **Modelo Patient**: Informações do paciente
  - `name`: Nome
  - `email`: Email
  - `cpf`: CPF
  - `birthDate`: Data de nascimento
  - `gender`: Gênero
  - `phone`: Telefone
  - `addresses`: Endereços via Address

### Documentos Gerados (Atuais)
- **Prescrições**: Formato atualmente fixo
- **Certificados médicos**: Usa `lib/pdf-generator.ts` com dados de clínica
- **Atestados**: Idem certificados

---

## Arquitetura do Módulo

### 1. Models Prisma (Novos)

#### DocumentTemplate
Armazena os templates de documentos customizáveis
```prisma
model DocumentTemplate {
  id              String @id @default(cuid())
  name            String  // Ex: "Prescrição Padrão", "Atestado Médico"
  documentType    String  // prescription, certificate, attestation, etc.
  description     String?
  
  // HTML com placeholders {{variável}}
  htmlTemplate    String  @db.Text
  
  // CSS customizado para o template
  cssTemplate     String? @db.Text
  
  // Configurações de layout
  config          Json? // { pageSize, orientation, margins, etc. }
  
  // Elemento para assinatura digital
  signaturePosition String? // bottom-right, bottom-left, bottom-center, etc.
  signatureSize   String? // small, medium, large
  
  // QR Code
  qrcodePosition  String? // bottom-right, bottom-left, etc.
  qrcodeSize      String? // 1cm, 2cm, etc.
  showQrcode      Boolean @default(true)
  
  // Dados de clínica inclusos
  clinicName      Boolean @default(true)
  clinicLogo      Boolean @default(true)
  clinicAddress   Boolean @default(true)
  clinicPhone     Boolean @default(true)
  
  // Dados de médico inclusos
  doctorName      Boolean @default(true)
  doctorSpec      Boolean @default(true)
  doctorCRM       Boolean @default(true)
  doctorAddress   Boolean @default(false)
  doctorLogo      Boolean @default(false)
  
  // Rodapé
  showFooter      Boolean @default(true)
  footerText      String?
  
  // Status
  isActive        Boolean @default(true)
  isDefault       Boolean @default(false)
  
  // Auditoria
  createdBy       String
  createdByUser   User    @relation("TemplateCreatedBy", fields: [createdBy], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Documentos gerados com este template
  generatedDocs   GeneratedDocument[]
  
  @@index([documentType])
  @@index([createdBy])
  @@map("document_templates")
}
```

#### GeneratedDocument
Rastreia documentos gerados com seus templates
```prisma
model GeneratedDocument {
  id            String @id @default(cuid())
  
  // Template usado
  templateId    String
  template      DocumentTemplate @relation(fields: [templateId], references: [id])
  
  // Documento original (prescrição, certificado, etc.)
  documentType  String  // prescription, certificate, etc.
  documentId    String  // ID da prescrição, certificado, etc.
  
  // Médico
  doctorId      String
  doctor        User    @relation(fields: [doctorId], references: [id])
  
  // Paciente (opcional)
  patientId     String?
  patient       Patient? @relation(fields: [patientId], references: [id])
  
  // PDF armazenado
  pdfUrl        String?
  
  // Assinatura digital
  signedHash    String?
  signedDocument SignedDocument?
  
  createdAt     DateTime @default(now())
  
  @@index([templateId])
  @@index([documentType, documentId])
  @@index([doctorId])
  @@index([patientId])
  @@map("generated_documents")
}
```

### 2. Estrutura de Pastas

```
app/
├── document-templates/          # Novo módulo
│   ├── page.tsx                 # Lista de templates
│   ├── create/
│   │   └── page.tsx             # Criar novo template
│   └── [id]/
│       ├── page.tsx             # Editar template
│       └── preview/
│           └── page.tsx         # Preview do template
├── api/
│   └── document-templates/
│       ├── route.ts             # GET/POST templates
│       ├── [id]/
│       │   ├── route.ts         # GET/PUT/DELETE template
│       │   ├── preview/
│       │   │   └── route.ts     # Gerar preview HTML
│       │   └── render/
│       │       └── route.ts     # Renderizar com dados reais

components/
├── document-templates/          # Novo componente
│   ├── template-editor.tsx      # Editor HTML/CSS
│   ├── template-preview.tsx     # Preview em tempo real
│   ├── field-mapper.tsx         # Mapeador de campos disponíveis
│   ├── placeholder-helper.tsx   # Helper de placeholders
│   └── template-form.tsx        # Formulário de criação

lib/
├── document-templates/          # Nova service
│   ├── service.ts               # CRUD de templates
│   ├── renderer.ts              # Renderização de templates
│   ├── variables.ts             # Definição de variáveis disponíveis
│   └── placeholders.ts          # Validação e processamento de placeholders
```

### 3. Variáveis Disponíveis para Templates

```typescript
// Clínica
{{clinic.name}}
{{clinic.address}}
{{clinic.city}}
{{clinic.state}}
{{clinic.zipCode}}
{{clinic.phone}}
{{clinic.logo}}        // HTML: <img src="...">
{{clinic.header}}      // HTML: <img src="...">
{{clinic.footer}}

// Médico
{{doctor.name}}
{{doctor.speciality}}
{{doctor.crmNumber}}
{{doctor.licenseType}}
{{doctor.licenseState}}
{{doctor.phone}}
{{doctor.email}}
{{doctor.address}}     // Endereço profissional
{{doctor.city}}
{{doctor.state}}
{{doctor.zipCode}}
{{doctor.logo}}        // Logo pessoal do médico
{{doctor.signature}}   // Assinatura digital

// Paciente
{{patient.name}}
{{patient.email}}
{{patient.phone}}
{{patient.cpf}}
{{patient.birthDate}}
{{patient.age}}
{{patient.gender}}
{{patient.address}}
{{patient.city}}
{{patient.state}}
{{patient.zipCode}}

// Documento
{{document.date}}
{{document.datetime}}
{{document.time}}
{{document.number}}    // ID/número do documento
{{document.type}}      // prescription, certificate, etc.
{{document.qrcode}}    // HTML: <img src="...">
{{document.signature}} // Para assinatura digital

// Conteúdo específico (customizável por tipo)
{{prescription.medications}}
{{prescription.observations}}
{{certificate.content}}
{{certificate.startDate}}
{{certificate.endDate}}
```

---

## Fases de Implementação

### Fase 1: Database & Schema
- [ ] Criar models Prisma (DocumentTemplate, GeneratedDocument)
- [ ] Gerar migrations
- [ ] Atualizar Prisma client

### Fase 2: Service Layer
- [ ] Criar service de templates (CRUD)
- [ ] Criar renderer de templates
- [ ] Validação de placeholders
- [ ] Geração de PDFs com templates

### Fase 3: API Endpoints
- [ ] GET /api/document-templates (listar)
- [ ] POST /api/document-templates (criar)
- [ ] GET /api/document-templates/[id] (detalhe)
- [ ] PUT /api/document-templates/[id] (atualizar)
- [ ] DELETE /api/document-templates/[id] (deletar)
- [ ] POST /api/document-templates/[id]/preview (preview HTML)
- [ ] POST /api/document-templates/[id]/render (render com dados)

### Fase 4: UI Components
- [ ] Editor de HTML com syntax highlighting
- [ ] Editor de CSS com preview
- [ ] Helper de placeholders (drag-drop, autocomplete)
- [ ] Preview em tempo real
- [ ] Seletor de posição (signature, QR, etc.)

### Fase 5: Pages
- [ ] Listagem de templates (/document-templates)
- [ ] Criar template (/document-templates/create)
- [ ] Editar template (/document-templates/[id])
- [ ] Preview (/document-templates/[id]/preview)

### Fase 6: Integração
- [ ] Modificar prescrições para usar templates
- [ ] Modificar certificados para usar templates
- [ ] Fallback para templates padrão
- [ ] Versioning de templates

### Fase 7: Testes & Refinamento
- [ ] Testes de rendering
- [ ] Testes de assinatura digital
- [ ] QA visual
- [ ] Performance

---

## Dados Que Precisam Ser Expandidos

### Médico
Adicionar no modelo User ou Person:
- [ ] logoUrl - Logo pessoal do médico
- [ ] professionalAddress - Endereço profissional (pode usar PersonAddress)
- [ ] professionalPhone - Telefone profissional

### Clínica
Adicionar no modelo Branding:
- [ ] phone - Telefone da clínica
- [ ] address - Endereço da clínica
- [ ] city - Cidade
- [ ] state - Estado
- [ ] zipCode - CEP

---

## Exemplo: Template de Prescrição

```html
<div style="padding: 20mm; font-family: Arial, sans-serif; max-width: 210mm;">
  <!-- Header com logo da clínica -->
  <div style="text-align: center; margin-bottom: 20mm;">
    {{#if clinic.logo}}
      <img src="{{clinic.logo}}" style="max-height: 40mm; margin-bottom: 10mm;">
    {{/if}}
    <h2 style="margin: 0;">{{clinic.name}}</h2>
    {{#if clinic.address}}
      <p style="font-size: 10pt; margin: 5px 0;">
        {{clinic.address}} - {{clinic.city}}, {{clinic.state}}
      </p>
    {{/if}}
  </div>

  <!-- Dados do médico -->
  <div style="margin-bottom: 15mm; border-bottom: 1px solid #ccc; padding-bottom: 10mm;">
    <strong>{{doctor.name}}</strong><br>
    {{doctor.speciality}}<br>
    CRM {{doctor.crmNumber}} - {{doctor.licenseState}}
  </div>

  <!-- Dados da prescrição -->
  <div style="margin-bottom: 15mm;">
    <table style="width: 100%; font-size: 10pt;">
      <tr>
        <td><strong>Data:</strong> {{document.date}}</td>
        <td style="text-align: right;"><strong>Paciente:</strong> {{patient.name}}</td>
      </tr>
    </table>
  </div>

  <!-- Medicamentos -->
  <div style="margin-bottom: 15mm;">
    <strong style="border-bottom: 2px solid #000;">PRESCRIÇÃO</strong>
    {{prescription.medications}}
  </div>

  <!-- Assinatura -->
  <div style="margin-top: 40mm; border-top: 1px solid #000; padding-top: 10mm; text-align: center;">
    <p style="margin-bottom: 20mm;">_________________________</p>
    <strong>{{doctor.name}}</strong><br>
    CRM {{doctor.crmNumber}} - {{doctor.licenseState}}
  </div>

  <!-- QR Code para validação -->
  {{#if document.qrcode}}
    <div style="position: absolute; bottom: 10mm; right: 10mm; text-align: center; font-size: 8pt;">
      {{document.qrcode}}
      <p style="margin-top: 5px;">Validação Digital</p>
    </div>
  {{/if}}
</div>
```

---

## Próximos Passos
1. Implementar Phase 1 (Database)
2. Implementar Phase 2 (Service)
3. Implementar Phase 3 (API)
4. Implementar Phase 4-5 (UI)
5. Integrar com prescrições (Phase 6)
6. Testes completos (Phase 7)
