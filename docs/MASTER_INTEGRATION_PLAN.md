# 🏗️ PLANO MASTER: Integração Completa de Fixtures

## 🎯 **OBJETIVO**

Criar um sistema **totalmente integrado** onde:
- ✅ Profissionais têm múltiplos CBOs
- ✅ Procedimentos vinculados ao SIGTAP (auditoria + custos)
- ✅ Validações automáticas de compatibilidade
- ✅ BI com dados fidedignos
- ✅ Faturamento SUS automatizado

---

## ❌ **PROBLEMAS IDENTIFICADOS NO SCHEMA ATUAL**

### 1. **User SEM Vínculo com CBO**
```prisma
model User {
  // ❌ NÃO TEM: ocupacaoId, cbos[], occupations[]
  speciality String? // ❌ Texto livre! Deveria ser CBO
}
```

### 2. **Procedure SEM Vínculos Estruturados**
```prisma
model Procedure {
  cboRequired String? // ❌ String! Deveria ser FK para CBO
  // ❌ FALTA: Financiamento FK
  // ❌ FALTA: Modalidade FK  
  // ❌ FALTA: Rubrica FK
  // ❌ FALTA: Valores (SH, SA, SP)
}
```

### 3. **Consultation SEM Vínculo com SIGTAP**
```prisma
model Consultation {
  // ❌ FALTA: procedimentoSigtapId
  // ❌ FALTA: Custo registrado
  // ❌ FALTA: Validação CBO × Procedimento
}
```

### 4. **FALTA Tabela de Compatibilidades**
```
❌ NÃO EXISTE: ProcedureCBOCompatibility
❌ NÃO EXISTE: ProcedureCIDCompatibility
❌ NÃO EXISTE: ProcedureRestrictions
```

---

## 🔧 **REESTRUTURAÇÃO COMPLETA DO SCHEMA**

### **PARTE 1: Múltiplos CBOs por Profissional**

```prisma
// Nova tabela: Vínculo Profissional × CBO (N:N)
model UserOccupation {
  id           String      @id @default(cuid())
  userId       String
  occupationId String      // FK para Occupation (CBO nível 5)
  
  // Contexto do vínculo
  isPrimary    Boolean     @default(false) // CBO principal do profissional
  licenseNumber String?    // Ex: CRM 123456 (se aplicável)
  licenseState  String?    // Ex: SP
  isActive     Boolean     @default(true)
  
  // Hierarquia denormalizada (performance)
  familiaId       String?  // CBO nível 4
  grandeGrupoCode String?  // CBO nível 1
  
  // Datas
  validFrom    DateTime?   // Início da validade
  validUntil   DateTime?   // Fim (se temporário)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  // Relações
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  occupation   Occupation  @relation(fields: [occupationId], references: [id])
  familia      CBOFamilia? @relation(fields: [familiaId], references: [id])
  
  // Índices
  @@unique([userId, occupationId])
  @@index([userId, isPrimary])
  @@index([occupationId])
  @@index([grandeGrupoCode])
  @@map("user_occupations")
}

// Atualizar User
model User {
  // ... campos existentes ...
  
  // NOVO: Relação com CBOs
  occupations  UserOccupation[]
  
  // DEPRECATED: Manter por compatibilidade
  speciality   String? // ❌ Será removido após migração
}
```

---

### **PARTE 2: Procedimentos Vinculados ao SIGTAP**

