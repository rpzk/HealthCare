# 🎯 REVISÃO ESTRATÉGICA - PREPARAÇÃO PARA PORTAGEM SSF

**Data**: 2025-01-15  
**Status**: Análise Completa  
**Escopo**: Sistema atual vs Features SSF

---

## ✅ BOAS NOTÍCIAS - SISTEMA MAIS PREPARADO QUE O ESPERADO

### 1. **Campos BI do SSF já estão em Consultation!** ✨

O modelo `Consultation` **JÁ TEM** os campos do SSF implementados:

```prisma
// CAMPOS DE BI - TIPO DE ATENDIMENTO (SSF)
scheduledDemand     Boolean @default(false)   // Demanda Agendada
immediateDemand     Boolean @default(false)   // Demanda Imediata
orientationOnly     Boolean @default(false)   // Atendimento para Orientação
urgencyWithObs      Boolean @default(false)   // Urgência com Observação
continuedCare       Boolean @default(false)   // Atendimento Continuado
prescriptionRenewal Boolean @default(false)   // Renovação de Receita
examEvaluation      Boolean @default(false)   // Avaliação de Exame
homeVisit           Boolean @default(false)   // Visita Domiciliar

// CAMPOS DE BI - GRUPOS DE ATENDIMENTO (SSF)
mentalHealth Boolean @default(false)   // Saúde Mental
alcoholUser  Boolean @default(false)   // Usuário de Álcool
drugUser     Boolean @default(false)   // Usuário de Drogas
hypertension Boolean @default(false)   // Hipertensão
diabetes     Boolean @default(false)   // Diabetes
leprosy      Boolean @default(false)   // Hanseníase
tuberculosis Boolean @default(false)   // Tuberculose
prenatal     Boolean @default(false)   // Pré-Natal
postpartum   Boolean @default(false)   // Puerpério
stdAids      Boolean @default(false)   // DST/AIDS
preventive   Boolean @default(false)   // Preventivo
childCare    Boolean @default(false)   // Puericultura

// CAMPOS DE BI - CONDUTAS (SSF)
laboratory          Boolean @default(false)   // Laboratório
radiology           Boolean @default(false)   // Radiologia
ultrasound          Boolean @default(false)   // Ecografia
obstetricUltrasound Boolean @default(false)   // Ecografia Obstétrica
mammography         Boolean @default(false)   // Mamografia
ecg                 Boolean @default(false)   // ECG
pathology           Boolean @default(false)   // Patologia
physiotherapy       Boolean @default(false)   // Fisioterapia
referralMade        Boolean @default(false)   // Referência
```

**Impacto**: ✅ **NENHUMA ALTERAÇÃO NECESSÁRIA NO SCHEMA** para esses campos!

---

### 2. **Micro-Áreas já implementadas com geolocalização** 📍

O sistema **já tem**:
- Modelo `MicroArea` com `polygonGeo` (GeoJSON)
- `MicroAreaRevision` para auditoria de mudanças
- Integração em `Address`, `Place` e queries geográficas
- Service `AddressService` com suporte a micro-áreas
- Frontend com `address-form.tsx` carregando micro-áreas
- Índices geográficos (centroid, bbox)

**Impacto**: ✅ **SISTEMA PRONTO PARA EXPANSÃO GEOGRÁFICA SEGURA**

---

### 3. **Estrutura base para Prescrições e Medicamentos** 💊

Modelo `Prescription` já existe com:
- `status: PrescriptionStatus` (ACTIVE, etc.)
- `startDate` e `endDate`
- Relação com `Consultation`
- Suporte a `digitalSignature`
- Relacionamento com `PrescriptionItem[]`

**Impacto**: ✅ **PRONTO PARA EXPANSÃO COM TIPOS E CATEGORIAS SSF**

---

### 4. **Assinatura Digital já implementada** 🔐

Existe `DigitalCertificate` e `SignedDocument` com:
- Suporte a WebAuthn (passkeys)
- Validação e revogação
- Relacionamento com usuários
- Dashboard administrativo implementado

**Impacto**: ✅ **PODE SER ESTENDIDO PARA ATESTADOS E PRESCRIÇÕES**

---

## ⚠️ CONFLITOS E PONTOS DE EXPANSÃO NECESSÁRIA

### 1. **Hierarquia Geográfica Incompleta**

**Status Atual:**
```
Country (implicit) → State → City → Address + MicroArea
```

**SSF Requer:**
```
Country → State → City → Zone → District → Subprefecture → Neighborhood → Area → MicroArea
```

