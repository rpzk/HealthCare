# 📋 MATRIZ DE CONFLITOS - FEATURES ATUAIS vs SSF

**Análise Detalhada de Overlaps e Necessidades**

---

## 1. MODELS PRISMA - COMPARATIVO

### Consultation Model

#### ✅ JÁ IMPLEMENTADO
- `scheduledDemand` ✓
- `immediateDemand` ✓
- `orientationOnly` ✓
- `urgencyWithObs` ✓
- `continuedCare` ✓
- `prescriptionRenewal` ✓
- `examEvaluation` ✓
- `homeVisit` ✓
- `mentalHealth` ✓
- `alcoholUser` ✓
- `drugUser` ✓
- `hypertension` ✓
- `diabetes` ✓
- `leprosy` ✓
- `tuberculosis` ✓
- `prenatal` ✓
- `postpartum` ✓
- `stdAids` ✓
- `preventive` ✓
- `childCare` ✓
- `laboratory` ✓
- `radiology` ✓
- `ultrasound` ✓
- `obstetricUltrasound` ✓
- `mammography` ✓
- `ecg` ✓
- `pathology` ✓
- `physiotherapy` ✓
- `referralMade` ✓

#### ⚠️ FALTA ADICIONAR (Opcional mas recomendado)
```prisma
// Medidas antropométricas
bodyWeight      Float?          // kg
bodyHeight      Float?          // cm
headCircumference Float?        // cm (importante para crianças)
abdominalCircumference Float?   // cm
bmi             Float?          // calculado

// Sinais vitais integrados
systolicBP      Int?            // mmHg
diastolicBP     Int?            // mmHg
heartRate       Int?            // bpm
respiratoryRate Int?            // ipm
temperature     Float?          // Celsius
oxygenSaturation Int?           // %

// Demanda Agendada (SSF)
scheduledDemandReason String?   // Especificar motivo

// Campo de demanda
demandType      String?         // ENUM: "AGENDADA", "IMEDIATA", "CONTINUADA"
```

**Impacto**: Baixo - apenas expansão opcional

---

### Address Model

#### ✅ JÁ IMPLEMENTADO
- Basic fields (street, number, city, state)
- `latitude`, `longitude`
- `microAreaId` (FK to MicroArea)
- Índices geográficos

#### ❌ FALTA
- Hierarquia intermediária entre City e MicroArea:
  - Zone
  - District
  - Subprefecture
  - Neighborhood (different from basic neighborhood field)
  - Area

**Proposta de expansão segura**:
```prisma
model Address {
  // Keep all existing
  id           String  @id @default(cuid())
  street       String
  number       String?
  neighborhood String?  // Manter para compatibilidade
  city         String   // Manter como string
  state        String   // Manter como string
  
  // ADD NEW (all optional for backward compatibility)
  cityId         String?
  zoneId         String?
  districtId     String?
  subprefectureId String?
  neighborhoodId String?  // Different from string field
  areaId         String?
  microAreaId    String?  // Keep existing
  
  // Relations
  city           City?           @relation(fields: [cityId])
  zone           Zone?           @relation(fields: [zoneId])
  district       District?       @relation(fields: [districtId])
  subprefecture  Subprefecture?  @relation(fields: [subprefectureId])
  neighborhood   Neighborhood?   @relation(fields: [neighborhoodId])
  area           Area?           @relation(fields: [areaId])
  microArea      MicroArea?      @relation(fields: [microAreaId])
}

// New models (don't affect existing code)
model City {
  id        String  @id @default(cuid())
  code      String  @unique  // IBGE code
  name      String
  state     String  // UF
  zones     Zone[]
  addresses Address[]
  
  @@map("cities")
}

model Zone {
  id          String  @id @default(cuid())
  code        String?
  name        String
  cityId      String
  city        City    @relation(fields: [cityId], references: [id])
  districts   District[]
  addresses   Address[]
  
  @@map("zones")
}

model District {
  id          String  @id @default(cuid())
  code        String?
  name        String
  zoneId      String
  zone        Zone    @relation(fields: [zoneId], references: [id])
  subprefectures Subprefecture[]
  addresses   Address[]
  
  @@map("districts")
}

model Subprefecture {
  id        String  @id @default(cuid())
  code      String?
  name      String
  districtId String
  district  District @relation(fields: [districtId], references: [id])
  neighborhoods Neighborhood[]
  addresses Address[]
  
  @@map("subprefectures")
}

model Neighborhood {
  id              String  @id @default(cuid())
  code            String?
  name            String
  subprefectureId String
  subprefecture   Subprefecture @relation(fields: [subprefectureId])
  areas           Area[]
  addresses       Address[]
  
  @@map("neighborhoods")
}

model Area {
  id              String  @id @default(cuid())
  code            String?
  name            String
  neighborhoodId  String
  neighborhood    Neighborhood @relation(fields: [neighborhoodId])
  microAreas      MicroArea[]  // Uma Área pode ter múltiplas MicroAreas
  addresses       Address[]
  
  @@map("areas")
}

// MicroArea existing
// model MicroArea {
//   id              String  @id @default(cuid())
//   code            String? @unique
//   name            String
//   areaId          String?  // ADD THIS FK
//   area            Area?   @relation(fields: [areaId])
//   ...
// }
```