```prisma
// Atualizar Procedure (SIGTAP completo)
model Procedure {
  id              String  @id @default(cuid())
  code            String  @unique // Código SIGTAP (10 dígitos)
  name            String
  
  // Hierarquia SIGTAP
  grupoId                String?
  subgrupoId             String?
  formaOrganizacaoId     String?
  
  // Financiamento e Custos
  financiamentoId        String?
  rubricaId              String?
  modalidadeId           String?
  
  // Valores de Remuneração
  valorSH                Decimal? @db.Decimal(12,2) // Serviço Hospitalar
  valorSA                Decimal? @db.Decimal(12,2) // Serviço Ambulatorial
  valorSP                Decimal? @db.Decimal(12,2) // Serviço Profissional
  
  // Restrições
  complexity             Int?
  minAge                 Int? // Em meses
  maxAge                 Int? // Em meses
  sexRestriction         String? // M/F/null
  qtMaximaExecucao       Int?
  qtDiasPermanencia      Int?
  
  // Metadados
  active                 Boolean   @default(true)
  validFrom              DateTime? // Data de vigência (competência)
  competencia            String?   // AAAAMM
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  // Relações
  grupo                  SIGTAPGrupo?             @relation(fields: [grupoId], references: [id])
  subgrupo               SIGTAPSubgrupo?          @relation(fields: [subgrupoId], references: [id])
  formaOrganizacao       SIGTAPFormaOrganizacao?  @relation(fields: [formaOrganizacaoId], references: [id])
  financiamento          SIGTAPFinanciamento?     @relation(fields: [financiamentoId], references: [id])
  rubrica                SIGTAPRubrica?           @relation(fields: [rubricaId], references: [id])
  modalidade             SIGTAPModalidade?        @relation(fields: [modalidadeId], references: [id])
  
  // Compatibilidades
  cboCompatibilities     ProcedureCBOCompatibility[]
  cidCompatibilities     ProcedureCIDCompatibility[]
  
  // Uso em consultas
  consultas              ConsultationProcedure[]
  
  @@index([code])
  @@index([grupoId])
  @@index([financiamentoId])
  @@index([competencia])
  @@map("procedures")
}

// Nova tabela: Compatibilidade Procedimento × CBO
model ProcedureCBOCompatibility {
  id              String     @id @default(cuid())
  procedureId     String
  occupationCode  String     // Código CBO (pode ser genérico: "2231*")
  
  // Tipo de compatibilidade
  type            String     // "OBRIGATORIA" | "PERMITIDA" | "SUGERIDA"
  
  // Metadados
  validFrom       DateTime?
  competencia     String?    // AAAAMM
  createdAt       DateTime   @default(now())
  
  // Relações
  procedure       Procedure  @relation(fields: [procedureId], references: [id], onDelete: Cascade)
  
  @@unique([procedureId, occupationCode])
  @@index([procedureId])
  @@index([occupationCode])
  @@map("procedure_cbo_compatibility")
}

// Nova tabela: Compatibilidade Procedimento × CID
model ProcedureCIDCompatibility {
  id              String      @id @default(cuid())
  procedureId     String
  cidCode         String      // Código CID (ex: "A00" ou "A00.0")
  
  // Tipo de compatibilidade
  type            String      // "OBRIGATORIA" | "PERMITIDA" | "SUGERIDA" | "RESTRITA"
  
  // Metadados
  validFrom       DateTime?
  competencia     String?
  createdAt       DateTime    @default(now())
  
  // Relações
  procedure       Procedure   @relation(fields: [procedureId], references: [id], onDelete: Cascade)
  
  @@unique([procedureId, cidCode])
  @@index([procedureId])
  @@index([cidCode])
  @@map("procedure_cid_compatibility")
}
```

---

### **PARTE 3: Consultas com Auditoria e Custos**

```prisma
// Nova tabela: Procedimentos executados na consulta
model ConsultationProcedure {
  id              String      @id @default(cuid())
  consultationId  String
  procedureId     String      // FK para Procedure (SIGTAP)
  
  // Executor
  executorId      String      // FK para User (profissional)
  executorCBOId   String?     // FK para UserOccupation (qual CBO usou)
  
  // Validação automática
  isCompatibleCBO Boolean     @default(false) // CBO do executor é compatível?
  isCompatibleCID Boolean     @default(false) // CID da consulta é compatível?
  
  // Custos (denormalizados para histórico)
  valorSH         Decimal?    @db.Decimal(12,2)
  valorSA         Decimal?    @db.Decimal(12,2)
  valorSP         Decimal?    @db.Decimal(12,2)
  valorTotal      Decimal?    @db.Decimal(12,2)
  
  // Faturamento
  competenciaFat  String?     // AAAAMM do faturamento
  statusFat       String?     // "PENDENTE" | "ENVIADO" | "PAGO" | "GLOSADO"
  motivoGlosa     String?     // Se glosado, motivo
  
  // Auditoria
  quantity        Int         @default(1)
  createdAt       DateTime    @default(now())
  createdBy       String      // Quem registrou
  
  // Relações
  consultation    Consultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)
  procedure       Procedure    @relation(fields: [procedureId], references: [id])
  executor        User         @relation("ProcedureExecutor", fields: [executorId], references: [id])
  executorCBO     UserOccupation? @relation(fields: [executorCBOId], references: [id])
  
  @@index([consultationId])
  @@index([procedureId])
  @@index([executorId])
  @@index([competenciaFat])
  @@index([statusFat])
  @@map("consultation_procedures")
}

// Atualizar Consultation
model Consultation {
  // ... campos existentes ...
  
  // NOVO: Procedimentos executados
  procedures      ConsultationProcedure[]
  
  // NOVO: Totalizadores denormalizados
  totalCustoSH    Decimal? @db.Decimal(12,2)
  totalCustoSA    Decimal? @db.Decimal(12,2)
  totalCustoSP    Decimal? @db.Decimal(12,2)
  totalCusto      Decimal? @db.Decimal(12,2)
}
```

