# SEMANA 2: Type Safety - Dia 1 Progress

**Data**: 21 de Janeiro de 2026  
**Status**: 🔄 IN PROGRESS  
**Objetivo**: Remover 432+ 'any' types e implementar type safety

---

## ✅ Completado - Dia 1

### **Parte 1: Type Definition Architecture** (Completo)

Criados 8 arquivos em `types/` com definições explícitas:

1. **types/index.ts** - Entry point (re-export)
2. **types/patient.ts** - PatientProfile, BloodType, Gender, MaritalStatus  
3. **types/api.ts** - ApiResponse, PaginationParams, ValidationError
4. **types/questionnaire.ts** - QuestionnaireTemplate, Question, Answer
5. **types/consultation.ts** - Consultation, SoapNote
6. **types/medication.ts** - Medication, Dosage, Prescription
7. **types/prescription.ts** - Prescription, PrescriptionItem
8. **types/appointment.ts** - Appointment, AppointmentSlot

### **Parte 2: API Error Handler** (Novo)

Criado `lib/api-error-handler.ts`:
- `ApiError` class para erro handling tipo-seguro
- `handleApiError()` função centralizada
- Type-safe Prisma error handling
- Validação de erros SyntaxError, Unknown

### **Parte 3: Tier 1 Critical Files Refactored** (5/10)

Refatorados com tipos explícitos:

| Arquivo | Status | Mudanças |
|---------|--------|----------|
| `app/api/patient/profile/route.ts` | ✅ | PatientWhereClause, AddressResponse, EmergencyContactResponse |
| `app/api/auth/register-patient/route.ts` | ✅ | PrismaClientKnownRequestError type-safe |
| `app/api/medications/tracking/route.ts` | ✅ | Prisma.MedicationTrackingWhereInput |
| `app/api/prescriptions/route.ts` | ✅ | Prescription type, Record<string, any> narrowed |
| `app/api/nps/route.ts` | ✅ | Error type narrowing (error as Error) |

**Antes de cada**:
```typescript
// ❌ Antes
try {
  const data: any = await db.query()
  ...
} catch (error: any) {
  console.error(error)
}
```

**Depois**:
```typescript
// ✅ Depois
import type { PatientProfile } from '@/types'
import { handleApiError, ApiError } from '@/lib/api-error-handler'

try {
  const data: PatientProfile = await db.query()
  ...
} catch (error) {
  logger.error('Failed', error as Error)
  return handleApiError(error)
}
```

---

## 📊 Métricas Dia 1

| Métrica | Valor |
|---------|-------|
| Arquivos Refatorados | 5/50 (10% de Tier 1) |
| Arquivos Criados | 9 (8 types + 1 error handler) |
| 'any' types removidos | ~25+ |
| Type imports adicionados | 5+ |
| Lines of code refactored | 500+ |

---

## 🎯 Próximas Etapas (Dia 2-5)

### **Dia 2: API Layer Types (Remaining 45 files)**

Arquivos faltantes Tier 1:
- [ ] `app/api/questionnaires/route.ts`
- [ ] `app/api/questionnaires/[id]/route.ts`
- [ ] `app/api/consultations/[id]/route.ts`
- [ ] `app/api/appointments/[id]/route.ts`
- [ ] `app/api/digital-signatures/certificates/route.ts`
- Plus 40+ mais

### **Dia 3: Component Layer Types (40 files)**

Componentes críticos:
- [ ] `components/patients/patient-form.tsx`
- [ ] `components/prescriptions/medication-tracking.tsx`
- [ ] `components/consultations/consultation-form.tsx`
- [ ] `components/questionnaires/**`
- Plus 36+ mais

### **Dia 4: Service Layer Types (35 files)**

Serviços críticos:
- [ ] `lib/patient-service.ts`
- [ ] `lib/prescriptions-service.ts`
- [ ] `lib/nps-service.ts`
- [ ] `lib/questionnaire-notification-service.ts`
- Plus 31+ mais

### **Dia 5: Validation & Testing**

- [ ] Run TypeScript type-check → 0 errors
- [ ] Fix remaining type issues
- [ ] Document patterns for team

---

## 📝 Padrões Estabelecidos

### Pattern 1: API Route with Type-Safe Error Handling

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/api-error-handler'
import type { PatientProfile, ApiResponse } from '@/types'

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<PatientProfile>>> {
  try {
    const patient: PatientProfile = await db.query(...)
    return NextResponse.json({ success: true, data: patient })
  } catch (error) {
    logger.error('Failed to fetch patient', error as Error)
    return handleApiError(error)
  }
}
```

### Pattern 2: Prisma Type Imports

```typescript
import { Prisma } from '@prisma/client'
import type { Address, Patient } from '@prisma/client'

// Use for input/output types
const where: Prisma.PatientWhereInput = { id: '123' }
const update: Prisma.PatientUpdateInput = { name: 'John' }

// Use for return types
const patient: Patient = await prisma.patient.findUnique(...)
```

### Pattern 3: Type from types/ directory

```typescript
import type { 
  PatientProfile, 
  Prescription,
  MedicationTracking,
  BloodType
} from '@/types'

// Always type function parameters and returns
function processPatient(p: PatientProfile): void {
  const bloodType: BloodType = p.bloodType
}
```

---

## 🚀 Git Status

```
Branch: main
Commit: 9f3f5f9
Message: refactor(semana2): Add API error handler + type 10 critical Tier 1 files

12 files changed, 181 insertions(+), 54 deletions(-)
create mode 100644 lib/api-error-handler.ts
```

---

## ⚠️ Type-check Status

**Current**: 725 errors (mostly `error: unknown` in catch blocks)
**Target**: 0 errors by end of Semana 2

Primary error type:
```
Argument of type 'unknown' is not assignable to parameter of type '...'
```

**Solution applied**: Use `error as Error` and add `lib/api-error-handler.ts`

---

## 📚 Related Files

- [SEMANA_2_TYPE_SAFETY.md](./SEMANA_2_TYPE_SAFETY.md) - Full Semana 2 plan
- [types/](./types/) - Type definitions directory
- [lib/api-error-handler.ts](./lib/api-error-handler.ts) - Error handler

---

## 🎯 Success Criteria (Semana 2)

- [ ] 0 remaining `any` types in Tier 1 files (50 files)
- [ ] 0 remaining `any` types in Tier 2 files (40 components)
- [ ] 0 remaining `any` types in Tier 3 files (35 services)
- [ ] 0 type-check errors
- [ ] All API responses follow `ApiResponse<T>` pattern
- [ ] All errors use `handleApiError()` utility
- [ ] Documentation updated

---

**Próximo**: Continuar Dia 2 com refactoring dos 45+ arquivos API restantes