**Ação Necessária**: 
- Adicionar modelos intermediários SEM quebrar existentes
- Fazer campos opcionais para compatibilidade

**Prioridade**: 🔴 CRÍTICA

---

### 2. **Modelo User sem designação de ACS**

**Falta:**
- Campo `role` tem `ACS` mas sem relação clara com `MicroArea`
- Sem histórico de atribuição de ACS a área
- Sem validação de cobertura ACS

**Ação Necessária:**
```prisma
model User {
  // ... existing fields
  
  // ACS Management
  acsAssignedArea    MicroArea?  @relation("ACSAreaAssignments")
  acsHistory         ACSHistory[]
}

model ACSHistory {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  microAreaId   String
  microArea     MicroArea   @relation(fields: [microAreaId], references: [id])
  assignedAt    DateTime    @default(now())
  unassignedAt  DateTime?
  
  @@map("acs_history")
}
```

**Prioridade**: 🟡 MÉDIA

---

### 3. **Modelo Patient sem informações PSF**

**Falta:**
- Cadastro simplificado vs PSF requer: CPF, RG, data nascimento, filiação, etc.
- Sem flag de vinculação familiar
- Sem campos de vulnerabilidade social

**Ação Necessária:**
```prisma
model Patient {
  // ... existing fields
  
  // PSF Enrollment
  psfEnrolledAt   DateTime?
  familyNumber    String?      // Número da família no PSF
  sequenceNumber  Int?         // Ordem na família (1, 2, 3...)
  socialVulnerability String?  // BAIXA, MÉDIA, ALTA
  
  // Demographics (usar Person model é ideal)
  rg              String?
  motherName      String?      // Já pode estar em Person se existir
  
  @@index([familyNumber, sequenceNumber])
}
```

**Prioridade**: 🟡 MÉDIA

---

### 4. **Household model incompleto**

**Problema:**
- Usa string para `microArea` ao invés de FK
- Não tem relação com geografias intermediárias
- Sem campos de tipo de família padronizado

**Ação Necessária:**
```prisma
model Household {
  // ... existing fields
  
  // Melhorias
  microAreaId     String?      // FK ao invés de string
  microArea       MicroArea?   @relation(fields: [microAreaId])
  familyType      FamilyType   // Enum: NUCLEAR, EXTENDED, etc.
  monthlyIncome   Float?
  economicClass   String?      // A, B, C, D, E
  
  @@index([microAreaId])
}
```

**Prioridade**: 🟡 MÉDIA

---

## 🏗️ PLANO DE AÇÃO - REFATORAÇÃO INTELIGENTE

### Fase 1: Foundation (Segura - Sem quebra)
**Duração**: ~2 dias

1. **Expandir Address Model**
   ```prisma
   model Address {
     // Existing fields mantidas
     
     // Geographic Hierarchy
     countryId      String?
     stateId        String?
     cityId         String?
     zoneId         String?      // Novo
     districtId     String?      // Novo
     subprefectureId String?     // Novo
     neighborhoodId  String?     // Novo
     areaId         String?       // Novo
     microAreaId    String?       // Existente
     
     // Backward compatibility
     country        Country?    @relation(fields: [countryId])
     state          State?      @relation(fields: [stateId])
     city           City?       @relation(fields: [cityId])
     zone           Zone?       @relation(fields: [zoneId])
     district       District?   @relation(fields: [districtId])
     subprefecture  Subprefecture? @relation(fields: [subprefectureId])
     neighborhood   Neighborhood?  @relation(fields: [neighborhoodId])
     area           Area?       @relation(fields: [areaId])
     microArea      MicroArea?  @relation(fields: [microAreaId])
   }
   
   // Novos modelos
   model Country { ... }
   model State { ... }
   model City { ... }
   model Zone { ... }
   model District { ... }
   model Subprefecture { ... }
   model Neighborhood { ... }
   model Area { ... }
   // MicroArea já existe
   ```

   **Impacto**: 0 quebras em código existente (tudo opcional)

2. **Criar models de suporte SEM quebra**
   - `ACSHistory` (novo, sem afetar existentes)
   - `PatientFamily` (novo, relaciona pacientes da mesma família)
   - `PSFEnrollment` (novo, rastreia vinculação)

3. **Adicionar campos opcionais aos modelos existentes**
   - `User.acsAssignedArea` (optional FK)
   - `Patient.familyNumber` (string opcional)
   - `Patient.socialVulnerability` (string opcional)

