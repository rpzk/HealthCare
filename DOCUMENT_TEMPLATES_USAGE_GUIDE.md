# Módulo de Templates de Documentos - Guia de Uso

## ✅ O que foi implementado

### 1. **Modelos de Banco de Dados**
- **DocumentTemplate**: Armazena templates customizáveis
  - HTML template com placeholders
  - CSS customizado
  - Configurações de layout
  - Controle de elementos (clínica, médico, assinatura, QR code)
  
- **GeneratedDocument**: Rastreia documentos gerados
  - Template usado
  - Documento original (ID e tipo)
  - Dados de médico e paciente
  - URL do PDF gerado
  - Hash de assinatura digital

### 2. **Service Layer**
- **DocumentTemplateService** (`lib/document-templates/service.ts`)
  - CRUD completo de templates
  - Validação de variáveis
  - Duplicação de templates
  - Gerenciamento de templates padrão
  - Registração de documentos gerados

### 3. **Renderer de Templates**
- **TemplateRenderer** (`lib/document-templates/renderer.ts`)
  - Renderização de HTML com dados reais
  - Substituição de variáveis/placeholders
  - Formatação de datas
  - Cálculo de idade
  - Tratamento de dados ausentes

### 4. **Variáveis Disponíveis**
- **70+ variáveis** agrupadas em categorias:
  - Clínica: nome, endereço, logo, header, telefone, rodapé
  - Médico: nome, especialidade, CRM, endereço, logo pessoal
  - Paciente: nome, CPF, data nascimento, idade, endereço, gênero
  - Documento: data, hora, número, tipo, QR code
  - Assinatura: linha, data, indicador digital

### 5. **API Endpoints**
```
GET    /api/document-templates                    # Listar templates
POST   /api/document-templates                    # Criar template
GET    /api/document-templates/[id]               # Detalhe
PUT    /api/document-templates/[id]               # Atualizar
DELETE /api/document-templates/[id]               # Deletar
POST   /api/document-templates/[id]/duplicate     # Duplicar
POST   /api/document-templates/[id]/render        # Renderizar HTML
GET    /api/document-templates/variables          # Listar variáveis
```

### 6. **Interface de Usuário**
- **Página de Listagem** (`/document-templates`)
  - Lista todos os templates
  - Filtro por tipo de documento
  - Ações: editar, visualizar, duplicar, deletar
  
- **Página de Criação** (`/document-templates/create`)
  - Formulário completo de template
  
- **Página de Edição** (`/document-templates/[id]`)
  - Edição de templates existentes
  
- **Componente Editor** (`TemplateEditor`)
  - Editor HTML com syntax highlighting
  - Editor CSS
  - Inserção de variáveis via drag-drop
  - Preview de variáveis disponíveis
  - Configurações de layout
  - Toggles para elementos

### 7. **Templates Padrão**
Inclui templates prontos para:
- **Prescrição Médica**: Layout clássico com medicamentos
- **Atestado Médico**: Formato formal com dados do paciente

---

## 🚀 Como Usar

### Criar um novo template

1. Acesse `/document-templates/create`
2. Preencha informações básicas:
   - Nome do template
   - Tipo de documento (prescrição, atestado, etc.)
   - Descrição

3. Escreva o HTML usando placeholders:
```html
<div>
  <h1>{{clinic.name}}</h1>
  <p>Dr. {{doctor.name}}</p>
  <p>Paciente: {{patient.name}}</p>
  <p>Data: {{document.date}}</p>
</div>
```

4. (Opcional) Adicione CSS customizado

5. Configure:
   - Posição da assinatura
   - Posição do QR code
   - Quais elementos devem aparecer (logo clínica, CRM, etc.)
   - Texto do rodapé

6. Clique "Salvar Template"

### Usar um template para gerar documento

```typescript
// No servidor
const templateId = 'seu-template-id'
const doctorId = 'id-do-medico'
const patientId = 'id-do-paciente'
const documentId = 'id-da-prescricao'

const response = await fetch(
  `/api/document-templates/${templateId}/render`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentType: 'prescription',
      documentId,
      doctorId,
      patientId,
      qrcodeUrl: 'url-do-qrcode', // opcional
      customData: {
        'prescription.medications': '1) Dipirona 500mg\n2) ...'
      }
    })
  }
)

const { html, context, template } = await response.json()
// Usar `html` para exibir/imprimir/converter em PDF
```

### Integração com Prescrições

Atualmente, a integração ainda não foi feita. Para integrar com o módulo de prescrições:

1. Modificar [app/prescriptions/[id]/page.tsx](app/prescriptions/[id]/page.tsx)
2. Carregar template padrão do tipo `prescription`
3. Chamar o endpoint de render
4. Usar HTML retornado

---

## 📋 Variáveis Disponíveis

### Clínica
- `{{clinic.name}}` - Nome
- `{{clinic.address}}` - Endereço completo
- `{{clinic.city}}` - Cidade
- `{{clinic.state}}` - Estado (UF)
- `{{clinic.zipCode}}` - CEP
- `{{clinic.phone}}` - Telefone
- `{{clinic.logo}}` - Logo (HTML img)
- `{{clinic.header}}` - Header (HTML img)
- `{{clinic.footer}}` - Rodapé

