# 📋 Plano de Qualidade de Código - Healthcare

**Data**: 21 de janeiro de 2026  
**Status**: Em Execução

---

## 🎯 Objetivos

1. **Imediato** (Esta semana): Corrigir os 50+ arquivos identificados no audit
2. **Curto Prazo** (2 semanas): Implementar testes automatizados
3. **Médio Prazo** (1 mês): Estabelecer padrões e guardrails
4. **Longo Prazo**: Cultura de qualidade sustentável

---

## 📊 Situação Atual

| Aspecto | Status | Impacto |
|---------|--------|--------|
| **Bugs em Produção** | 50+ arquivos | 🔴 Crítico |
| **Cobertura de Testes** | ~0% | 🔴 Crítico |
| **Type Safety** | Parcial | 🟡 Alto |
| **Code Review** | Ad-hoc | 🟡 Alto |
| **Documentação Padrões** | Inexistente | 🟠 Médio |

---

## 🔴 FASE 1: Correção Sistemática (Esta Semana)

### Priority 1: CRÍTICO (2-3 horas)
Arquivos que causam falhas diretas de funcionalidade.

- ✅ `app/api/patient/profile/route.ts` - CONCLUÍDO
- ✅ `app/api/auth/register-patient/route.ts` - CONCLUÍDO
- ✅ `app/invite/[token]/page.tsx` - CONCLUÍDO
- ✅ `components/patients/patient-form.tsx` - CONCLUÍDO
- ⏳ `app/minha-saude/perfil/page.tsx` - parseAllergies
- ⏳ `components/patients/patients-list.tsx` - remover parser duplicado
- ⏳ `app/patients/[id]/page.tsx` - validar decryption
- ⏳ `lib/validation-schemas.ts` - deprecar enum antigo

**Estimativa**: 2-3 horas  
**Impacto**: Corrige 95% dos bugs reportados

---

### Priority 2: ALTA (6-8 horas)
Endpoints com schemas duplicados que podem divergir.

**Padrão a seguir**:
```typescript
// ❌ ANTES: Schema inline duplicado
const schema = z.object({
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.array(z.string()).optional(),
})

// ✅ DEPOIS: Usar schema centralizado
import { patientProfileUpdateSchema } from '@/lib/patient-schemas'

const { data, error } = patientProfileUpdateSchema.safeParse(req.body)
```

**Arquivos a corrigir** (48+ endpoints):
- `app/api/medications/tracking/route.ts`
- `app/api/prescriptions/route.ts`
- `app/api/certificates/generate/route.ts`
- Todos em `app/api/patients/**`
- Todos em `app/api/patient/**`
- ... (lista completa no AUDIT_REPORT.md)

---

### Priority 3: MÉDIA (4-6 horas)
Manipulação insegura de datas e timezones.

**Padrão a seguir**:
```typescript
// ❌ ANTES: Timezone ambíguo
new Date(dateString)

// ✅ DEPOIS: ISO string com Z ou timezone explícito
new Date('2026-01-21T00:00:00Z')
```

**Arquivos críticos**:
- Qualquer cálculo de idade (`new Date().getFullYear() - birthDate.getFullYear()`)
- Agendamentos de consultas
- Relatórios de prescrições

---

## 🟢 FASE 2: Testes Automatizados (Semana 2)

### Unit Tests
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Arquivos para testar**:
1. `lib/patient-schemas.ts` - Helpers de normalização
   - `normalizeBloodType()` com todos os 16 valores
   - `parseAllergies()` com string, JSON array, null, undefined
   - `serializeAllergies()` com array vazio, null, valores normais

2. `lib/patient-service.ts` - CRUD operations
   - `getPatientById()` com decrypt correto
   - `updatePatient()` com validação

3. `lib/masking.ts` - Masking de dados sensíveis
   - Admin vê dados completos
   - Patient vê dados próprios
   - Doctor vê apenas campos permitidos

4. Endpoints da API
   - `GET /api/patient/profile` - retorna decrypt correto
   - `PUT /api/patient/profile` - salva encrypt correto
   - `POST /api/auth/register-patient` - cria paciente com validação

### Integration Tests
```bash
# Testar fluxo completo
npm run test:e2e
```

**Fluxos críticos**:
1. Paciente registra → salva CPF/allergies criptografados → Médico vê dados corretos
2. Admin visualiza paciente → vê dados desmascarados
3. Alteração de dados → reflete para todos os papéis

---

## 🟠 FASE 3: Guardrails de Código (Semana 3)

### 1. **ESLint Rules Customizadas**
```js
// .eslintrc.json
{
  "rules": {
    // Bloquear schemas duplicados
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='z'] > ObjectExpression",
        "message": "Use imported schema from @/lib/patient-schemas instead of inline z.object()"
      }
    ],
    // Bloquear new Date() ambíguo
    "no-restricted-globals": [
      "error",
      {
        "name": "Date",
        "message": "Use getUTCDate() or pass ISO string with Z"
      }
    ]
  }
}
```

### 2. **Pre-commit Hooks**
```bash
npm install --save-dev husky lint-staged

# .husky/pre-commit
npm run type-check && npm run lint && npm run test:unit
```

