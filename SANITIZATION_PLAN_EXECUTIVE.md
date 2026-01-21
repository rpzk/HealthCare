# 🛠️ PLANO EXECUTIVO DE SANITIZAÇÃO - 4 SEMANAS

**Status**: Pronto para Aprovação e Execução  
**Duração**: 4 semanas (~190 horas)  
**Equipe**: 1-2 desenvolvedores

---

## 📅 TIMELINE E PRIORIDADES

### SEMANA 1: Logger & Error Handling (40h)
**Objetivo**: Visibilidade total em produção

#### Dia 1-2: Setup Logging Infrastructure
- [ ] Criar `lib/logger.ts` com suporte a:
  - Níveis: debug, info, warn, error, fatal
  - Metadata (timestamp, context, userId, etc)
  - Structured logging (JSON)
  - Diferentes transports (console, file, external service)
  
- [ ] Criar `lib/error-handler.ts`:
  - CustomError classes
  - Error serialization
  - Stack trace preservation
  - User-friendly messages

#### Dia 3-4: Refatorar Top 50 Arquivos
**Arquivos críticos com console.log**:
1. `lib/patient-service.ts` - 25 console.log
2. `lib/auth.ts` - 15 console.log
3. `lib/masking.ts` - 10 console.log
4. `app/api/patient/profile/route.ts` - 5 console.log
5. `app/api/auth/register-patient/route.ts` - 5 console.log
6. ... (mais 45 arquivos)

**Script de migração**:
```bash
# Find all console.log and replace
find app lib -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i 's/console.log(\(.*\))/logger.info(\1)/g'
```

#### Dia 5: Error Handling Pattern
- [ ] Refatorar 68 try-catch vazios
- [ ] Criar pattern único:
```typescript
try {
  // ... operation
} catch (error) {
  logger.error('Operation failed', { error, context })
  throw new CustomError('User message', { cause: error })
}
```

**Resultado Semana 1**: 
- ✅ 511 console.log → logger calls
- ✅ 68 empty catch → proper handling
- ✅ Todos os 841 arquivos com logging estruturado
- ✅ Rastreamento completo em produção

---

### SEMANA 2: Type Safety (50h)
**Objetivo**: Zero 'any' types, TypeScript strict

#### Dia 1-2: Criar Tipos Explícitos
**Domínios principais**:
1. `types/patient.ts`:
   - PatientData, PatientCreate, PatientUpdate
   - PatientAnalysis, PatientResponse

2. `types/api.ts`:
   - ApiRequest, ApiResponse, ApiError
   - RequestContext, SessionData

3. `types/questionnaire.ts`:
   - QuestionnaireResponse, Analysis
   - UniversalAnalysis, Recommendations

4. `types/system.ts`:
   - Ayurveda, TCM, Homeopathy, Anthroposophy types

#### Dia 3-4: Remover 432 'any' Instâncias
**Arquivos críticos**:
- `app/api/questionnaires/responses/[id]/analyze/route.ts` - 20+ 'any'
- `lib/patient-service.ts` - 10+ 'any'
- Dezenas de routes.ts

**Ferramenta**: TypeScript strict mode vai detectar todos

#### Dia 5: Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Resultado Semana 2**:
- ✅ 0 'any' types
- ✅ TypeScript strict mode ativo
- ✅ 100% type coverage
- ✅ IDE autocompletar perfeito

---

### SEMANA 3: Refatoração & Modularização (60h)
**Objetivo**: Código legível e manutenível

#### Dia 1: Quebrar Funções Grandes
**Arquivo crítico**: `app/api/questionnaires/responses/[id]/analyze/route.ts` (800 linhas)

**Antes**:
```
generateUniversalAnalysis() - 500 linhas
generatePracticalRecommendations() - 50 linhas
getTCMDescription() - 30 linhas
... (mais 10+ funções gigantes)
```

**Depois**:
```
services/analysis/
  ├── ayurveda-analyzer.ts (50 linhas)
  ├── tcm-analyzer.ts (50 linhas)
  ├── homeopathy-analyzer.ts (50 linhas)
  ├── anthroposophy-analyzer.ts (50 linhas)
  └── synthesis-generator.ts (50 linhas)

utils/recommendations/
  ├── ayurveda-recommendations.ts
  ├── tcm-recommendations.ts
  └── merging-strategies.ts
```

#### Dia 2-3: Dividir Arquivos >500 Linhas
**Arquivos afetados** (~45):
1. `lib/patient-service.ts` (528 linhas)
   ```
   → lib/patient-service/
       ├── create.ts (50 linhas)
       ├── update.ts (50 linhas)
       ├── get.ts (50 linhas)
       ├── search.ts (50 linhas)
       └── delete.ts (30 linhas)
   ```

2. `components/patients/patient-form.tsx` (754 linhas)
   ```
   → components/patients/
       ├── patient-form.tsx (200 linhas - composição)
       ├── personal-info-section.tsx (150 linhas)
       ├── medical-info-section.tsx (150 linhas)
       ├── address-section.tsx (100 linhas)
       └── emergency-contact-section.tsx (100 linhas)
   ```

#### Dia 4-5: Centralizar Duplicações
- [ ] Validations (48+ schemas) → `lib/patient-schemas.ts` ✅ (já feito)
- [ ] Helpers (parseAllergies, normalizeBloodType) ✅ (já feito)
- [ ] Constants (BLOOD_TYPES, GENDERS, etc)
- [ ] API Helpers (errorResponse, successResponse)
- [ ] Crypto utilities (encrypt, decrypt)