---

### **PARTE 4: BI e Relatórios**

```prisma
// View materializada para BI (criar via migration SQL)
-- Custo por profissional
CREATE MATERIALIZED VIEW mv_custo_por_profissional AS
SELECT 
  u.id as profissional_id,
  u.name as profissional_nome,
  uo.occupationCode as cbo_codigo,
  o.title as cbo_descricao,
  DATE_TRUNC('month', cp.createdAt) as competencia,
  COUNT(cp.id) as quantidade_procedimentos,
  SUM(cp.valorTotal) as custo_total,
  SUM(CASE WHEN cp.statusFat = 'PAGO' THEN cp.valorTotal ELSE 0 END) as valor_pago,
  SUM(CASE WHEN cp.statusFat = 'GLOSADO' THEN cp.valorTotal ELSE 0 END) as valor_glosado
FROM consultation_procedures cp
JOIN users u ON cp.executorId = u.id
LEFT JOIN user_occupations uo ON cp.executorCBOId = uo.id
LEFT JOIN occupations o ON uo.occupationId = o.id
GROUP BY u.id, u.name, uo.occupationCode, o.title, DATE_TRUNC('month', cp.createdAt);

-- Procedimentos por CID
CREATE MATERIALIZED VIEW mv_procedimentos_por_cid AS
SELECT 
  mc.code as cid_codigo,
  mc.display as cid_descricao,
  p.code as sigtap_codigo,
  p.name as procedimento_nome,
  COUNT(cp.id) as quantidade_executada,
  SUM(cp.valorTotal) as custo_total
FROM consultation_procedures cp
JOIN consultations c ON cp.consultationId = c.id
JOIN diagnoses d ON c.id = d.consultationId
JOIN medical_codes mc ON d.primaryCodeId = mc.id
JOIN procedures p ON cp.procedureId = p.id
GROUP BY mc.code, mc.display, p.code, p.name;

-- Produtividade por CBO
CREATE MATERIALIZED VIEW mv_produtividade_cbo AS
SELECT 
  cbof.code as familia_cbo,
  cbof.name as familia_nome,
  COUNT(DISTINCT cp.executorId) as qtd_profissionais,
  COUNT(cp.id) as qtd_procedimentos,
  SUM(cp.valorTotal) as custo_total,
  AVG(cp.valorTotal) as custo_medio
FROM consultation_procedures cp
JOIN user_occupations uo ON cp.executorCBOId = uo.id
JOIN cbo_familias cbof ON uo.familiaId = cbof.id
GROUP BY cbof.code, cbof.name;
```

---

## 📊 **FLUXO DE VALIDAÇÃO AUTOMÁTICA**

