# 📚 API Reference - HealthCare System

## Visão Geral

Base URL: `https://seu-dominio.com/api`

### Autenticação

Todas as rotas (exceto `/auth/*` e `/health`) requerem autenticação via sessão NextAuth.

### Rate Limiting

- **Limite:** 300 requests/minuto por IP
- **Headers de resposta:**
  - `X-RateLimit-Limit`: 300
  - `X-RateLimit-Remaining`: requests restantes
  - `X-RateLimit-Reset`: timestamp de reset

### Formato de Resposta

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### Erros

```json
{
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

| Código HTTP | Significado |
|-------------|-------------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error |

---

## Pacientes

### Listar Pacientes

```http
GET /api/patients
```

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| page | number | Página (default: 1) |
| limit | number | Itens por página (default: 10, max: 100) |
| q | string | Busca por nome ou CPF |
| status | string | Filtrar por status |

**Resposta:**

```json
{
  "data": [
    {
      "id": "clp...",
      "name": "Maria Silva",
      "cpf": "123.456.789-00",
      "birthDate": "1985-03-15",
      "gender": "F",
      "phone": "(11) 99999-9999",
      "email": "maria@email.com",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10
  }
}
```

### Buscar Paciente por ID

```http
GET /api/patients/{id}
```

**Resposta:**

```json
{
  "data": {
    "id": "clp...",
    "name": "Maria Silva",
    "cpf": "123.456.789-00",
    "birthDate": "1985-03-15",
    "gender": "F",
    "phone": "(11) 99999-9999",
    "email": "maria@email.com",
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567"
    },
    "consultations": [...],
    "prescriptions": [...]
  }
}
```

### Criar Paciente

```http
POST /api/patients
Content-Type: application/json
```

**Body:**

```json
{
  "name": "João Santos",
  "cpf": "987.654.321-00",
  "birthDate": "1990-07-20",
  "gender": "M",
  "phone": "(11) 98888-8888",
  "email": "joao@email.com"
}
```

**Resposta:** `201 Created`

```json
{
  "data": {
    "id": "clp...",
    "name": "João Santos",
    ...
  }
}
```

### Atualizar Paciente

```http
PATCH /api/patients/{id}
Content-Type: application/json
```

**Body:** (campos opcionais)

```json
{
  "phone": "(11) 97777-7777",
  "email": "joao.novo@email.com"
}
```

### Deletar Paciente

```http
DELETE /api/patients/{id}
```

**Resposta:** `204 No Content`

---

## Consultas

### Listar Consultas

```http
GET /api/consultations
```

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| page | number | Página |
| limit | number | Itens por página |
| patientId | string | Filtrar por paciente |
| doctorId | string | Filtrar por médico |
| status | string | scheduled, in_progress, completed, cancelled |
| startDate | string | Data inicial (ISO 8601) |
| endDate | string | Data final (ISO 8601) |

### Consultas de Hoje

```http
GET /api/consultations/today
```

### Próximas Consultas

```http
GET /api/consultations/upcoming
```

### Criar Consulta

```http
POST /api/consultations
Content-Type: application/json
```

**Body:**

```json
{
  "patientId": "clp...",
  "doctorId": "clu...",
  "scheduledAt": "2024-11-28T14:00:00Z",
  "type": "regular",
  "reason": "Consulta de rotina"
}
```

### Atualizar Consulta

```http
PATCH /api/consultations/{id}
Content-Type: application/json
```

### Completar Consulta

```http
POST /api/consultations/{id}/complete
Content-Type: application/json
```

**Body:**

```json
{
  "diagnosis": "CID-10: J06.9 - IVAS",
  "notes": "Paciente apresentou...",
  "prescriptions": [...],
  "followUp": "2024-12-15"
}
```

---

## Prescrições

### Listar Prescrições

```http
GET /api/prescriptions
```

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| patientId | string | Filtrar por paciente |
| doctorId | string | Filtrar por médico |
| status | string | active, signed, cancelled |

### Criar Prescrição

```http
POST /api/prescriptions
Content-Type: application/json
```

**Body:**

```json
{
  "patientId": "clp...",
  "consultationId": "clc...",
  "items": [
    {
      "medicationId": "clm...",
      "dosage": "500mg",
      "frequency": "8/8h",
      "duration": "7 dias",
      "instructions": "Tomar com água"
    }
  ]
}
```

### Assinar Prescrição

```http
POST /api/prescriptions/{id}/sign
```

---

## Medicamentos

### Buscar Medicamentos (Autocomplete)

```http
GET /api/medications/autocomplete?q=dipirona
```

**Resposta:**

```json
{
  "data": [
    {
      "id": "clm...",
      "name": "Dipirona Sódica",
      "activeIngredient": "Dipirona",
      "concentration": "500mg",
      "form": "Comprimido"
    }
  ]
}
```

### Validar Interações

```http
POST /api/medications/validate
Content-Type: application/json
```

**Body:**

```json
{
  "medicationIds": ["clm1...", "clm2...", "clm3..."]
}
```

**Resposta:**

```json
{
  "data": {
    "valid": false,
    "interactions": [
      {
        "medications": ["Dipirona", "Varfarina"],
        "severity": "moderate",
        "description": "Pode aumentar efeito anticoagulante"
      }
    ]
  }
}
```

---

## Exames

### Solicitar Exame

```http
POST /api/exam-requests
Content-Type: application/json
```

**Body:**

```json
{
  "patientId": "clp...",
  "consultationId": "clc...",
  "examTypeId": "cle...",
  "priority": "routine",
  "notes": "Jejum de 12h"
}
```

### Autocomplete de Exames

```http
GET /api/exams/autocomplete?q=hemograma
```

---

## IA/Assistente

### Análise de Sintomas

```http
POST /api/ai/analyze-symptoms
Content-Type: application/json
```

**Body:**

```json
{
  "symptoms": ["dor de cabeça", "febre", "tosse"],
  "patientAge": 35,
  "patientGender": "F"
}
```

**Resposta:**

```json
{
  "data": {
    "possibleConditions": [
      {
        "name": "Gripe",
        "probability": 0.75,
        "icd10": "J11"
      },
      {
        "name": "COVID-19",
        "probability": 0.60,
        "icd10": "U07.1"
      }
    ],
    "suggestedExams": ["Hemograma", "PCR COVID"],
    "redFlags": []
  }
}
```

### Interações Medicamentosas

```http
POST /api/ai/drug-interactions
Content-Type: application/json
```

### Sugestão de Tratamento

```http
POST /api/ai/suggest-treatment
Content-Type: application/json
```

**Body:**

```json
{
  "diagnosis": "J06.9",
  "patientId": "clp..."
}
```

### Transcrição de Áudio

```http
POST /api/ai/transcribe
Content-Type: multipart/form-data
```

**Form Data:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| audio | File | Arquivo de áudio (mp3, wav, webm) |
| language | string | Idioma (default: pt-BR) |

### Gerar SOAP

```http
POST /api/ai/soap/generate
Content-Type: application/json
```

**Body:**

```json
{
  "transcription": "Paciente refere dor de cabeça há 3 dias...",
  "patientId": "clp..."
}
```

**Resposta:**

```json
{
  "data": {
    "subjective": "Paciente refere cefaleia há 3 dias...",
    "objective": "PA: 120/80, FC: 72, Tax: 36.5°C...",
    "assessment": "Cefaleia tensional (G44.2)",
    "plan": "1. Dipirona 500mg SOS\n2. Retorno em 7 dias..."
  }
}
```

---

## Codificação (CID/CIAP/CBO)

### Buscar Códigos

```http
GET /api/coding/search?q=hipertensao&system=icd10
```

**Query Parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| q | string | Termo de busca |
| system | string | icd10, ciap2, cbo, tuss |
| chapter | string | Filtrar por capítulo |
| limit | number | Máximo de resultados |

### Autocomplete

```http
GET /api/coding/autocomplete?q=I10&system=icd10
```

### Sugestão por Texto

```http
POST /api/coding/suggest
Content-Type: application/json
```

**Body:**

```json
{
  "text": "Paciente hipertenso com diabetes tipo 2",
  "system": "icd10"
}
```

---

## Sistema

### Health Check

```http
GET /api/health
```

**Resposta:**

```json
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected",
  "ai": "available",
  "uptime": 86400
}
```

### Métricas

```http
GET /api/metrics
```

---

## Webhooks (Futuro)

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| patient.created | Novo paciente cadastrado |
| consultation.completed | Consulta finalizada |
| prescription.signed | Prescrição assinada |

### Formato do Payload

```json
{
  "event": "consultation.completed",
  "timestamp": "2024-11-27T15:30:00Z",
  "data": {
    "consultationId": "clc...",
    "patientId": "clp...",
    "doctorId": "clu..."
  }
}
```

---

## SDKs e Exemplos

### JavaScript/TypeScript

```typescript
import { HealthCareClient } from '@healthcare/sdk'

const client = new HealthCareClient({
  baseUrl: 'https://api.healthcare.com',
  apiKey: 'sua-api-key'
})

// Listar pacientes
const patients = await client.patients.list({ limit: 10 })

// Criar consulta
const consultation = await client.consultations.create({
  patientId: 'clp...',
  doctorId: 'clu...',
  scheduledAt: new Date('2024-11-28T14:00:00Z')
})
```

### cURL

```bash
# Listar pacientes
curl -X GET "https://api.healthcare.com/api/patients" \
  -H "Cookie: next-auth.session-token=..."

# Criar paciente
curl -X POST "https://api.healthcare.com/api/patients" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"name": "João Silva", "cpf": "123.456.789-00"}'
```

---

*Versão da API: 1.0.0 | Última atualização: Novembro 2025*