**Vantagens**:
- Zero breaking changes
- Queries podem usar ambos (string fields ou FKs)
- Migration gradual possível
- Compatibilidade total

---

### Patient Model

#### ✅ JÁ IMPLEMENTADO
- Basic demographic (name, CPF, birthDate, gender, phone)
- Address relations
- Consultation history
- Medical history

#### ❌ FALTA
- Vinculação com Família (PSF)
- Sequência na família
- Social vulnerability assessment
- RG/outros documentos

**Proposta mínima**:
```prisma
model Patient {
  // Keep all existing
  
  // ADD NEW (all optional)
  rg              String?
  rgState         String?
  fatherName      String?
  
  // PSF/Família
  familyNumber    String?      // "001.0001.0001" format
  sequenceInFamily Int?        // 1, 2, 3...
  
  // Social assessment
  socialVulnerability  String?  // ENUM: LOW, MEDIUM, HIGH
  economicClass        String?  // ENUM: A, B, C, D, E
  monthlyFamilyIncome  Float?
  
  // Location
  householdId String?           // Já existe
  addressId   String?           // New - preferredAddress
  
  @@index([familyNumber, sequenceInFamily])
  @@index([addressId])
}
```

**Zero breaking change**: Todos campos opcionais

---

### User Model

#### ✅ JÁ IMPLEMENTADO
- Role ENUM (inclui ACS)
- Speciality
- Professional licensing
- Active status

#### ❌ FALTA
- Designação clara de ACS para MicroArea
- Histórico de atribuições
- Validação de cobertura

**Proposta**:
```prisma
model User {
  // Keep all existing
  
  // ADD NEW
  acsAssignedMicroAreaId  String?
  acsAssignedMicroArea    MicroArea?  @relation(fields: [acsAssignedMicroAreaId], references: [id])
  acsHistory              ACSHistory[]
  
  // Designação de área
  assignedAreaId          String?
  assignedArea            Area?       @relation(fields: [assignedAreaId])
}

model ACSHistory {
  id              String  @id @default(cuid())
  userId          String
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  microAreaId     String?
  microArea       MicroArea? @relation(fields: [microAreaId])
  
  areaId          String?
  area            Area?       @relation(fields: [areaId])
  
  assignedAt      DateTime @default(now())
  unassignedAt    DateTime?
  assignmentReason String?
  
  @@index([userId, assignedAt])
  @@map("acs_history")
}
```

---

### Household Model

#### ✅ JÁ IMPLEMENTADO
- Basic info (address, number, complement)
- Membres (Patient[])
- Family type (string)