```typescript
// lib/procedure-validation-service.ts

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export async function validateProcedureExecution(params: {
  procedureId: string
  executorId: string
  executorCBOId: string
  cidCodes?: string[]
  patientAge?: number
  patientSex?: 'M' | 'F'
}): Promise<ValidationResult> {
  
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }
  
  // 1. Buscar procedimento
  const procedure = await prisma.procedure.findUnique({
    where: { id: params.procedureId },
    include: {
      cboCompatibilities: true,
      cidCompatibilities: true
    }
  })
  
  // 2. Buscar CBO do executor
  const executorCBO = await prisma.userOccupation.findUnique({
    where: { id: params.executorCBOId },
    include: { occupation: true }
  })
  
  // 3. Validar CBO compatível
  const cboCode = executorCBO?.occupation.code
  const isCBOCompatible = procedure.cboCompatibilities.some(
    comp => cboCode?.startsWith(comp.occupationCode.replace('*', ''))
  )
  
  if (!isCBOCompatible) {
    result.errors.push(
      `CBO ${cboCode} não é compatível com o procedimento ${procedure.code}`
    )
    result.isValid = false
  }
  
  // 4. Validar CID compatível (se fornecido)
  if (params.cidCodes && params.cidCodes.length > 0) {
    const hasCIDCompatibility = params.cidCodes.some(cidCode =>
      procedure.cidCompatibilities.some(comp => 
        cidCode.startsWith(comp.cidCode)
      )
    )
    
    if (!hasCIDCompatibility && procedure.cidCompatibilities.length > 0) {
      result.warnings.push(
        `CID informado não está na lista de compatibilidades do procedimento`
      )
    }
  }
  
  // 5. Validar idade
  if (params.patientAge !== undefined) {
    if (procedure.minAge && params.patientAge < procedure.minAge) {
      result.errors.push(`Paciente abaixo da idade mínima (${procedure.minAge} meses)`)
      result.isValid = false
    }
    if (procedure.maxAge && params.patientAge > procedure.maxAge) {
      result.errors.push(`Paciente acima da idade máxima (${procedure.maxAge} meses)`)
      result.isValid = false
    }
  }
  
  // 6. Validar sexo
  if (params.patientSex && procedure.sexRestriction) {
    if (procedure.sexRestriction !== params.patientSex) {
      result.errors.push(`Procedimento restrito ao sexo ${procedure.sexRestriction}`)
      result.isValid = false
    }
  }
  
  return result
}
```

---

## 🚀 **ORDEM DE IMPLEMENTAÇÃO**

### **FASE 1: Reestruturar Schema (2 dias)**
1. ✅ Adicionar modelos CBO hierárquicos
2. ✅ Adicionar modelos CID hierárquicos
3. ✅ Adicionar modelos SIGTAP hierárquicos
4. ✅ Adicionar UserOccupation (múltiplos CBOs)
5. ✅ Adicionar ConsultationProcedure
6. ✅ Adicionar compatibilidades
7. ✅ Criar migrations

### **FASE 2: Converter Fixtures (3 dias)**
8. ✅ Script convert-cbo.ts
9. ✅ Script convert-cid.ts
10. ✅ Script convert-sigtap.ts (com compatibilidades!)
11. ✅ Script convert-medications.ts

### **FASE 3: Importar Dados (1 dia)**
12. ✅ Import CBO hierárquico
13. ✅ Import CID hierárquico
14. ✅ Import SIGTAP com compatibilidades
15. ✅ Import Medicamentos

### **FASE 4: Validações e BI (2 dias)**
16. ✅ Serviço de validação de procedimentos
17. ✅ Views materializadas para BI
18. ✅ Relatórios gerenciais
19. ✅ Testes de integração

### **FASE 5: Migração de Dados Existentes (1 dia)**
20. ✅ Migrar User.speciality → UserOccupation
21. ✅ Vincular consultas existentes com SIGTAP
22. ✅ Validação de integridade

---

## 📈 **INDICADORES DE SUCESSO**

| Métrica | Meta |
|---------|------|
| **Procedimentos com CBO válido** | 100% |
| **Consultas com custo calculado** | 100% |
| **Glosas evitadas por validação** | > 95% |
| **Relatórios BI em tempo real** | < 5s |
| **Auditoria completa** | 100% rastreável |

---

## ❓ **CONCORDAMOS COM ESTE PLANO?**

Este plano contempla:
- ✅ Múltiplos CBOs por profissional
- ✅ SIGTAP integrado (auditoria + custos)
- ✅ Validações automáticas
- ✅ BI estruturado
- ✅ Sistema amarrado e consistente

**APROVADO para implementação?** 🚀