### Médico
- `{{doctor.name}}` - Nome completo
- `{{doctor.speciality}}` - Especialidade
- `{{doctor.crmNumber}}` - Número CRM
- `{{doctor.licenseType}}` - Tipo (CRM, COREN, etc.)
- `{{doctor.licenseState}}` - Estado da licença
- `{{doctor.phone}}` - Telefone
- `{{doctor.email}}` - Email
- `{{doctor.address}}` - Endereço profissional
- `{{doctor.city}}`, `{{doctor.state}}`, `{{doctor.zipCode}}`
- `{{doctor.logo}}` - Logo pessoal (HTML img)

### Paciente
- `{{patient.name}}` - Nome
- `{{patient.email}}` - Email
- `{{patient.phone}}` - Telefone
- `{{patient.cpf}}` - CPF
- `{{patient.birthDate}}` - Data nascimento (DD/MM/YYYY)
- `{{patient.age}}` - Idade (calculada)
- `{{patient.gender}}` - Gênero
- `{{patient.address}}` - Endereço
- `{{patient.city}}`, `{{patient.state}}`, `{{patient.zipCode}}`

### Documento
- `{{document.date}}` - Data (DD/MM/YYYY)
- `{{document.datetime}}` - Data e hora
- `{{document.time}}` - Hora (HH:MM)
- `{{document.number}}` - ID/Número
- `{{document.type}}` - Tipo documento
- `{{document.qrcode}}` - QR Code (HTML img)

### Assinatura
- `{{signature.line}}` - Linha para assinatura manuscrita
- `{{signature.digital}}` - Indicador assinatura digital
- `{{signature.date}}` - Data da assinatura

---

## 🔧 Customizações Frequentes

### Adicionar novo campo à clínica
1. Adicionar no modelo `Branding` (schema.prisma)
2. Criar migration
3. Adicionar variável em `lib/document-templates/variables.ts`
4. Usar no template com `{{clinic.novocampo}}`

### Adicionar novo tipo de documento
1. Criar novo template com tipo diferente
2. Templates podem ter tipos: prescription, certificate, attestation, referral, report, etc.

### Adicionar campo customizado
Você pode passar dados customizados no `render`:
```json
{
  "customData": {
    "prescription.medications": "...",
    "meuCampo": "valor"
  }
}
```

E usar no template:
```html
<p>{{prescription.medications}}</p>
<p>{{meuCampo}}</p>
```

---

## 📊 Fluxo de Documentos

```
Usuario cria/edita template
        ↓
Template salvo em DocumentTemplate
        ↓
Usuario gera documento (prescrição, atestado, etc.)
        ↓
API chama /render com dados reais
        ↓
TemplateRenderer substitui placeholders
        ↓
HTML renderizado retorna ao cliente
        ↓
Cliente converte em PDF (print/html2pdf)
        ↓
Documento assinado digitalmente (opcional)
        ↓
GeneratedDocument registra uso do template
```

---

## 🔐 Segurança

- **Autenticação**: Todos endpoints requerem session válida
- **Autorização**: Usuários ADMIN/DOCTOR podem criar templates
  - Usuários só podem editar/deletar seus próprios templates (ou admin)
- **Validação de variáveis**: Sistema impede variáveis inválidas
- **Escape de HTML**: Dados são escapados automaticamente

---

## 📈 Próximas Melhorias

1. **Integração com Prescrições**
   - Modificar page.tsx de prescrições
   - Usar template padrão de prescription
   - Renderizar com dados reais

2. **Integração com Certificados**
   - Modificar gerador de PDFs
   - Usar templates customizáveis

3. **Preview em Tempo Real**
   - Iframe mostrando HTML renderizado
   - Atualização ao digitar

4. **Biblioteca de Templates**
   - Compartilhar templates entre usuários
   - Marketplace de templates

5. **Versionamento**
   - Histórico de versões do template
   - Rollback para versões anteriores

6. **Internacionalização**
   - Templates em múltiplos idiomas
   - Formatação de datas por locale

7. **Performance**
   - Cache de templates renderizados
   - Geração de PDF em background

---

## 🐛 Troubleshooting

### Template não aparece na lista
- Verifique se `isActive` está `true`
- Confirme se a autenticação está ok

### Variáveis não são substituídas
- Verifique a sintaxe: `{{variable.name}}`
- Use a aba "Variáveis" do editor para copiar o nome correto
- Confirme que os dados existem (ex: se `patient.name` está vazio)

### Documento não renderiza
- Verifique logs no servidor
- Valide que doctorId e documentId existem
- Confirme que o template não tem erros de HTML

---

## 📞 Suporte

Para dúvidas ou bugs, verifique:
- Logs do servidor: `/var/log/healthcare/`
- Terminal de desenvolvimento: output do `npm run dev`
- Documentação: [DOCUMENT_TEMPLATE_MODULE_PLAN.md](DOCUMENT_TEMPLATE_MODULE_PLAN.md)
