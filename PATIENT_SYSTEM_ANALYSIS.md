# Análise Completa do Sistema de Cadastro de Pacientes

## 🔍 Problemas Identificados

### 1. **Múltiplos Fluxos de Cadastro Inconsistentes**

#### Fluxos de Criação de Paciente:
- `/api/patients` POST - Criação via API administrativa
- `/auth/register` - Auto-cadastro de paciente
- `/patients/invite` - Sistema de convites
- `/profile/become-patient` - Transformar usuário existente em paciente
- `/patients/new` - Formulário administrativo

**Problema**: Cada fluxo tem validações diferentes e não compartilham o mesmo schema.

### 2. **Inconsistências nos Schemas de Validação**

#### Schemas Encontrados:
1. **`lib/validation-schemas.ts`** - `patientSchema`
   - Requer CPF formatado: `^\d{3}\.\d{3}\.\d{3}-\d{2}$`
   - `birthDate`: aceita string OU Date
   - `bloodType`: enum com valores tipo `A_POSITIVE`
   - `allergies`: array de strings

2. **`app/api/patients/[id]/route.ts`** - `updatePatientSchema`
   - CPF formatado: `^\d{3}\.\d{3}\.\d{3}-\d{2}$`
   - `birthDate`: string transformada para Date
   - `bloodType`: string nullable (sem enum!)
   - `allergies`: string nullable (não array!)

3. **`app/api/patient/profile/route.ts`** - `updateSchema`
   - `bloodType`: enum `['A+','A-','B+','B-','AB+','AB-','O+','O-']`
   - `allergies`: array de strings
   - `cpf`: string min(11) max(14)

**CONFLITO CRÍTICO**: Três formatos diferentes para os mesmos campos!

### 3. **Problemas com Data de Nascimento**

```typescript
// Em patient-form.tsx
birthDate: getBirthDateString(patient?.birthDate) // retorna yyyy-mm-dd

// Em updatePatientSchema
birthDate: z.string().transform((val) => {
  const date = new Date(val)
  if (isNaN(date.getTime())) throw new Error("Data de nascimento inválida")
  return date
}).optional()

// No Prisma schema
birthDate: DateTime  // NOT NULL
```

**Problema**: 
- Frontend envia string `yyyy-mm-dd`
- Backend espera transformar para Date
- Prisma não aceita null mas schema diz `.optional()`
- Timezone pode causar off-by-one day

### 4. **Problemas com Tipo Sanguíneo**

```typescript
// Prisma schema.prisma
bloodType: String?  // Campo texto livre

// Enum existe mas não é usado:
enum BloodType {
  A_POSITIVE
  A_NEGATIVE
  B_POSITIVE
  B_NEGATIVE
  AB_POSITIVE
  AB_NEGATIVE
  O_POSITIVE
  O_NEGATIVE
}

// Frontend usa formato curto
'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'

// Nenhuma conversão acontece!
```

**Problema**: Dados salvos podem ser `"A+"`, `"A_POSITIVE"`, `null`, ou qualquer string.

### 5. **Campos Criptografados vs Não-Criptografados**

| Campo | Criptografado? | Hash? | Observação |
|-------|----------------|-------|------------|
| `cpf` | ✅ Sim | ✅ `cpfHash` | Correto |
| `allergies` | ✅ Sim | ❌ Não | Inconsistente - às vezes string, às vezes array |
| `medicalHistory` | ✅ Sim | ❌ Não | OK |
| `currentMedications` | ✅ Sim | ❌ Não | OK |
| `bloodType` | ❌ Não | ❌ Não | Deveria ser enum |
| `emergencyContact` | ❌ Não | ❌ Não | Deveria ser criptografado? |

### 6. **Problemas de Permissões por Role**

#### Admin:
- ✅ Pode criar pacientes
- ❌ **NÃO pode editar todos os campos** (masking esconde dados)
- ❌ Formulário de edição não carrega `allergies` descriptografadas

#### Doctor:
- ✅ Pode ver pacientes da equipe
- ❌ **Dados clínicos mascarados** (allergies/bloodType/medications)
- ✅ Agora expõe campos clínicos (após nosso fix)

#### Patient:
- ✅ Pode editar próprio perfil via `/api/patient/profile`
- ❌ **Endpoint diferente** do usado por admin
- ❌ Campos permitidos são diferentes

### 7. **Problemas no PatientService**