#### ❌ FALTA
- FK to MicroArea (currently string)
- Linked to geographic hierarchy
- Social indicators

**Proposta**:
```prisma
model Household {
  // Keep all existing
  
  // UPGRADE (backward compatible)
  microArea       String?      // Keep for compatibility
  microAreaId     String?      // ADD FK
  microAreaObj    MicroArea?   @relation(fields: [microAreaId])
  
  areaId          String?      // ADD
  area            Area?        @relation(fields: [areaId])
  
  // Enhancements
  familyType      String?      // Keep OR convert to ENUM later
  monthlyIncome   Float?       // NEW
  economicClass   String?      // NEW
  hasWater        Boolean?     // NEW
  hasElectricity  Boolean?     // NEW
  hasSewage       Boolean?     // NEW
  vulnerabilityScore Float?    // 0-100
  
  @@index([microAreaId])
  @@index([areaId])
}
```

---

## 2. API ROUTES - ANÁLISE DE OVERLAPS

### Rotas Atuais vs Necessárias (SSF)

#### ✅ SEM CONFLITO (existem e estão OK)
| Rota Atual | SSF Necessário | Status |
|---|---|---|
| `/api/addresses` | CRUD de endereços | ✅ Compatível |
| `/api/addresses/search` | Busca geográfica | ✅ Compatível |
| `/api/micro-areas` | Listagem de micro-áreas | ✅ Compatível |
| `/api/places` | Lugares dentro de micro-áreas | ✅ Compatível |
| `/api/consultations` | CRUD e filtros | ✅ Compatível |
| `/api/prescriptions` | CRUD de receitas | ✅ Compatível |
| `/api/patients` | CRUD de pacientes | ✅ Compatível com expansão |
| `/api/users` | Gerenciar usuários | ✅ Compatível com expansão |

#### ⚠️ NOVAS ROTAS NECESSÁRIAS
```
POST   /api/geographic/cities            # Criar cidades
GET    /api/geographic/cities            # Listar cidades
GET    /api/geographic/cities/:id        # Detalhe

POST   /api/geographic/zones             # Criar zonas
GET    /api/geographic/zones             # Listar
GET    /api/geographic/zones/:id/:children # Filhos de uma zona

POST   /api/geographic/districts         # ...similar pattern
POST   /api/geographic/subprefectures
POST   /api/geographic/neighborhoods
POST   /api/geographic/areas

POST   /api/acs/assign                   # Atribuir ACS a microarea
GET    /api/acs/history/:userId         # Histórico de atribuições
DELETE /api/acs/assign/:id               # Desatribuir

POST   /api/households                   # Expandir
GET    /api/households/:id
PATCH  /api/households/:id

GET    /api/geographic/tree              # Árvore completa (simulação)
GET    /api/geographic/by-address        # Qual zona/district/etc para endereço
```

---

## 3. COMPONENTES FRONTEND - ANÁLISE

### ✅ SEM CONFLITO
- `address-form.tsx` - Pode ser expandido para suportar seleção de hierarquia
- `address-autocomplete.tsx` - Compatível
- `micro-areas-overlay.tsx` - Compatível

### ⚠️ NOVOS COMPONENTES NECESSÁRIOS
```typescript
// components/geographic/
geographic-selector.tsx       // Selector em cascata: City > Zone > District > ...
geographic-tree.tsx           // Visualizar árvore geográfica
geographic-map.tsx            // Visualizar limites de áreas

// components/acs/
acs-assignment-form.tsx       // Atribuir ACS
acs-assignment-history.tsx    // Histórico de atribuições

// components/household/
household-form-expanded.tsx   // Form expandido com vulnerabilidade social
family-composition.tsx        // Visualizar membros da família

// components/patient/
patient-family-link.tsx       // Ligar pacientes da mesma família
```

---

## 4. VALIDAÇÃO SCHEMA - RECOMENDAÇÕES

### No `lib/validation-schemas.ts`, adicionar:

```typescript
// Geographic hierarchy validation
export const citySchema = z.object({
  code: z.string().regex(/^\d{7}$/),  // IBGE 7 digits
  name: z.string().min(1),
  state: z.string().length(2),
})

export const zoneSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  cityId: z.string(),
})

// Similar for district, subprefecture, neighborhood, area

export const addressSchemaExpanded = addressSchema.extend({
  cityId: z.string().optional(),
  zoneId: z.string().optional(),
  districtId: z.string().optional(),
  neighborhoodId: z.string().optional(),
  areaId: z.string().optional(),
  subprefectureId: z.string().optional(),
})

export const acsAssignmentSchema = z.object({
  userId: z.string(),
  microAreaId: z.string(),
  assignmentReason: z.string().optional(),
})
```

---

## 5. MIGRATION STRATEGY

### Fase 0: Preparation (1 dia)
1. Backup completo do DB
2. Review deste documento com time
3. Preparar scripts de rollback

### Fase 1: Schema Expansion (1 dia)
```bash
# 1. Create new geographic models
npx prisma migrate dev --name add_geographic_hierarchy

# 2. Create ACS models
npx prisma migrate dev --name add_acs_management

# 3. Expand Patient, User, Household
npx prisma migrate dev --name expand_patient_user_household
```

### Fase 2: Data Population (2-3 dias)
1. Script para mapear endereços atuais para hierarquia geográfica
2. Inicializar ACS history (vazio para novos)
3. Validação de integridade referencial

### Fase 3: API Updates (3 dias)
1. Update AddressService para suportar novos fields
2. Criar endpoints de geographic hierarchy
3. Criar endpoints de ACS management

### Fase 4: Frontend Updates (3 dias)
1. Update address-form para hierarquia
2. Criar acs-assignment UI
3. Testes integrados

### Fase 5: Validation (2 dias)
1. Testes em staging
2. Performance testing
3. Data consistency checks

**Total Estimado**: 2-3 semanas

---

## 6. PERFORMANCE CONSIDERATIONS

### Indexes necessários:
```prisma
model Address {
  @@index([cityId])
  @@index([zoneId])
  @@index([districtId])
  @@index([neighborhoodId])
  @@index([areaId])
  @@index([microAreaId])
  @@index([patientId])
  @@index([cityId, zoneId, districtId])  // Composite for hierarchy queries
}

model User {
  @@index([acsAssignedMicroAreaId])
  @@index([assignedAreaId])
}

model ACSHistory {
  @@index([userId, assignedAt])
  @@index([microAreaId])
  @@index([areaId])
}

model Patient {
  @@index([familyNumber])
  @@index([addressId])
}

model Household {
  @@index([microAreaId])
  @@index([areaId])
}
```

### Query optimization:
- Adicionar caching de hierarquia geográfica em Redis
- Lazy load de related geographic entities
- Implement geographic boundary caching

---

## 7. ROLLBACK PLAN

Se algo quebrar:

```bash
# Rollback último migration
npx prisma migrate resolve --rolled-back <migration_name>

# Ou voltar para backup
# 1. Restore DB from backup
# 2. Reset Prisma generate
# 3. Restart services
```

---

## RESUMO EXECUTIVO

| Aspecto | Risco | Esforço | Timeline |
|---|---|---|---|
| Schema Expansion | 🟢 Baixo | 🟡 Médio | 1-2 semanas |
| API Creation | 🟢 Baixo | 🟡 Médio | 1-2 semanas |
| Frontend Updates | 🟡 Médio | 🟡 Médio | 1 semana |
| Data Migration | 🟡 Médio | 🟠 Alto | 2-3 dias |
| Testing | 🟢 Baixo | 🟡 Médio | 2-3 dias |
| **TOTAL** | **🟢 LOW** | **2 semanas** | **3-4 semanas** |

---

**Status Final**: ✅ Sistema **PRONTO PARA EXPANSÃO SEGURA**
