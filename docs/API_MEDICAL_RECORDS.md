# Medical Records API Documentation

Endpoints completos para gerenciamento de prontuários médicos com RBAC, versionamento e auditoria integrada.

## Base URL

```
/api/medical-records
```

## Authentication

Todos os endpoints requerem autenticação via NextAuth (JWT).

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. List Medical Records (GET)

**Descrição**: Listar prontuários com filtros avançados e RBAC.

**URL**: `GET /api/medical-records`

**Query Parameters**:

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `search` | string | Busca em título, descrição, diagnóstico, tratamento e notas | `search=diabetes` |
| `type` | enum | Filtrar por tipo de registro | `type=CONSULTATION` |
| `priority` | enum | Filtrar por prioridade | `priority=HIGH` |
| `severity` | enum | Filtrar por severidade | `severity=MEDIUM` |
| `dateFrom` | ISO8601 | Data inicial (inclusive) | `dateFrom=2026-01-01T00:00:00Z` |
| `dateTo` | ISO8601 | Data final (inclusive) | `dateTo=2026-01-31T23:59:59Z` |
| `patientId` | cuid | Filtrar por paciente | `patientId=clx1abc...` |
| `doctorId` | cuid | Filtrar por médico | `doctorId=clx2def...` |
| `page` | number | Número da página (padrão: 1) | `page=1` |
| `limit` | number | Registros por página (1-100, padrão: 10) | `limit=20` |
| `sortBy` | enum | Campo para ordenação | `sortBy=createdAt` |
| `sortOrder` | enum | Direção da ordenação (asc/desc) | `sortOrder=desc` |

**Response (200)**:

```json
{
  "data": [
    {
      "id": "clx1abc123def456",
      "title": "Consulta de Acompanhamento",
      "description": "Paciente apresenta melhora nos sintomas...",
      "diagnosis": "Hipertensão Arterial",
      "treatment": "Enalapril 10mg 1x ao dia",
      "recordType": "CONSULTATION",
      "priority": "NORMAL",
      "severity": "MEDIUM",
      "patient": {
        "id": "clx3ghi789",
        "name": "João Silva",
        "email": "joao@example.com",
        "birthDate": "1980-05-15T00:00:00Z"
      },
      "doctor": {
        "id": "clx4jkl012",
        "name": "Dr. Carlos",
        "speciality": "Cardiologia"
      },
      "attachments": [
        {
          "id": "clx5mno345",
          "fileName": "ECG_20260119.pdf",
          "fileSize": 156234
        }
      ],
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-19T14:22:00Z",
      "version": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  },
  "filters": {
    "applied": {
      "type": "CONSULTATION",
      "priority": "NORMAL"
    },
    "available": {
      "types": ["CONSULTATION", "EXAM", "PROCEDURE", "PRESCRIPTION", "OTHER"],
      "priorities": ["LOW", "NORMAL", "HIGH", "CRITICAL"],
      "severities": ["LOW", "MEDIUM", "HIGH"]
    }
  }
}
```

**Erro (400)**:

```json
{
  "error": "Filtros inválidos",
  "details": [
    {
      "code": "invalid_enum_value",
      "path": ["type"],
      "message": "Invalid enum value"
    }
  ]
}
```

---

### 2. Create Medical Record (POST)

**Descrição**: Criar novo prontuário médico.

**URL**: `POST /api/medical-records`

**Request Body**:

```json
{
  "patientId": "clx3ghi789",
  "title": "Consulta de Rotina",
  "description": "Paciente compareceu para avaliação de rotina com queixa de fadiga.",
  "recordType": "CONSULTATION",
  "priority": "NORMAL",
  "diagnosis": "Anemia ferropriva",
  "treatment": "Sulfato ferroso 325mg 1x ao dia",
  "notes": "Solicitar hemograma completo para reavaliação"
}
```

**Response (201)**:

```json
{
  "id": "clx1abc123def456",
  "patientId": "clx3ghi789",
  "doctorId": "clx4jkl012",
  "title": "Consulta de Rotina",
  "description": "Paciente compareceu para avaliação de rotina com queixa de fadiga.",
  "recordType": "CONSULTATION",
  "priority": "NORMAL",
  "diagnosis": "Anemia ferropriva",
  "treatment": "Sulfato ferroso 325mg 1x ao dia",
  "notes": "Solicitar hemograma completo para reavaliação",
  "version": 1,
  "createdAt": "2026-01-19T15:00:00Z",
  "updatedAt": "2026-01-19T15:00:00Z",
  "patient": {
    "id": "clx3ghi789",
    "name": "João Silva"
  },
  "doctor": {
    "id": "clx4jkl012",
    "name": "Dr. Carlos"
  }
}
```

**Erro (400)**:

```json
{
  "error": "Dados inválidos: title: Título mínimo 3 caracteres; description: Descrição mínima 10 caracteres"
}
```

**Erro (429)**:

```json
{
  "error": "Taxa de requisições excedida. Tente novamente mais tarde."
}
```

---

### 3. Get Medical Record by ID (GET)

**Descrição**: Buscar prontuário específico (com RBAC).

**URL**: `GET /api/medical-records/:id`

**Path Parameters**:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | cuid | ID do prontuário |

**Response (200)**:

```json
{
  "data": {
    "id": "clx1abc123def456",
    "title": "Consulta de Acompanhamento",
    "description": "...",
    "recordType": "CONSULTATION",
    "priority": "NORMAL",
    "patient": { "id": "clx3ghi789", "name": "João Silva", "email": "joao@example.com" },
    "doctor": { "id": "clx4jkl012", "name": "Dr. Carlos", "speciality": "Cardiologia" },
    "attachments": [],
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-19T14:22:00Z"
  },
  "meta": {
    "version": 2,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-19T14:22:00Z"
  }
}
```

**Erro (403)**:

```json
{
  "error": "Acesso negado: sem permissão para visualizar este prontuário"
}
```

**Erro (404)**:

```json
{
  "error": "Prontuário não encontrado"
}
```

---

### 4. Update Medical Record (PATCH)

**Descrição**: Atualizar prontuário existente (com versionamento).

**URL**: `PATCH /api/medical-records/:id`

**Request Body** (todos os campos opcionais):

```json
{
  "title": "Consulta de Seguimento",
  "diagnosis": "Hipertensão Controlada",
  "priority": "LOW",
  "notes": "Paciente respondendo bem ao tratamento"
}
```

**Response (200)**:

```json
{
  "data": {
    "id": "clx1abc123def456",
    "title": "Consulta de Seguimento",
    "diagnosis": "Hipertensão Controlada",
    "priority": "LOW",
    "notes": "Paciente respondendo bem ao tratamento",
    "version": 3,
    "updatedAt": "2026-01-19T16:00:00Z"
  },
  "meta": {
    "version": 3,
    "updatedAt": "2026-01-19T16:00:00Z"
  }
}
```

**Erro (403)**:

```json
{
  "error": "Apenas o criador pode atualizar este prontuário"
}
```

---

### 5. Delete Medical Record (DELETE)

**Descrição**: Deletar prontuário (soft delete, apenas admin).

**URL**: `DELETE /api/medical-records/:id`

**Response (200)**:

```json
{
  "message": "Prontuário deletado com sucesso",
  "data": {
    "id": "clx1abc123def456",
    "deletedAt": "2026-01-19T16:15:00Z"
  }
}
```

**Erro (403)**:

```json
{
  "error": "Apenas o criador pode deletar este prontuário"
}
```

---

### 6. List Attachments (GET)

**Descrição**: Listar anexos do prontuário.

**URL**: `GET /api/medical-records/:id/attachments`

**Response (200)**:

```json
{
  "data": [
    {
      "id": "clx5mno345",
      "fileName": "ECG_20260119.pdf",
      "fileSize": 156234,
      "mimeType": "application/pdf",
      "description": "Eletrocardiograma de repouso",
      "createdAt": "2026-01-19T14:00:00Z",
      "createdBy": {
        "id": "clx4jkl012",
        "name": "Dr. Carlos",
        "email": "carlos@hospital.com"
      }
    }
  ],
  "meta": {
    "count": 1
  }
}
```

