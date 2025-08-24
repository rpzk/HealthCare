# 🔐 Sistema de Autenticação e Segurança - HealthCare

## Visão Geral

Este sistema implementa **autenticação robusta, validação de dados e auditoria** para a plataforma HealthCare, garantindo que apenas usuários autorizados acessem recursos sensíveis.

## 📋 Componentes Implementados

### 1. **Middleware de Autenticação** (`lib/auth-middleware.ts`)
- ✅ Validação de JWT do NextAuth
- ✅ Verificação de roles/permissões
- ✅ Logs de auditoria automáticos
- ✅ Tratamento de erros padronizado

### 2. **Higher-Order Function** (`lib/with-auth.ts`)
- ✅ `withAuth()` - Autenticação geral
- ✅ `withDoctorAuth()` - Apenas médicos e admins
- ✅ `withAdminAuth()` - Apenas administradores
- ✅ `validateRequestBody()` - Validação de dados

### 3. **Schemas de Validação** (`lib/validation-schemas.ts`)
- ✅ Validação com Zod para todos os modelos
- ✅ Mensagens de erro em português
- ✅ Validação de CPF, email, datas, etc.

### 4. **Sistema de Auditoria** (`lib/audit-logger.ts`)
- ✅ Log de todas as ações críticas
- ✅ Rastreamento por usuário
- ✅ Filtros por ação/recurso
- ✅ Preparado para produção

### 5. **Middleware Global** (`middleware.ts`)
- ✅ Proteção automática de rotas
- ✅ Verificação de roles
- ✅ Rate limiting básico
- ✅ Logs de acesso

## 🚀 Como Usar

### **Proteger uma Rota API**

```typescript
import { withAuth } from '@/lib/with-auth'
import { validateRequestBody } from '@/lib/with-auth'
import { validatePatient } from '@/lib/validation-schemas'

// Rota protegida para qualquer usuário autenticado
export const GET = withAuth(async (request, { user }) => {
  // user já está validado e contém: id, email, name, role
  return NextResponse.json({ message: \`Olá \${user.name}\` })
})

// Rota protegida apenas para médicos
export const POST = withDoctorAuth(async (request, { user }) => {
  // Validar dados de entrada
  const validation = await validateRequestBody(request, validatePatient)
  if (!validation.success) {
    return validation.response! // Retorna erro 400 com detalhes
  }

  const data = validation.data!
  // ... lógica da API
})

// Rota protegida apenas para admins
export const DELETE = withAdminAuth(async (request, { user }) => {
  // Apenas administradores podem deletar
})
```

### **Validação Manual**

```typescript
import { validatePatient, validateConsultation } from '@/lib/validation-schemas'

// Validar dados
const validation = validatePatient(dadosDoFormulario)
if (!validation.success) {
  console.error('Erros de validação:', validation.errors)
  return
}

// Usar dados válidos
const dadosLimpos = validation.data
```

### **Logs de Auditoria**

```typescript
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// Log de sucesso
auditLogger.logSuccess(
  user.id,
  user.email,
  user.role,
  AuditAction.PATIENT_CREATE,
  'patients',
  { patientId: newPatient.id }
)

// Log de erro
auditLogger.logError(
  user.id,
  user.email,
  user.role,
  AuditAction.PATIENT_CREATE,
  'patients',
  'CPF já existe no sistema'
)
```

## 🔒 Níveis de Segurança

### **1. Middleware Global**
- Todas as rotas (exceto `/auth/` e `/api/auth/`) exigem autenticação
- Verificação automática de JWT
- Logs de acesso

### **2. Middleware de API**
- Validação específica por rota
- Verificação de roles granular
- Validação de dados de entrada
- Auditoria automática

### **3. Validação de Dados**
- Schemas Zod rigorosos
- Sanitização automática
- Mensagens de erro claras
- Prevenção de injection

## 📊 Monitoramento

### **Logs Disponíveis**
```typescript
// Logs recentes
const recentLogs = auditLogger.getRecentLogs(100)

// Logs por usuário
const userLogs = auditLogger.getLogsByUser('user123', 50)

// Logs por ação
const loginAttempts = auditLogger.getLogsByAction(AuditAction.LOGIN_FAILED, 20)
```

### **Console de Desenvolvimento**
- 🔐 Acesso autorizado: `email (role) - METHOD /path`
- 🔍 AUDIT LOG: ações importantes são logadas
- ⚠️ Erros de validação são detalhados

## 🎯 **Rotas Refatoradas**

### ✅ **Implementadas**
- `/api/patients` - CREATE e READ protegidos
- `/api/consultations` - CREATE e READ protegidos

### 🔄 **Para Implementar**
- `/api/prescriptions`
- `/api/medical-records` 
- `/api/ai/*`
- `/api/notifications`

## 🚨 **Próximos Passos**

1. **Aplicar middleware em todas as APIs restantes**
2. **Implementar rate limiting com Redis**
3. **Configurar logs para produção (Sentry/DataDog)**
4. **Adicionar testes de segurança**
5. **Configurar backup de logs de auditoria**

---

## 🛡️ **Benefícios Implementados**

- ✅ **Segurança**: Apenas usuários autenticados acessam dados
- ✅ **Conformidade**: Logs de auditoria para compliance
- ✅ **Qualidade**: Validação rigorosa previne bugs
- ✅ **Transparência**: Rastreabilidade completa de ações
- ✅ **Escalabilidade**: Sistema preparado para produção
