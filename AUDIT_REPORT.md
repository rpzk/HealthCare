# 🔍 Relatório de Auditoria Completa do Sistema

**Data**: 21 de janeiro de 2026  
**Escopo**: Inconsistências sistêmicas em validação, criptografia e manipulação de dados

---

## 📋 Resumo Executivo

Foram encontrados **erros sistêmicos críticos** em múltiplos pontos do aplicativo:

| Categoria | Arquivos Afetados | Criticidade |
|-----------|-------------------|-------------|
| **Allergies** (string vs array) | 12 arquivos | 🔴 CRÍTICA |
| **BloodType** (formato inconsistente) | 8 arquivos | 🔴 CRÍTICA |
| **Schemas duplicados** | 48+ endpoints | 🟡 ALTA |
| **Datas** (timezone/validação) | 25+ arquivos | 🟡 ALTA |
| **Criptografia inconsistente** | 6 arquivos | 🟠 MÉDIA |

---

## 🚨 PROBLEMA #1: Allergies - String vs Array

### Arquivos com Problema:

#### ✅ **JÁ CORRIGIDOS:**
- ✅ `lib/patient-service.ts` - Usa `parseAllergies()` e `serializeAllergies()`
- ✅ `lib/patient-schemas.ts` - Schema unificado com parser automático

#### ❌ **PRECISAM CORREÇÃO:**

1. **`app/api/patient/profile/route.ts`** (linhas 58, 72, 164, 212, 223)
   ```typescript
   // ❌ ERRADO: Split manual
   decryptedAllergies.split(',').map(s => s.trim()).filter(Boolean)
   
   // ✅ CORRETO: Usar helper
   parseAllergies(decrypt(patient.allergies))
   ```

2. **`app/api/auth/register-patient/route.ts`** (linha 112)
   ```typescript
   // ❌ ERRADO: Join manual sem criptografia
   allergies: data.allergies ? data.allergies.join(', ') : null,
   
   // ✅ CORRETO: Usar serializeAllergies + encrypt
   allergies: data.allergies?.length ? encrypt(serializeAllergies(data.allergies)) : null,
   ```

3. **`app/minha-saude/perfil/page.tsx`** (linhas 55, 115, 164)
   ```typescript
   // ❌ ERRADO: Interface diz array mas recebe string às vezes
   allergies: string[]
   
   // ❌ ERRADO: Split manual
   allergies: profile.allergies?.join(', ') || '',
   payload.allergies = form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
   
   // ✅ CORRETO: Sempre array
   import { parseAllergies } from '@/lib/patient-schemas'
   allergies: parseAllergies(profile.allergies)
   ```

4. **`app/invite/[token]/page.tsx`** (linha 58, 114)
   ```typescript
   // ❌ ERRADO: Tipo string | null
   allergies: string | null
   
   // ❌ ERRADO: Conversão para string
   setAllergies(json?.invite?.allergies ? String(json.invite.allergies) : '')
   
   // ✅ CORRETO: Sempre array
   allergies: string[]
   setAllergies(parseAllergies(json?.invite?.allergies))
   ```

5. **`components/patients/patients-list.tsx`** (linhas 44, 64-71)
   ```typescript
   // ❌ ERRADO: Parser duplicado
   const parseAllergies = (allergies?: string | null): string[] => {
     if (!allergies) return []
     if (typeof allergies === 'string') {
       try {
         const parsed = JSON.parse(allergies)
         return Array.isArray(parsed) ? parsed : []
       } catch {
         return allergies.split(',').map(s => s.trim()).filter(Boolean)
       }
     }
     return []
   }
   
   // ✅ CORRETO: Importar helper centralizado
   import { parseAllergies } from '@/lib/patient-schemas'
   ```

6. **`components/patients/patient-details-content.tsx`** (linha 61)
   ```typescript
   // ❌ ERRADO: Tipo inconsistente
   allergies?: string | null
   
   // ✅ CORRETO: Sempre array
   allergies?: string[]
   ```

7. **`components/patients/patient-form.tsx`** (linha 51)
   ```typescript
   // ❌ ERRADO: Tipo string
   allergies?: string
   
   // ✅ CORRETO: Array
   allergies?: string[]
   ```

8. **`lib/medical-agent.ts`** (linha 270)
   ```typescript
   // ❌ ERRADO: Aceita string
   allergies?: string | null
   
   // ✅ CORRETO: Sempre array
   allergies?: string[]
   ```

---

## 🚨 PROBLEMA #2: BloodType - Formatos Inconsistentes

### Formatos Encontrados:

1. **Formato Novo (Correto)**: `'A+'`, `'B-'`, `'AB+'`, `'O-'`
2. **Formato Antigo**: `'A_POSITIVE'`, `'B_NEGATIVE'`, etc

### Arquivos com Problema:

#### ❌ **PRECISAM CORREÇÃO:**

1. **`app/invite/[token]/page.tsx`** (linhas 354-361)
   ```tsx
   // ❌ ERRADO: Usa formato antigo nos valores
   <SelectItem value="A_POSITIVE">A+</SelectItem>
   <SelectItem value="A_NEGATIVE">A-</SelectItem>
   <SelectItem value="B_POSITIVE">B+</SelectItem>
   
   // ✅ CORRETO: Usar formato novo
   <SelectItem value="A+">A+</SelectItem>
   <SelectItem value="A-">A-</SelectItem>
   <SelectItem value="B+">B+</SelectItem>
   ```

2. **`components/patients/patient-form.tsx`** (linhas 681-688)
   ```tsx
   // ❌ ERRADO: Options usam formato antigo
   <option value="A_POSITIVE">A+</option>
   <option value="A_NEGATIVE">A-</option>
   
   // ✅ CORRETO:
   <option value="A+">A+</option>
   <option value="A-">A-</option>
   ```

3. **`lib/validation-schemas.ts`** (linha 23)
   ```typescript
   // ❌ ERRADO: Enum antigo
   bloodType: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional(),
   
   // ✅ CORRETO: Usar schema novo
   import { bloodTypeSchema } from '@/lib/patient-schemas'
   bloodType: bloodTypeSchema.optional(),
   ```

---

## 🚨 PROBLEMA #3: Schemas de Validação Duplicados

**48 endpoints** definem schemas inline em vez de reutilizar schemas centralizados.

### Padrão Problemático:
```typescript
// ❌ RUIM: Schema inline em cada endpoint
const updateSchema = z.object({
  phone: z.string().min(8).max(20).optional(),
  cpf: z.string().min(11).max(14).optional(),
  bloodType: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  allergies: z.array(z.string().min(1)).optional(),
  // ... mais campos
})
```

### Solução:
```typescript
// ✅ BOM: Reutilizar schema centralizado
import { patientUpdateSchema } from '@/lib/patient-schemas'

// Ou estender se precisar de campos extras:
const customUpdateSchema = patientUpdateSchema.extend({
  customField: z.string().optional()
})
```

### Arquivos que Precisam Refatoração:

1. `app/api/patient/profile/route.ts` - Usa schema inline, deve usar `patientProfileUpdateSchema`
2. `app/api/auth/register-patient/route.ts` - Deve usar `patientCreateSchema`
3. `app/api/patients/[id]/route.ts` - Já usa schema, mas precisa atualizar para novo
4. Mais 45 endpoints com schemas inline

---

## 🚨 PROBLEMA #4: Manipulação de Datas

**25+ arquivos** criam `new Date()` diretamente sem validação.

### Problemas:

1. **Timezone pode causar off-by-one day**
2. **Sem validação de idade (0-150 anos)**
3. **Aceita datas inválidas silenciosamente**

### Padrão Problemático:
```typescript
// ❌ RUIM: Conversão direta
birthDate: new Date(data.birthDate)  // Pode ser inválida!

// ❌ RUIM: Sem validação
const birth = new Date(birthDate)
const age = today.getFullYear() - birth.getFullYear()  // NaN se data inválida
```

### Solução:
```typescript
// ✅ BOM: Usar schema com validação
import { birthDateSchema } from '@/lib/patient-schemas'

const parsed = birthDateSchema.parse(data.birthDate)  // Valida e converte
```

### Arquivos Afetados:
- `app/api/auth/register-patient/route.ts` (linha 111)
- `app/api/users/become-patient/route.ts` (linha 78)
- `app/api/admin/users/link-patient/route.ts` (linha 94)
- `app/api/patient-invites/route.ts` (linha 223)
- Mais 20+ arquivos

---

## 🚨 PROBLEMA #5: Criptografia Inconsistente

Campos sensíveis nem sempre são criptografados/descriptografados corretamente.

### Campos que DEVEM ser criptografados:
| Campo | Situação Atual |
|-------|----------------|
| `cpf` | ✅ Criptografado (PatientService) |
| `allergies` | ⚠️ Às vezes não (register-patient) |
| `medicalHistory` | ✅ Criptografado |
| `currentMedications` | ✅ Criptografado |
| `emergencyContact` | ❌ NÃO criptografado |

### Problema Específico:

**`app/api/auth/register-patient/route.ts`** (linha 112):
```typescript
// ❌ ERRADO: Allergies não criptografado
allergies: data.allergies ? data.allergies.join(', ') : null,

// ✅ CORRETO:
import { serializeAllergies } from '@/lib/patient-schemas'
import { encrypt } from '@/lib/crypto'
allergies: data.allergies?.length 
  ? encrypt(serializeAllergies(data.allergies)) 
  : null,
```

---

## 📊 Impacto nos Dados Existentes

### Dados Possivelmente Corrompidos:

1. **Allergies** pode estar em 3 formatos:
   - String CSV: `"penicilina, dipirona"`
   - JSON array: `["penicilina", "dipirona"]`
   - String simples: `"penicilina"`

2. **BloodType** pode estar em 2+ formatos:
   - Novo: `"A+"`
   - Antigo: `"A_POSITIVE"`
   - Qualquer: `"a+"`, `"A +"`, etc

### Migração Necessária:

```sql
-- 1. Normalizar allergies para JSON
UPDATE patients 
SET allergies = (
  CASE 
    WHEN allergies LIKE '[%' THEN allergies  -- Já é JSON
    WHEN allergies LIKE '%,%' THEN jsonb_build_array(string_to_array(allergies, ','))  -- CSV
    WHEN allergies IS NOT NULL THEN jsonb_build_array(allergies)  -- String única
    ELSE NULL
  END
)
WHERE allergies IS NOT NULL;

-- 2. Normalizar bloodType
UPDATE patients 
SET bloodType = 
  CASE bloodType
    WHEN 'A_POSITIVE' THEN 'A+'
    WHEN 'A_NEGATIVE' THEN 'A-'
    WHEN 'B_POSITIVE' THEN 'B+'
    WHEN 'B_NEGATIVE' THEN 'B-'
    WHEN 'AB_POSITIVE' THEN 'AB+'
    WHEN 'AB_NEGATIVE' THEN 'AB-'
    WHEN 'O_POSITIVE' THEN 'O+'
    WHEN 'O_NEGATIVE' THEN 'O-'
    ELSE UPPER(TRIM(bloodType))
  END
WHERE bloodType IS NOT NULL;
```

---

## ✅ Plano de Correção

### Prioridade 1 (CRÍTICO - Fazer AGORA):

- [ ] Corrigir `app/api/patient/profile/route.ts` - usar `parseAllergies()`
- [ ] Corrigir `app/api/auth/register-patient/route.ts` - criptografar allergies
- [ ] Atualizar `app/invite/[token]/page.tsx` - valores de bloodType
- [ ] Atualizar `components/patients/patient-form.tsx` - valores de bloodType
- [ ] Migração SQL para normalizar dados existentes

### Prioridade 2 (ALTA - Esta Semana):

- [ ] Refatorar `app/minha-saude/perfil/page.tsx` - usar helpers
- [ ] Refatorar `components/patients/patients-list.tsx` - remover parser duplicado
- [ ] Atualizar `lib/validation-schemas.ts` - deprecar schema antigo
- [ ] Adicionar validação de datas em todos endpoints

### Prioridade 3 (MÉDIA - Próxima Semana):

- [ ] Consolidar 48 schemas inline para usar schemas centralizados
- [ ] Adicionar testes unitários para normalização
- [ ] Documentar padrões de validação
- [ ] Criar script de auditoria de dados

---

## 🎯 Métricas de Sucesso

- ✅ **0 schemas duplicados** para Patient
- ✅ **100% dos allergies** como array
- ✅ **100% dos bloodTypes** no formato `A+`/`A-`
- ✅ **100% dos campos sensíveis** criptografados
- ✅ **0 datas inválidas** aceitas

---

## 📝 Observações

1. **Por que isso aconteceu?**
   - Múltiplos desenvolvedores sem padrão definido
   - Falta de schema centralizado
   - Evolução do código sem refatoração

2. **Como prevenir?**
   - ✅ Schema único criado (`lib/patient-schemas.ts`)
   - 🔄 Adicionar linter rules para detectar schemas inline
   - 🔄 Code review obrigatório para novos endpoints
   - 🔄 Testes de integração que validam formatos

3. **Risco de Breaking Changes:**
   - ⚠️ Migração de dados pode falhar se houver formatos inesperados
   - ⚠️ Frontend pode quebrar se espera formato antigo
   - ✅ Mitigação: normalização gradual + backwards compatibility

---

## 🚀 Próximos Passos Imediatos

1. Executar correções de Prioridade 1
2. Rodar migração SQL em ambiente de staging primeiro
3. Validar com dados reais antes de produção
4. Deploy incremental com rollback preparado