---

### 7. Upload Attachment (POST)

**Descrição**: Fazer upload de anexo (PDF, imagens, documentos).

**URL**: `POST /api/medical-records/:id/attachments`

**Content-Type**: `multipart/form-data`

**Form Fields**:

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|------------|
| `file` | File | Arquivo (max 50MB) | ✓ |
| `description` | string | Descrição do anexo | - |

**Tipos Permitidos**:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/tiff`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Response (201)**:

```json
{
  "data": {
    "id": "clx5mno345",
    "fileName": "ECG_20260119.pdf",
    "fileSize": 156234,
    "mimeType": "application/pdf",
    "description": "Eletrocardiograma de repouso",
    "createdAt": "2026-01-19T14:00:00Z",
    "createdBy": {
      "id": "clx4jkl012",
      "name": "Dr. Carlos"
    }
  },
  "message": "Arquivo enviado com sucesso"
}
```

**Erro (413)**:

```json
{
  "error": "Arquivo muito grande. Máximo: 50MB"
}
```

**Erro (415)**:

```json
{
  "error": "Tipo de arquivo não permitido"
}
```

---

### 8. Delete Attachment (DELETE)

**Descrição**: Remover anexo (apenas criador ou admin).

**URL**: `DELETE /api/medical-records/:id/attachments/:attachmentId`

**Response (200)**:

```json
{
  "message": "Anexo removido com sucesso",
  "data": {
    "id": "clx5mno345"
  }
}
```

---

## RBAC (Role-Based Access Control)

### Permissões por Papel

| Ação | ADMIN | DOCTOR | PATIENT |
|------|-------|--------|---------|
| Listar Próprios | ✓ | ✓ | ✓ |
| Listar Todos | ✓ | - | - |
| Listar Pacientes Atribuídos | ✓ | ✓ | - |
| Criar Prontuário | ✓ | ✓ | - |
| Ver Detalhes | ✓ | ✓* | ✓* |
| Atualizar | ✓ | ✓ (próprio) | - |
| Deletar | ✓ | - | - |
| Upload Anexo | ✓ | ✓ | ✓ (próprio) |

*Apenas próprios registros ou vinculados

---

## Versionamento

Cada atualização incrementa o campo `version`. Útil para:

- Rastrear mudanças
- Implementar otimistic locking
- Auditoria de histórico

---

## Auditoria

Todas as operações (READ, CREATE, UPDATE, DELETE) são registradas com:

- User ID
- User Role
- Action tipo
- IP Address
- User Agent
- Timestamp
- Mudanças realizadas (para UPDATE)

---

## Rate Limiting

- **CREATE**: 10/min por usuário
- **UPDATE**: 20/min por usuário
- **DELETE**: 5/min por usuário
- **READ**: Sem limite

Resposta ao atingir limite:

```json
{
  "error": "Taxa de requisições excedida. Tente novamente mais tarde."
}
```

Header: `Retry-After: 60`

---

## Exemplo de Uso (cURL)

### Criar prontuário

```bash
curl -X POST http://localhost:3000/api/medical-records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "clx3ghi789",
    "title": "Consulta de Rotina",
    "description": "Avaliação inicial com história de fadiga",
    "recordType": "CONSULTATION",
    "priority": "NORMAL"
  }'
```

### Buscar com filtros

```bash
curl -X GET "http://localhost:3000/api/medical-records?type=CONSULTATION&priority=HIGH&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Fazer upload de anexo

```bash
curl -X POST http://localhost:3000/api/medical-records/clx1abc123def456/attachments \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf" \
  -F "description=Documento importante"
```

---

## Status Codes

| Código | Significado |
|--------|-----------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 413 | Payload Too Large - Arquivo muito grande |
| 415 | Unsupported Media Type - Tipo não permitido |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

