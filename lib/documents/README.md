# 📋 Módulo de Documentos Médicos

Sistema completo para geração, validação e assinatura digital de documentos médicos em conformidade com a legislação brasileira.

## 📚 Legislação Atendida

| Legislação | Descrição | Aplicação |
|------------|-----------|-----------|
| **CFM 2.299/2021** | Prescrição eletrônica e telemedicina | Formato e conteúdo de prescrições |
| **Portaria 344/98** | Controle de medicamentos | Receitas controladas (listas A, B, C) |
| **Lei 9.787/99** | Medicamentos genéricos | Uso obrigatório da DCB |
| **RDC 20/2011** | Antimicrobianos | Validade de 10 dias |
| **ICP-Brasil** | Certificação digital | Assinaturas PAdES válidas |
| **MP 2.200-2/2001** | Validade jurídica | Documentos assinados digitalmente |

## 🏗️ Arquitetura

```
lib/documents/
├── index.ts           # Exports centralizados
├── types.ts           # Definições TypeScript
├── validator.ts       # Validação conforme legislação
├── pades-signer.ts    # Assinatura digital PAdES-B
├── pdf-generator.ts   # Geração de PDFs
└── service.ts         # Serviço unificado
```

## 🚀 Uso Básico

### Prescrição Médica

```typescript
import { createPrescription } from '@/lib/documents'

const result = await createPrescription({
  doctorId: 'uuid-do-medico',
  patientId: 'uuid-do-paciente',
  usageType: 'INTERNAL',
  medications: [{
    genericName: 'Amoxicilina',           // DCB obrigatório
    brandName: 'Amoxil',                   // Opcional
    concentration: '500mg',
    pharmaceuticalForm: 'cápsula',
    quantity: 21,
    quantityUnit: 'cápsulas',
    dosage: '1 cápsula',
    route: 'oral',
    frequency: 'de 8 em 8 horas',
    duration: 'por 7 dias',
  }],
  notes: 'Retorno em 7 dias se não houver melhora.',
})

if (result.success) {
  // result.signedPdf - PDF assinado digitalmente
  // result.documentId - ID único do documento
  // result.verificationUrl - URL para verificação
}
```

### Atestado Médico

```typescript
import { createCertificate } from '@/lib/documents'

const result = await createCertificate({
  doctorId: 'uuid-do-medico',
  patientId: 'uuid-do-paciente',
  certificateType: 'MEDICAL_LEAVE',
  content: 'Atesto que o(a) paciente necessita de afastamento...',
  days: 3,
  startDate: new Date(),
  includeCid: false, // Paciente pode recusar
})
```

### Encaminhamento

```typescript
import { createReferral } from '@/lib/documents'

const result = await createReferral({
  doctorId: 'uuid-do-medico',
  patientId: 'uuid-do-paciente',
  targetSpecialty: 'Cardiologia',
  priority: 'URGENT',
  reason: 'Dor torácica atípica para investigação',
  clinicalHistory: 'HAS, DM2...',
})
```

### Solicitação de Exames

```typescript
import { createExamRequest } from '@/lib/documents'

const result = await createExamRequest({
  doctorId: 'uuid-do-medico',
  patientId: 'uuid-do-paciente',
  exams: [
    { name: 'Hemograma completo', code: '40304361' },
    { name: 'Glicemia de jejum', code: '40302040' },
  ],
  priority: 'ROUTINE',
  clinicalIndication: 'Check-up de rotina',
})
```

## 🔒 Assinatura Digital

### Requisitos

1. **Certificado A1 ICP-Brasil** - Arquivo .pfx/.p12
2. **Cadeia completa** - AC Raiz → AC Intermediária → Certificado
3. **CPF no certificado** - Para identificação do assinante

### Validação no ITI

Os PDFs assinados podem ser validados em:
- https://validar.iti.gov.br
- https://verificador.iti.br

### Sessão de Certificado (Token de Autenticação)

Assim como serviços em nuvem (SafeID, BirdID, VIDaaS), o sistema permite que o médico autentique seu certificado **uma vez** e use por um período configurável sem precisar inserir a senha repetidamente.

```typescript
// API: /api/certificate-session

// 1. Iniciar sessão (autenticar certificado)
POST /api/certificate-session
{ "password": "senha_do_certificado" }

// Resposta:
{
  "message": "Sessão iniciada",
  "expiresAt": "2025-02-01T22:15:00.000Z",
  "sessionDuration": 14400 // 4 horas
}

// 2. Verificar status da sessão
GET /api/certificate-session

// Resposta com sessão ativa:
{
  "hasCertificate": true,
  "certificate": {
    "subject": "RAFAEL PIAZENSKI WIETHORN:12345678900",
    "issuer": "AC VALID RFB V5",
    "validUntil": "2026-12-29T03:00:00.000Z",
    "isExpired": false
  },
  "session": {
    "active": true,
    "locked": false,
    "expiresAt": "2025-02-01T22:15:00.000Z",
    "remainingTimeFormatted": "3h 45min"
  }
}

// 3. Bloquear sessão (quando se ausentar)
PATCH /api/certificate-session
{ "action": "lock" }

// 4. Desbloquear sessão
PATCH /api/certificate-session
{ "action": "unlock", "password": "senha_do_certificado" }

// 5. Encerrar sessão
DELETE /api/certificate-session
```

**Configuração de segurança (lib/certificate-session.ts):**
- Sessão padrão: 4 horas
- Sessão máxima: 12 horas
- Timeout de inatividade: 30 minutos
- Criptografia: AES-256-GCM com IV único
- Armazenamento: Redis com TTL automático