```typescript
// getPatients() retorna lista
allergies: decrypt(patient.allergies as string | null),  // Retorna string
bloodType: patient.bloodType,  // Adicionamos agora

// getPatientById() retorna detalhe
allergies: decrypt(patient.allergies as string | null),  // Retorna string

// createPatient() recebe
allergies: data.allergies ? encrypt(data.allergies) : undefined,  // Espera string!

// Mas validation-schemas.ts diz:
allergies: z.array(z.string()).optional()  // Array!
```

### 8. **Masking Oculta Dados do Admin**

```typescript
// lib/masking.ts
export function applyPatientMasking(patient: PatientData, opts: MaskOptions = {}) {
  return {
    ...patient,
    cpf: maskCpf ? maskCPF(patient.cpf) : patient.cpf,
    medicalHistory: exposeClinical ? patient.medicalHistory : undefined,  // ❌ Admin perde acesso
    allergies: exposeClinical ? patient.allergies : undefined,
    currentMedications: exposeClinical ? patient.currentMedications : undefined
  }
}
```

**Problema**: Admin precisa ver TODOS os dados para auditar/corrigir.

### 9. **Endereços Duplicados**

```typescript
// No modelo Patient:
address: String?  // Texto livre
addresses: Address[]  // Relação com tabela Address

// No código:
// Às vezes usa patient.address (string)
// Às vezes usa patient.addresses[0] (relação)
// Às vezes ambos ficam dessinc!
```

---

## 🎯 Plano de Reestruturação

### Fase 1: Unificação de Schemas (CRÍTICO)

#### 1.1 Criar Schema Canônico Único
```typescript
// lib/patient-schemas.ts (NOVO)

export const bloodTypeEnum = z.enum([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
])

export const patientBaseSchema = z.object({
  name: z.string().min(2).max(100),
  cpf: z.string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos')
    .or(z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')),
  email: z.string().email().nullable(),
  phone: z.string().max(20).nullable(),
  birthDate: z.coerce.date(),  // ✅ Aceita string e converte
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodType: bloodTypeEnum.nullable(),
  allergies: z.array(z.string()).default([]),  // ✅ SEMPRE array
})

export const patientCreateSchema = patientBaseSchema.extend({
  emergencyContact: z.string().nullable(),
  address: z.string().nullable(),
})

export const patientUpdateSchema = patientBaseSchema.partial()
```

#### 1.2 Normalizar Allergies para SEMPRE ser Array
```typescript
// Criar migração para converter dados existentes
// De: allergies: "penicilina, dipirona"
// Para: allergies: ["penicilina", "dipirona"]
```

#### 1.3 Normalizar Blood Type
```typescript
// Criar função de conversão:
function normalizeBloodType(value: string | null): string | null {
  if (!value) return null
  // "A_POSITIVE" → "A+"
  // "A+" → "A+"
  // "a+" → "A+"
  const map: Record<string, string> = {
    'A_POSITIVE': 'A+', 'A_NEGATIVE': 'A-',
    'B_POSITIVE': 'B+', 'B_NEGATIVE': 'B-',
    'AB_POSITIVE': 'AB+', 'AB_NEGATIVE': 'AB-',
    'O_POSITIVE': 'O+', 'O_NEGATIVE': 'O-'
  }
  return map[value.toUpperCase().replace(/\s/g, '_')] || value.toUpperCase()
}
```

### Fase 2: Unificação de Endpoints

#### 2.1 Consolidar Lógica de Update
```typescript
// Usar o MESMO endpoint para:
// - Admin editando paciente
// - Paciente editando próprio perfil
// - Doctor atualizando dados clínicos

// app/api/patients/[id]/route.ts
export const PUT = withRbac('patient.write', async (req, { params, user }) => {
  // 1. Validar acesso (já existe)
  // 2. Validar com schema ÚNICO
  const validated = patientUpdateSchema.parse(data)
  
  // 3. Converter formato se necessário
  if (validated.allergies) {
    validated.allergies = Array.isArray(validated.allergies) 
      ? validated.allergies 
      : validated.allergies.split(',').map(s => s.trim())
  }
  
  // 4. Atualizar
  await PatientService.updatePatient(params.id, validated)
  
  // 5. Retornar SEM masking se for admin/doctor/self
  const shouldMask = user.role !== 'ADMIN' && user.id !== patient.userId
  return NextResponse.json(
    shouldMask ? applyPatientMasking(patient) : patient
  )
})
```