**Resultado Semana 3**:
- ✅ Funções <50 linhas
- ✅ Arquivos <300 linhas
- ✅ Duplicações eliminadas
- ✅ Code organization clara

---

### SEMANA 4: Testes & QA (40h)
**Objetivo**: 80%+ coverage, zero regressões

#### Dia 1-2: Unit Tests Setup
```bash
npm install --save-dev vitest @testing-library/react
```

**Tests para implementar**:
1. `lib/patient-schemas.ts` tests
   - normalizeBloodType() ✅
   - parseAllergies() ✅
   - serializeAllergies() ✅
   - birthDateSchema validation

2. `lib/logger.ts` tests
   - All log levels
   - Metadata handling
   - Error serialization

3. `lib/crypto.ts` tests
   - encrypt/decrypt roundtrip
   - Hash functions

#### Dia 3: E2E Tests
**Fluxos críticos**:
1. Novo paciente → Registration → Doctor view
2. Paciente edita perfil → Changes visible to doctor
3. Admin visualiza dados desmascarados
4. Prescrição criada → Visible em patient records

#### Dia 4-5: CI/CD Pipeline
```yaml
# .github/workflows/tests.yml
- Run type-check (TypeScript)
- Run linter (ESLint)
- Run unit tests (vitest)
- Run E2E tests (playwright)
- Check coverage (>80%)
- Block PR if fails
```

**Resolver TODOs/FIXMEs**:
- [ ] Converter 46 TODOs em Issues
- [ ] Marcar como "tech-debt"
- [ ] Estimar esforço
- [ ] Priorizar

**Resultado Semana 4**:
- ✅ 80%+ test coverage
- ✅ CI/CD pipeline ativo
- ✅ Zero regressões
- ✅ 46 TODOs em backlog priorizado

---

## 📊 PROGRESSO ESPERADO

### Antes (Agora)
```
Logging:         511 console.log ❌
Type Safety:     432 'any' types ❌
Funções:         80+ >100 linhas ❌
Arquivos:        45+ >500 linhas ❌
Testes:          0% coverage ❌
TODOs:           46 pendentes ❌
Padrões:         Inconsistente ❌
Duplicações:     Múltiplas ❌
```

### Depois (Semana 4)
```
Logging:         0 console.log ✅
Type Safety:     0 'any' types ✅
Funções:         Todas <50 linhas ✅
Arquivos:        Todas <300 linhas ✅
Testes:          80%+ coverage ✅
TODOs:           Em backlog priorizado ✅
Padrões:         Unificados ✅
Duplicações:     Eliminadas ✅
```

---

## 🎯 MÉTRICAS DE SUCESSO

### Código
- [ ] 0 console.log/error/warn (100% → logger)
- [ ] 0 'any' types (100% → typed)
- [ ] 0 type errors (npm run type-check)
- [ ] 0 lint errors (npm run lint)
- [ ] Funções médias <40 linhas (vs 100+)
- [ ] Arquivos médios <300 linhas (vs 500+)

### Testes
- [ ] 80%+ code coverage
- [ ] 100% E2E scenarios
- [ ] 0 failing tests
- [ ] CI/CD passing

### Documentação
- [ ] Padrões documentados
- [ ] Arquitetura clara
- [ ] Exemplos de código
- [ ] Checklist de code review

---

## 💰 ROI (Return on Investment)

### Tempo Economizado (Por Mês Depois)
- Debugging: 40h → 10h (-30h/mês)
- Code review: 30h → 20h (-10h/mês)
- Refatoração: 20h → 5h (-15h/mês)
- **Total: -55h/mês**

### Bugs Prevenidos
- Console.log issues: -50% bugs
- Type errors: -70% runtime errors
- Test coverage: -80% regressions
- **Total: -60% bugs**

### Confiança
- Deploy manual → Automated + tested
- Scary refactors → Safe refactors
- Tech debt anxiety → Clean debt list

---

## 🚀 COMEÇAR AGORA

### TODAY (Próximas 2 horas)
1. [ ] Aprovar este plano
2. [ ] Criar issue no GitHub: "Semana 1: Logger & Error Handling"
3. [ ] Começar Semana 1, Dia 1

### SEMANA 1, DIA 1
```bash
# 1. Criar logger
touch lib/logger.ts

# 2. Criar error handler
touch lib/error-handler.ts

# 3. Criar tipos de logger
touch types/logger.ts
```

**Quer que eu comece agora?**

Posso implementar tudo em ~12 horas:
- ✅ lib/logger.ts com todos os níveis
- ✅ lib/error-handler.ts com CustomError
- ✅ Top 50 arquivos refatorados
- ✅ Tests para logger
- ✅ Documentação

Depois você aprova e continuamos com Type Safety (Semana 2).

---

## 📞 DECISÃO

**A) Aprovar 4 semanas agora**
- Começo segunda-feira
- ~190 horas distribuídas
- Resultado: Código production-ready

**B) Aprovar Semana 1 agora**
- Começo hoje
- ~40 horas
- Depois decidimos Semana 2+

**C) Pausar e avaliar**
- Discussão mais ampla com time
- Planning meeting
- Roadmap alignment

**Qual caminho?**