### Fase 2: API Structure (Semanas 2-3)
1. Criar rotas para gerenciar hierarquia geográfica
2. Implementar queries com árvore geográfica
3. Criar endpoints de ACS management
4. Expandir `AddressService`

### Fase 3: Frontend & UI (Semanas 3-4)
1. Componentes para seleção de hierarquia geográfica
2. Dashboard de ACS
3. Formulários expandidos de Patient/Household

### Fase 4: Integração SSF (Semanas 4-6)
1. Portar features específicas
2. Migrar dados legados
3. Testes integrados

---

## 📊 ANÁLISE DE OVERLAPS

### ✅ SEM OVERLAPS (Pronto)

| Feature SSF | Implementação Atual | Status |
|---|---|---|
| Tipo de Atendimento | Consultation.scheduledDemand, immediateDemand, etc. | ✅ Pronto |
| Grupos de Atendimento | Consultation.mentalHealth, diabetes, etc. | ✅ Pronto |
| Condutas | Consultation.laboratory, radiology, etc. | ✅ Pronto |
| Micro-Áreas Geográficas | MicroArea + Address.microAreaId | ✅ Pronto |
| Prescrições Básicas | Prescription model | ✅ Pronto |
| Assinatura Digital | DigitalCertificate + SignedDocument | ✅ Pronto |

### ⚠️ OVERLAPS BAIXOS (Precisa expansão)

| Feature SSF | Implementação Atual | Ação Necessária |
|---|---|---|
| Hierarquia Geográfica 9 níveis | 4 níveis (País/Estado/Cidade/Micro) | Expandir Address model |
| Designação de ACS | Role ENUM com ACS | Adicionar FK e histórico |
| Cadastro de Família | Household model básico | Expandir com FK geográfico |
| Vinculação PSF | Não existe | Novo model PSFEnrollment |
| Tipos de Prescrição | String genérica | Expandir com enum/tipos |

---

## 🚨 RECOMENDAÇÕES CRÍTICAS

### 1. **NUNCA quebrar campos existentes**
- Address.city, state continuam como String
- Apenas ADICIONAR FK às tabelas novas
- Migration com default values para backward compatibility

### 2. **Usar padrão de expansão geográfica**
```sql
-- Ao invés de renomear, adicionar ANTES:
ALTER TABLE addresses ADD COLUMN cityId STRING;
ALTER TABLE addresses ADD FOREIGN KEY (cityId) REFERENCES cities(id);

-- Depois, em queries, suportar ambos:
SELECT * FROM addresses WHERE city = 'São Paulo' OR city_id IN (SELECT id FROM cities WHERE name = 'São Paulo');
```

### 3. **Manter AddressService como ponto único de acesso**
- Concentrar lógica geográfica
- Evitar queries diretas ao Prisma em Controllers
- Facilita migração futura

### 4. **Criar feature flags para SSF**
```typescript
// lib/ssf-features.ts
export const SSF_FEATURES = {
  GEOGRAPHIC_HIERARCHY: process.env.SSF_GEO_HIERARCHY === 'true',
  ACS_ASSIGNMENTS: process.env.SSF_ACS === 'true',
  PSF_ENROLLMENT: process.env.SSF_PSF === 'true',
}
```

---

## 📈 GANHOS ESPERADOS

### Curto Prazo (2 semanas)
- ✅ Schema expandido sem quebras
- ✅ APIs de suporte criadas
- ✅ 0 downtime no sistema

### Médio Prazo (4 semanas)
- ✅ Portagem iniciada de features SSF
- ✅ Sistema dual (legacy + SSF) funcionando
- ✅ Testes automatizados de integração

### Longo Prazo (6+ semanas)
- ✅ Funcionalidades SSF totalmente integradas
- ✅ Sistema unificado e otimizado
- ✅ Base para próximas expansões

---

## 🎓 CONCLUSÃO

O sistema atual está **MUITO MELHOR PREPARADO** do que esperado:

1. ✅ Campos BI SSF já estão na Consultation
2. ✅ Micro-áreas já implementadas com geolocalização
3. ✅ Assinatura digital pronta para estender
4. ✅ Estrutura de dados permite expansão segura

**Risco de conflitos**: 🟢 BAIXO
**Esforço de portagem**: 🟡 MÉDIO (6-8 semanas estimadas)
**Quebras esperadas**: ✅ ZERO (com planejamento correto)

**Próximo passo**: Iniciar Fase 1 da refatoração geográfica.