#### 2.2 Deprecar `/api/patient/profile` (Singular)
- Redirecionar para `/api/patients/{userId}`
- Ou manter apenas como alias

### Fase 3: Corrigir PatientService

#### 3.1 Sempre Retornar Dados Consistentes
```typescript
static async getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } })
  
  return {
    ...patient,
    cpf: decrypt(patient.cpf),
    allergies: this.parseAllergies(decrypt(patient.allergies)),  // ✅ SEMPRE array
    bloodType: normalizeBloodType(patient.bloodType),
    medicalHistory: decrypt(patient.medicalHistory),
    currentMedications: this.parseMedications(decrypt(patient.currentMedications)),
  }
}

private static parseAllergies(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
}
```

### Fase 4: Ajustar Masking por Role

```typescript
// lib/masking.ts
export function maskPatientForRole(patient: Patient, userRole: string, isSelf: boolean) {
  if (userRole === 'ADMIN' || isSelf) {
    return patient  // ✅ Admin e próprio paciente veem TUDO
  }
  
  const clinicalRoles = ['DOCTOR', 'NURSE', ...etc]
  if (clinicalRoles.includes(userRole)) {
    return {
      ...patient,
      cpf: maskCPF(patient.cpf),  // Mascara CPF mas mantém clínica
      email: maskEmail(patient.email),
    }
  }
  
  // Receptionist, etc: mascarar tudo
  return applyPatientMasking(patient, { exposeClinical: false })
}
```

### Fase 5: Corrigir Formulários

#### 5.1 PatientForm.tsx
```typescript
// ✅ Usar schema unificado
// ✅ Sempre enviar allergies como array
// ✅ Normalizar bloodType antes de enviar
// ✅ Converter birthDate para ISO string
```

#### 5.2 Perfil do Paciente
```typescript
// ✅ Usar MESMO endpoint que admin
// ✅ Aplicar mesmas validações
```

### Fase 6: Migração de Dados

```sql
-- 1. Converter allergies de string para JSON array
UPDATE patients 
SET allergies = json_array(allergies) 
WHERE allergies IS NOT NULL 
  AND allergies NOT LIKE '[%';

-- 2. Normalizar blood types
UPDATE patients SET bloodType = 'A+' WHERE bloodType IN ('A_POSITIVE', 'a+', 'A +');
UPDATE patients SET bloodType = 'A-' WHERE bloodType IN ('A_NEGATIVE', 'a-', 'A -');
-- ... etc

-- 3. Corrigir datas de nascimento inválidas
-- (Verificar casos onde birthDate está null ou inválida)
```

---

## ✅ Checklist de Implementação

### Crítico (Fazer AGORA):
- [ ] Criar `lib/patient-schemas.ts` com schema unificado
- [ ] Atualizar `PatientService` para sempre retornar dados consistentes
- [ ] Remover masking para ADMIN
- [ ] Corrigir `bloodType` para usar enum consistente
- [ ] Converter `allergies` para sempre ser array

### Importante (Fazer em seguida):
- [ ] Consolidar endpoints de update
- [ ] Atualizar todos os formulários para usar schema único
- [ ] Migração de dados existentes
- [ ] Adicionar testes para validações

### Melhorias (Fazer depois):
- [ ] Documentar fluxos de cadastro
- [ ] Criar auditoria de alterações
- [ ] Interface de correção em massa para admin
- [ ] Relatório de inconsistências

---

## 🚨 Riscos

1. **Migração de dados**: Pode quebrar dados existentes se não for feita com cuidado
2. **Breaking changes**: Clientes da API podem estar esperando formatos antigos
3. **Timezone em birthDate**: Cuidado com conversão de datas
4. **Masking**: Mudar pode expor dados sensíveis inadvertidamente

---

## 📋 Próximos Passos Recomendados

1. **AGORA**: Criar schema unificado e aplicar em endpoints principais
2. **HOJE**: Corrigir masking para admin
3. **Esta semana**: Migração de dados + testes
4. **Próxima semana**: Refatorar formulários

---

## 💡 Observações

- O sistema tem **3 schemas diferentes** para o mesmo dado
- **Allergies** é tratado como string EM UM LUGAR e array EM OUTRO
- **Admin não consegue ver dados** por causa do masking excessivo  
- **BloodType** aceita qualquer string mas deveria ser enum
- **BirthDate** pode ter problemas de timezone

**Conclusão**: O sistema precisa de uma reestruturação URGENTE com schema único e validações consistentes.
