# SEMANA 2: Type Safety & TypeScript Strict Mode

**Status**: ✅ Iniciada  
**Objetivo**: Remover 432+ ocorrências de 'any' type e ativar TypeScript strict mode  
**Duração**: 50 horas (5 dias de 10h)  
**Prioridade**: 🔴 CRÍTICA

---

## 📊 Baseline

- **Total 'any' types**: 432+ ocorrências
- **Arquivos impactados**: 120+ arquivos
- **Teste coverage**: 0%
- **Type errors**: Não medidos (será medido após)

---

## 🎯 Deliverables Semana 2

### **Dia 1: Type Definition Architecture** (8h)
- ✅ Criar estrutura de tipos em `types/` (já feito)
  - `types/patient.ts` - Patient, BloodType, Gender, MaritalStatus
  - `types/api.ts` - ApiResponse, PaginationParams, ValidationError
  - `types/questionnaire.ts` - Questionnaire, Question, Answer
  - `types/consultation.ts` - Consultation, SoapNote, Vitals
  - `types/medication.ts` - Medication, Prescription, Dosage
  - `types/prescription.ts` - Prescription, PrescriptionItem
  - `types/appointment.ts` - Appointment, AppointmentSlot
- [ ] Revisar e estender tipos principais
- [ ] Documentar padrões de tipo para novos código
- [ ] Criar guidelines de type safety

**Checklist**:
- [ ] Todos os tipos estão exportados de `types/index.ts`
- [ ] Tipos são imutáveis (readonly propriedades)
- [ ] Enums para valores fixos (BloodType, Gender, Status)

---

### **Dia 2: API Layer Types** (10h)
Refatorar arquivos API (`app/api/**`) para remover 'any'

**Priority Files** (50 files):
1. `app/api/patient/profile/route.ts` - PatientProfile, validateBloodType
2. `app/api/auth/register-patient/route.ts` - PatientCreateData
3. `app/api/medications/tracking/route.ts` - MedicationTracking, TrackingResponse
4. `app/api/prescriptions/route.ts` - Prescription[], PrescriptionCreate
5. `app/api/nps/route.ts` - NpsResponse, NpsScore
6. `app/api/questionnaires/route.ts` - QuestionnaireTemplate[]
7. `app/api/consultations/route.ts` - Consultation, ConsultationCreate
8. `app/api/appointments/route.ts` - Appointment[]
9. `app/api/digital-signatures/certificates/route.ts` - Certificate[]
10. Plus 40 mais critical routes

**Pattern**:
```typescript
// Before
export async function GET(req: NextRequest) {
  const data: any = await db.query()
  return NextResponse.json(data)
}

// After
import type { Medication } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<Medication[]>>> {
  const data: Medication[] = await db.query()
  return NextResponse.json({ success: true, data })
}
```

---

### **Dia 3: Component Layer Types** (10h)
Refatorar componentes React (`components/**`) para remover 'any'

**Priority Files** (40 files):
- `components/patients/patient-form.tsx` - PatientUpdateData, BloodType
- `components/prescriptions/medication-tracking.tsx` - MedicationTracking
- `components/consultations/consultation-form.tsx` - ConsultationCreate
- `components/questionnaires/questionnaire-analytics-dashboard.tsx` - QuestionnaireResponse
- `components/admin/*.tsx` - Admin component types
- Plus 35 mais

**Pattern**:
```typescript
// Before
interface Props {
  patient: any
  onUpdate: (data: any) => void
}

// After
import type { PatientProfile, PatientUpdateData } from '@/types'

interface Props {
  patient: PatientProfile
  onUpdate: (data: PatientUpdateData) => void
}
```

---

### **Dia 4: Service Layer Types** (10h)
Refatorar serviços (`lib/**-service.ts`) para remover 'any'

**Priority Files** (35 files):
- `lib/patient-service.ts` - PatientService<PatientProfile, PatientUpdateData>
- `lib/nps-service.ts` - NpsService<NpsResponse>
- `lib/prescriptions-service.ts` - PrescriptionsService<Prescription>
- `lib/questionnaire-notification-service.ts`
- Plus 31 mais

**Pattern**:
```typescript
// Before
export class PatientService {
  async getProfile(id: string): Promise<any> {}
  async updateProfile(id: string, data: any): Promise<any> {}
}

// After
export class PatientService {
  async getProfile(id: string): Promise<PatientProfile | null> {}
  async updateProfile(id: string, data: PatientUpdateData): Promise<PatientProfile> {}
}
```

---

### **Dia 5: Validation & Testing** (12h)
- [ ] Run TypeScript type-check → 0 errors
- [ ] Fix remaining 'any' types
- [ ] Create type-safe middleware helpers
- [ ] Document type patterns for team
- [ ] Unit tests for critical types

**Validation Checklist**:
- [ ] `npm run type-check` passes with 0 errors
- [ ] No remaining `any` types in priority files
- [ ] All exports typed in `types/index.ts`
- [ ] API responses follow `ApiResponse<T>` pattern
- [ ] All React props interfaces defined

---

## 🔧 Refactoring Patterns