**Fluxo de uso:**
1. Médico inicia sessão → digita senha do certificado
2. Senha é criptografada e armazenada no Redis
3. Documentos são assinados automaticamente
4. Ao se ausentar → bloqueia a sessão
5. Ao retornar → desbloqueia com senha
6. Ao finalizar o dia → encerra a sessão

**Componente UI:** `<CertificateSessionIndicator />`
- Indicador visual do status da sessão
- Tempo restante
- Botões para bloquear/desbloquear/encerrar

### Configuração do Certificado

```typescript
// O sistema busca o certificado do médico em:
// 1. DigitalCertificate.pfxFilePath do usuário
// 2. Configuração da clínica (futuro)

// Para adicionar um certificado:
await prisma.digitalCertificate.create({
  data: {
    userId: doctorId,
    pfxFilePath: '/path/to/certificate.pfx',
    isActive: true,
    // ... outros campos
  }
})
```

## 📝 Tipos de Documento

### Prescrição

| Tipo | Descrição | Cor/Formato |
|------|-----------|-------------|
| `PRESCRIPTION` | Receita comum | Branca simples |
| `CONTROLLED_PRESCRIPTION` | Lista A/B | Amarela/Azul carbonada |
| `ANTIMICROBIAL_PRESCRIPTION` | Antimicrobianos | Branca 2 vias |

### Atestado

| Tipo | Descrição |
|------|-----------|
| `MEDICAL_LEAVE` | Afastamento |
| `FITNESS` | Aptidão física |
| `ACCOMPANIMENT` | Acompanhante |
| `TIME_OFF` | Comparecimento |
| `CUSTOM` | Personalizado |

### Prioridade

| Código | Descrição |
|--------|-----------|
| `ROUTINE` | Rotina |
| `URGENT` | Urgência |
| `EMERGENCY` | Emergência |

## ⚠️ Validações Automáticas

### Prescrição

- ✅ Nome genérico (DCB) obrigatório
- ✅ Quantidade por extenso para controlados
- ✅ Validade de 10 dias para antimicrobianos
- ✅ Classificação automática de controlados

### Atestado

- ✅ Numeração sequencial única
- ✅ CID opcional (paciente pode recusar)
- ✅ Período de afastamento

### Geral

- ✅ Dados completos do médico (CRM, especialidade)
- ✅ Dados do paciente (CPF obrigatório)
- ✅ Assinatura digital válida

## 🔍 Verificação de Documentos

```typescript
import { verifyDocument } from '@/lib/documents'

const verification = await verifyDocument(documentId)

console.log(verification)
// {
//   valid: true,
//   documentType: 'PRESCRIPTION',
//   signatureInfo: {
//     signed: true,
//     signerName: 'Dr. João da Silva',
//     signerCpf: '123.456.789-00',
//     signedAt: '2024-01-15T10:30:00Z',
//     certificateValid: true,
//   },
//   document: { ... }
// }
```

## 🧪 Testes

```bash
# Executar script de teste
npx ts-node --transpile-only scripts/test-documents.ts

# Com certificado de teste
TEST_CERTIFICATE_PATH=./cert.pfx \
TEST_CERTIFICATE_PASSWORD=senha \
npx ts-node --transpile-only scripts/test-documents.ts
```

## 📂 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/documents` | Criar documento |
| `GET` | `/api/documents/[id]` | Obter documento |
| `GET` | `/api/documents/[id]?download=true` | Download PDF |
| `GET` | `/api/documents/[id]/verify` | Verificar documento |

### Exemplo de Requisição

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "documentType": "PRESCRIPTION",
    "patientId": "uuid-paciente",
    "usageType": "INTERNAL",
    "medications": [{
      "genericName": "Amoxicilina",
      "concentration": "500mg",
      "pharmaceuticalForm": "cápsula",
      "quantity": 21,
      "quantityUnit": "cápsulas",
      "dosage": "1 cápsula",
      "route": "oral",
      "frequency": "de 8 em 8 horas",
      "duration": "por 7 dias"
    }]
  }'
```

## 🔄 Migração do Sistema Antigo

Se você tem um sistema de prescrições legado:

1. **Backup** - Faça backup dos dados existentes
2. **Mapeamento** - Adapte os campos para o novo formato
3. **Validação** - Rode a validação em modo dry-run
4. **Migração** - Converta os documentos existentes

```typescript
// Exemplo de migração
import { createPrescription } from '@/lib/documents'

const oldPrescriptions = await prisma.prescription.findMany()

for (const old of oldPrescriptions) {
  // Adaptar para novo formato
  await createPrescription({
    doctorId: old.doctorId,
    patientId: old.patientId,
    // ... mapear campos
  })
}
```

## 🛠️ Troubleshooting

### Erro: "Certificado inválido"

- Verifique se o certificado está na cadeia ICP-Brasil
- Confirme que a senha está correta
- Verifique a data de validade

### Erro: "PDF não pode ser assinado"

- Certifique-se de que o PDF não está corrompido
- Verifique se o placeholder de assinatura foi adicionado

### Erro: "Validação falhou no ITI"

- Confira se a cadeia de certificados está completa
- Verifique o timestamp da assinatura
- Confirme que o algoritmo é SHA256withRSA

## 📖 Referências

- [CFM - Resolução 2.299/2021](https://sistemas.cfm.org.br/normas/)
- [ANVISA - Portaria 344/98](https://www.gov.br/anvisa/)
- [ITI - Validador de Assinaturas](https://validar.iti.gov.br/)
- [ICP-Brasil - Documentação](https://www.gov.br/iti/pt-br/assuntos/icp-brasil)