### 3. **CI/CD Pipeline**
```yaml
# .github/workflows/quality.yml
- Run type-check
- Run linter
- Run unit tests (>80% coverage required)
- Run e2e tests
- Block merge if fails
```

---

## 📚 FASE 4: Documentação de Padrões (Semana 4)

### 1. **Padrões Aprovados**

#### ✅ Criptografia
```typescript
// Para salvar
const encrypted = encrypt(value)

// Para ler
const decrypted = decrypt(value)

// Para schemas
import { cpfSchema } from '@/lib/patient-schemas'
```

#### ✅ Allergies
```typescript
// Sempre array em memória
type PatientAllergies = string[]

// Para criptografar: converter array → JSON → encrypt
const encrypted = encrypt(serializeAllergies(allergiesArray))

// Para descriptografar: decrypt → JSON parse → array
const allergiesArray = parseAllergies(decrypt(encryptedValue))
```

#### ✅ BloodType
```typescript
// Valores válidos: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''
import { normalizeBloodType } from '@/lib/patient-schemas'

// Normalizar qualquer entrada
const normalized = normalizeBloodType(userInput) // 'A_POSITIVE' → 'A+'
```

#### ✅ Schemas
```typescript
// ❌ NUNCA faça isso
const schema = z.object({ ... })

// ✅ SEMPRE faça isso
import { patientCreateSchema } from '@/lib/patient-schemas'
```

### 2. **Checklist de Code Review**

Antes de mergear PR:

- [ ] Usa schemas centralizados? (não inline)
- [ ] Criptografia é simétrica (encript/decrypt)?
- [ ] Allergies são sempre array em memória?
- [ ] BloodType está normalizado?
- [ ] Datas usam ISO string com Z ou timezone explícito?
- [ ] Há testes para casos edge?
- [ ] Type-check passa sem erros?
- [ ] Linter passa sem warnings?

### 3. **Documentação README**
```markdown
# Padrões de Desenvolvimento

## Antes de commitar:
1. `npm run type-check` ✅
2. `npm run lint` ✅
3. `npm run test` ✅
4. Validar checklist acima

## Ao adicionar novo endpoint:
- Use schema do `@/lib/patient-schemas`
- Encrypt campos sensíveis
- Retorne erro 400 para validação, 401 para auth, 403 para permissão

## Ao trabalhar com allergies:
- Sempre JSON array criptografado
- Use `parseAllergies()` para ler
- Use `serializeAllergies()` para escrever
```

---

## 📈 Métricas de Sucesso

### Semana 1 (Esta semana)
- [ ] 50+ arquivos analisados ✅
- [ ] Priority 1 e 2 corrigidos (12+ arquivos)
- [ ] Sem erros de type-check
- [ ] Sem warnings de lint

### Semana 2
- [ ] 80%+ cobertura de testes
- [ ] Todos fluxos críticos com testes
- [ ] CI/CD pipeline verde

### Semana 3
- [ ] ESLint rules customizadas implementadas
- [ ] Pre-commit hooks bloqueando erros
- [ ] Zero PRs com violações

### Semana 4
- [ ] Documentação completa
- [ ] Checklist in GitHub PR template
- [ ] Nenhuma regressão em 2 weeks

---

## 🛠️ Próximas Ações

### Imediato (Próximos 30 min)
```bash
# 1. Corrigir app/minha-saude/perfil/page.tsx
# 2. Corrigir components/patients/patients-list.tsx
# 3. Remover parser duplicado
# 4. Type-check e build
# 5. Rodar testes (quando implementados)
```

### Hoje
```bash
# 1. Completar Priority 1 e 2
# 2. Deploy para produção com testes
# 3. Validar com usuário que tudo funciona
```

### Esta Semana
```bash
# 1. Implementar Priority 3 (datas)
# 2. Começar unit tests
# 3. Setup ESLint rules
```

---

## 📋 Checklist de Conclusão

- [x] Audit completo realizado
- [x] Schema centralizado criado
- [x] Priority 1 crítico corrigido (50% completo)
- [ ] Priority 1 e 2 completamente corrigido
- [ ] Testes implementados
- [ ] ESLint rules customizadas
- [ ] CI/CD pipeline
- [ ] Documentação finalizada
- [ ] Deploy em produção
- [ ] Validação com usuário

---

## 📞 Perguntas Frequentes

**P: Por quanto tempo vou ter bugs assim?**  
R: Com o plano abaixo, os bugs críticos estarão corrigidos em 3-4 horas. Os guardrails para evitar novos bugs em 3-4 semanas.

**P: Isso vai quebrar a produção?**  
R: Não. As mudanças são additive (usar helpers corretos, não mudanças breaking).

**P: Quanto tempo por semana?**  
R: ~10-15 horas iniciais, depois 2-3 horas de manutenção contínua.

**P: Posso fazer isso em paralelo?**  
R: Sim! Cada arquivo é independente. Pode ser feito em sprints.

---

**Status**: 🔴 Crítico → 🟡 Em Progresso → 🟢 Controlado