### Pattern 1: API Route Typing
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types/api'
import { PatientProfile } from '@/types/patient'

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<PatientProfile>>> {
  try {
    const id = searchParams.get('id')
    const patient: PatientProfile = await db.query(id)
    return NextResponse.json({ success: true, data: patient })
  } catch (error) {
    logger.error('Failed to get patient', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Pattern 2: React Component Typing
```typescript
import { FC } from 'react'
import type { PatientProfile, PatientUpdateData } from '@/types'

interface PatientFormProps {
  patient: PatientProfile
  onSave: (data: PatientUpdateData) => Promise<void>
  isLoading?: boolean
}

export const PatientForm: FC<PatientFormProps> = ({
  patient,
  onSave,
  isLoading = false
}) => {
  // implementation
}
```

### Pattern 3: Service Typing
```typescript
import type { PatientProfile, PatientCreateData, PatientUpdateData } from '@/types'

export class PatientService {
  async getById(id: string): Promise<PatientProfile | null> {
    return await prisma.patient.findUnique({ where: { id } })
  }

  async create(data: PatientCreateData): Promise<PatientProfile> {
    return await prisma.patient.create({ data })
  }

  async update(id: string, data: PatientUpdateData): Promise<PatientProfile> {
    return await prisma.patient.update({ where: { id }, data })
  }
}
```

---

## 📈 Success Metrics

| Métrica | Antes | Depois |
|---------|-------|--------|
| Arquivos com 'any' | 120+ | <5 (exceptions only) |
| Ocorrências 'any' | 432+ | <10 |
| Type errors | N/A | 0 |
| TypeScript strict | Partially | ✅ Enabled |
| IDE autocomplete | 40% | 95%+ |
| Developer experience | Fraco | Excelente |

---

## 🚀 Implementation Strategy

### Batch Processing (Automático)
```python
# Script refactora 'any' → explicit types
for file in priority_files:
    1. Identify all 'any' occurrences
    2. Suggest type replacement (from types/)
    3. Update import statements
    4. Validate with TypeScript
```

### Manual Review (QA)
1. Run type-check
2. Review remaining errors
3. Create custom types if needed
4. Document patterns

### Testing
- Unit tests for services
- Integration tests for API routes
- E2E tests for critical flows

---

## 📋 Files to Refactor (Priority Order)

### **Tier 1: Critical (10h)**
- [ ] app/api/patient/profile/route.ts
- [ ] app/api/auth/register-patient/route.ts
- [ ] app/api/medications/tracking/route.ts
- [ ] app/api/prescriptions/route.ts
- [ ] app/api/nps/route.ts
- [ ] lib/patient-service.ts
- [ ] lib/auth.ts
- [ ] components/patients/patient-form.tsx
- [ ] components/consultations/consultation-form.tsx
- [ ] lib/validation-schemas.ts

### **Tier 2: High (20h)**
- [ ] All questionnaire routes & components (8 files)
- [ ] All prescription routes & services (6 files)
- [ ] All consultation routes (5 files)
- [ ] Medication tracking components (3 files)
- [ ] NPS dashboard & service (2 files)
- [ ] Plus 5 mais

### **Tier 3: Medium (20h)**
- [ ] 40+ remaining API routes
- [ ] 20 component files
- [ ] 10 service files

---

## ⚙️ Technical Setup

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### IDE Configuration
Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

---

## 📚 Documentation Needed

- [ ] Type Safety Guidelines (TIPO_SAFETY_GUIDE.md)
- [ ] API Response Pattern (API_RESPONSE_PATTERN.md)
- [ ] Component Props Pattern (COMPONENT_PROPS_PATTERN.md)
- [ ] Service Class Pattern (SERVICE_CLASS_PATTERN.md)

---

## 🎯 Definition of Done

- ✅ 0 'any' types in all priority files
- ✅ `npm run type-check` passes with 0 errors
- ✅ All types exported from `types/index.ts`
- ✅ API responses follow ApiResponse<T> pattern
- ✅ Component props properly typed with interfaces
- ✅ Services use generics for type safety
- ✅ Documentation updated
- ✅ Team trained on patterns

---

## 📅 Timeline

| Dia | Tarefa | Horas | Status |
|-----|--------|-------|--------|
| 1 | Type Definition Architecture | 8h | 🔄 In Progress |
| 2 | API Layer Types (50 files) | 10h | ⏳ Pending |
| 3 | Component Layer Types (40) | 10h | ⏳ Pending |
| 4 | Service Layer Types (35) | 10h | ⏳ Pending |
| 5 | Validation & Testing | 12h | ⏳ Pending |
| | **TOTAL** | **50h** | **🎯 Week 2** |

---

## 🔗 Related Documents

- [SEMANA 1 COMPLETE](./SEMANA_1_LOGGER_COMPLETE.md) - Logger infrastructure
- [COMPLETE_CODE_AUDIT.md](./COMPLETE_CODE_AUDIT.md) - 8 critical problems found
- [SANITIZATION_PLAN_EXECUTIVE.md](./SANITIZATION_PLAN_EXECUTIVE.md) - 4-week plan
