# Plano de Ação - Portação de Features SSF para Next.js

## 📋 Checklist de Implementação - Phase 1 (CRÍTICO)

### 1. Hierarquia Geográfica - MÁXIMA PRIORIDADE
**Esforço:** 40 horas | **Complexidade:** 9/10

#### 1.1 Schema Prisma
```prisma
// prisma/schema.prisma

model Country {
  id        String    @id @default(cuid())
  name      String    @unique
  code      String?   @unique
  area      Float?
  flag      String?   // URL da bandeira
  states    State[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@index([code])
}

model State {
  id        String    @id @default(cuid())
  country   Country   @relation(fields: [countryId], references: [id])
  countryId String
  name      String
  code      String    // UF (ex: "SP", "RJ")
  area      Float?
  flag      String?
  cities    City[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@unique([countryId, code])
  @@index([countryId])
}

model City {
  id            String    @id @default(cuid())
  state         State     @relation(fields: [stateId], references: [id])
  stateId       String
  name          String
  area          Float?
  flag          String?
  zones         Zone[]
  healthUnits   HealthUnit[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([stateId, name])
  @@index([stateId])
}

// SSF SPECIFIC - NEW HIERARCHY
model Zone {
  id            String    @id @default(cuid())
  city          City      @relation(fields: [cityId], references: [id])
  cityId        String
  name          String
  area          Float?
  observation   String?
  districts     District[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([cityId, name])
  @@index([cityId])
}

model District {
  id            String    @id @default(cuid())
  zone          Zone      @relation(fields: [zoneId], references: [id])
  zoneId        String
  name          String
  area          Float?
  observation   String?
  subprefectures Subprefecture[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([zoneId, name])
  @@index([zoneId])
}

model Subprefecture {
  id            String    @id @default(cuid())
  district      District  @relation(fields: [districtId], references: [id])
  districtId    String
  name          String
  area          Float?
  observation   String?
  neighborhoods Neighborhood[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([districtId, name])
  @@index([districtId])
}

model Neighborhood {
  id            String    @id @default(cuid())
  subprefecture Subprefecture @relation(fields: [subprefectureId], references: [id])
  subprefectureId String
  name          String
  area          Float?
  observation   String?
  areas         CoverageArea[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([subprefectureId, name])
  @@index([subprefectureId])
}

model CoverageArea {
  id            String    @id @default(cuid())
  neighborhood  Neighborhood @relation(fields: [neighborhoodId], references: [id])
  neighborhoodId String
  code          String    // ex: "01", "02"
  name          String
  area          Float?
  observation   String?
  microAreas    MicroArea[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([neighborhoodId, code])
  @@index([neighborhoodId])
}

model MicroArea {
  id            String    @id @default(cuid())
  coverageArea  CoverageArea @relation(fields: [coverageAreaId], references: [id])
  coverageAreaId String
  code          String    // ex: "01", "02"
  name          String
  observation   String?
  agent         User?     @relation("ACSAgent")
  families      Family[]
  addresses     Address[] // 1:N - múltiplos endereços por microárea
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([coverageAreaId, code])
  @@index([coverageAreaId])
}

// Atualizar Address existente
model Address {
  // ... campos existentes
  microArea     MicroArea?  @relation(fields: [microAreaId], references: [id])
  microAreaId   String?
  
  // Adicionar segmento
  segmentType   String?     // "URBAN", "RURAL", "PERIURBAN"
  
  @@index([microAreaId])
}

// Atualizar HealthUnit existente
model HealthUnit {
  // ... campos existentes
  city          City      @relation(fields: [cityId], references: [id])
  cityId        String
  
  latitude      Float?
  longitude     Float?
  
  @@index([cityId])
}

// Adicionar User Agent link
model User {
  // ... campos existentes
  microArea     MicroArea? // ACS tem 1 microárea
}
```

#### 1.2 Migration Script
```bash
# 1. Exportar dados do SSF Django
python manage.py dumpdata geral.Pais geral.Estado geral.Municipio \
  geral.Distrito geral.Bairro geral.Area geral.Micro > ssf_geo_dump.json

# 2. Transformar JSON para Prisma seeders
node scripts/transform-ssf-geo.js ssf_geo_dump.json

# 3. Executar seed
npx prisma db seed
```

#### 1.3 API Endpoints
```typescript
// app/api/geo/countries/route.ts
// GET /api/geo/countries

// app/api/geo/states/route.ts
// GET /api/geo/states?countryId=X

// app/api/geo/cities/route.ts
// GET /api/geo/cities?stateId=X

// app/api/geo/zones/route.ts
// GET /api/geo/zones?cityId=X

// app/api/geo/districts/route.ts
// GET /api/geo/districts?zoneId=X

// app/api/geo/subprefectures/route.ts
// GET /api/geo/subprefectures?districtId=X

// app/api/geo/neighborhoods/route.ts
// GET /api/geo/neighborhoods?subprefectureId=X

// app/api/geo/areas/route.ts
// GET /api/geo/areas?neighborhoodId=X

// app/api/geo/microareas/route.ts
// GET /api/geo/microareas?areaId=X&cityId=Y
```

---

### 2. Microáreas - MÁXIMA PRIORIDADE
**Esforço:** 20 horas | **Complexidade:** 7/10

**Integrar com:** Schema Prisma da Hierarquia Geográfica (já acima)

#### 2.1 Admin Interface
- CRUD de microáreas
- Atribuição de ACS
- Mapa visual com Leaflet
- Importação bulk via CSV

#### 2.2 ACS Dashboard
```typescript
// app/admin/acs/[id]/microarea/page.tsx
// Mostra:
// - Famílias na microárea
// - Visitas marcadas
// - Indicadores de cobertura
// - Próximas gestantes
```

---

### 3. DCNT Rastreamento
**Esforço:** 12 horas | **Complexidade:** 3/10

#### 3.1 Adicionar ao Schema Prisma
```prisma
model Consultation {
  // ... campos existentes
  
  // DCNT Flags
  hypertension      Boolean  @default(false)
  diabetes          Boolean  @default(false)
  asthma            Boolean  @default(false)
  chronicLungDisease Boolean @default(false)
  
  // Transmissíveis
  tuberculosis      Boolean  @default(false)
  leprosy           Boolean  @default(false)
  hiv               Boolean  @default(false)
  dst               Boolean  @default(false)
}
```

#### 3.2 Dashboard DCNT
- Prevalência por DCNT
- Cobertura de rastreamento
- Pacientes em acompanhamento
- Alertas de faltosos

---

### 4. Produção Mensal SIAB
**Esforço:** 60 horas | **Complexidade:** 9/10

#### 4.1 Schema para Agregação
```prisma
model ProductionReport {
  id            String    @id @default(cuid())
  month         Int
  year          Int
  healthUnit    HealthUnit @relation(fields: [healthUnitId], references: [id])
  healthUnitId  String
  
  // Estatísticas por faixa etária
  consultations0_1        Int @default(0)
  consultations1_4        Int @default(0)
  consultations5_9        Int @default(0)
  // ... mais 7 faixas
  
  // Por tipo de atendimento
  clinicConsultations     Int @default(0)
  gynecologyConsultations Int @default(0)
  pediatricsConsultations Int @default(0)
  urgencyConsultations    Int @default(0)
  
  // DCNT
  hypertensionCases      Int @default(0)
  diabetesCases          Int @default(0)
  // ... mais
  
  // Exames
  laboratorySolicitacions Int @default(0)
  radiologySolicitacions  Int @default(0)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  @@unique([healthUnitId, month, year])
  @@index([healthUnitId, year])
}
```

#### 4.2 Aggregation Job
```typescript
// lib/jobs/generateProductionReport.ts
export async function generateMonthlyReport(
  healthUnitId: string,
  month: number,
  year: number
) {
  // 1. Agregar consultas
  // 2. Contar por faixa etária
  // 3. Contar por tipo
  // 4. Contar DCNT
  // 5. Salvar em ProductionReport
  // 6. Gerar PDF
}
```

#### 4.3 Relatório PDF
```typescript
// app/api/reports/production/[id]/pdf/route.ts
// Gera PDF SIAB-compatible usando @react-pdf/renderer
```

---

### 5. Pré-Natal
**Esforço:** 35 horas | **Complexidade:** 7/10

#### 5.1 Schema
```prisma
model PreNatalConsultation {
  id                String  @id @default(cuid())
  consultation      Consultation @relation(fields: [consultationId], references: [id])
  consultationId    String
  pregnancy         Pregnancy @relation(fields: [pregnancyId], references: [id])
  pregnancyId       String
  
  // Trimester
  trimester         String  // "T1", "T2", "T3"
  
  // Physical exam
  uterineHeight     Float?  // Altura uterina
  fetalHeartbeat    Int?    // BPM
  fetalMovements    Boolean?
  
  // Tests
  testsPerformed    String[]  // ["VDRL", "HIV", "GLUCOSE", "HEMOGLOBIN", ...]
  resultsNormal     Boolean   @default(true)
  
  // Risk
  riskLevel         String  // "LOW", "HIGH"
  
  // Birth
  birthType         String? // "VAGINAL", "CESAREAN"
  birthOutcome      String? // "ALIVE", "STILLBORN"
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([consultationId, pregnancyId])
}

model Pregnancy {
  id                String  @id @default(cuid())
  patient           User    @relation(fields: [patientId], references: [id])
  patientId         String
  
  estimatedDueDate  DateTime
  gestationalAge    Int     // em semanas
  
  preNatalConsultations PreNatalConsultation[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([patientId])
}
```

#### 5.2 Forms & UI
- Formulário de pré-natal com campos específicos
- Timeline de consultas
- Dashboard de gestantes
- Alertas de alto risco

---

### 6. Atestados
**Esforço:** 30 horas | **Complexidade:** 8/10

#### 6.1 Schema
```prisma
model MedicalCertificate {
  id              String  @id @default(cuid())
  consultation    Consultation @relation(fields: [consultationId], references: [id])
  consultationId  String
  
  certificateType String  
  // "ATTENDANCE", "SHIFT", "ABSENCE", "FREE_PASS_MUNICIPAL",
  // "FREE_PASS_INTERSTATE", "EXPERTISE", "MATERNITY_LEAVE",
  // "ADDITIONAL", "PERIODIC", "DEMISSIONAL", "HEALTH"
  
  description     String?
  
  // Digital signature
  signedAt        DateTime?
  signedBy        User    @relation(fields: [signedById], references: [id])
  signedById      String
  
  certificateUrl  String?  // URL do PDF assinado
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([consultationId, signedById])
}
```

#### 6.2 Integração com Assinatura Digital
```typescript
// app/api/certificates/[id]/sign/route.ts
// Usa sistema de assinatura digital já implementado
// Gera PDF com assinatura
```

---

### 7. Sociodemografia
**Esforço:** 25 horas | **Complexidade:** 6/10

#### 7.1 Schema
```prisma
model FamilySocialData {
  id              String  @id @default(cuid())
  family          Family  @relation(fields: [familyId], references: [id])
  familyId        String
  
  // Housing
  domicileType    String  // "HOUSE", "APARTMENT", "ROOM", "OTHER"
  occupancy       String  // "OWN", "RENTED", "SHARED", "INVADED", "MORTGAGED"
  material        String  // "BRICK", "TAIPA", "WOOD", "RECYCLED", "OTHER"
  rooms           Int?    // número de cômodos
  
  // Utilities
  hasElectricity  Boolean?
  lighting        String?  // "METER", "COMMUNAL", "LANTERN", "CANDLE", "OTHER"
  
  // Water & Sanitation
  wasteDisposal   String?  // "COLLECTED", "BURNED", "OPEN", "OTHER"
  waterTreatment  String?  // "FILTERED", "BOILED", "CHLORINATED", "NONE", "OTHER"
  waterSupply     String?  // "PUBLIC", "WELL", "TRUCK", "OTHER"
  sanitation      String?  // "PUBLIC", "SEPTIC", "OPEN", "OTHER"
  
  // Healthcare coverage
  healthCoverage  String?
  hasUESF         Boolean?  // Unidade Estratégia Saúde Família
  hasUBS          Boolean?  // Unidade Básica Saúde
  hasPrivatePlan  Boolean?
  
  // Illness seeking
  seeksHospital   Boolean?
  seeksHealthUnit Boolean?
  seeksPrivate    Boolean?
  
  // Communication
  listensRadio    Boolean?
  watchesTV       Boolean?
  usesInternet    Boolean?
  
  // Community participation
  joinsCoop       Boolean?
  joinsReligious  Boolean?
  joinsAssociation Boolean?
  
  // Transport
  usesPublicTransit Boolean?
  usesCar         Boolean?
  
  // Pets
  hasBirds        Boolean?
  hasDogs         Boolean?
  hasCattle       Boolean?
  hasCats         Boolean?
  hasPigs         Boolean?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([familyId])
  @@index([familyId])
}
```

#### 7.2 Admin Interface
- Formulário com múltiplas abas
- Cálculos automáticos de vulnerabilidade
- Visualização em cards

---

### 8. Calendário Vacinal
**Esforço:** 40 horas | **Complexidade:** 8/10

#### 8.1 Schema
```prisma
model Vaccine {
  id              String  @id @default(cuid())
  name            String  @unique
  description     String?
  
  // SUS integration
  susCode         String? @unique
  
  // Application
  applicationSite String?  // "SC", "IM", "IV", "ORAL", "TOPICAL"
  doses           String?  // "3 doses"
  interval        String?  // "0, 1, 6 months"
  booster         String?
  
  // Safety
  adverseEvents   String?
  contraindications String?
  efficacy        Float?   // percentual
  
  // Calendar integration
  vaccinationSchedules VaccinationSchedule[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VaccinationSchedule {
  id              String  @id @default(cuid())
  vaccine         Vaccine @relation(fields: [vaccineId], references: [id])
  vaccineId       String
  
  ageInMonths     Int
  priority        Int
  notes           String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([vaccineId, ageInMonths])
}

model PatientVaccination {
  id              String  @id @default(cuid())
  patient         User    @relation(fields: [patientId], references: [id])
  patientId       String
  vaccine         Vaccine @relation(fields: [vaccineId], references: [id])
  vaccineId       String
  
  applicationDate DateTime
  healthUnit      HealthUnit @relation(fields: [healthUnitId], references: [id])
  healthUnitId    String
  
  doseNumber      Int
  batch           String?
  
  nextScheduledDate DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([patientId, vaccineId])
}
```

#### 8.2 Vaccination Dashboard
- Carteira vacinal do paciente
- Próximas doses
- Alertas de atraso
- Cobertura por vacina

---

### 9. Indicadores Epidemiológicos
**Esforço:** 45 horas | **Complexidade:** 9/10

#### 9.1 Schema
```prisma
model EpidemiologicalIndicator {
  id              String  @id @default(cuid())
  healthUnit      HealthUnit @relation(fields: [healthUnitId], references: [id])
  healthUnitId    String
  month           Int
  year            Int
  
  // Population
  populationCovered Int
  
  // Consultations
  consultationsCovered Float // %
  
  // Prenatal
  preNatalCoverage Float  // %
  preNatalCompleteness Float
  
  // Vaccination
  vaccinationCoverage Float
  
  // DCNT
  hypertensionPrevalence Float
  diabetesPrevalence Float
  
  // Diseases
  tuberculosisCases Int
  leprosy Cases Int
  hivCases Int
  
  // Mortality
  infantMortality Float  // per 1000
  maternalMortality Float // per 100000
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([healthUnitId, month, year])
  @@index([healthUnitId, year])
}
```

#### 9.2 Calculation Engine
```typescript
// lib/indicators/calculator.ts
export async function calculateIndicators(
  healthUnitId: string,
  month: number,
  year: number
) {
  // Calcular cada indicador baseado em dados
}
```

---

## 🔄 Sequência Recomendada de Implementação

```
Week 1-2: Hierarquia Geográfica + Microáreas
  ├─ Schema Prisma
  ├─ Migration de dados
  ├─ APIs REST
  └─ Admin CRUD

Week 3: DCNT + Epidemiologia
  ├─ Adicionar flags em Consultation
  ├─ Dashboard básico
  └─ Cálculo de indicadores

Week 4: Produção SIAB
  ├─ Schema ProductionReport
  ├─ Job de agregação
  └─ Geração de PDF

Week 5: Pré-Natal
  ├─ Schema
  ├─ Forms
  └─ Timeline

Week 6: Atestados
  ├─ Schema
  ├─ Integração com Assinatura Digital
  └─ Geração de PDF

Week 7: Sociodemografia
  ├─ Schema
  ├─ Admin Forms
  └─ Visualização de Vulnerabilidade

Week 8: Calendário Vacinal
  ├─ Schema
  ├─ Admin Setup
  ├─ Dashboard Paciente
  └─ Alertas

---

## 📌 Arquivos a Criar/Modificar

```
prisma/
├─ schema.prisma (UPDATE - +20 models)

app/api/geo/
├─ countries/route.ts
├─ states/route.ts
├─ cities/route.ts
├─ zones/route.ts
├─ districts/route.ts
├─ subprefectures/route.ts
├─ neighborhoods/route.ts
└─ microareas/route.ts

app/api/reports/
├─ production/route.ts
├─ production/[id]/pdf/route.ts
├─ epidemiology/route.ts
└─ epidemiology/[id]/pdf/route.ts

app/admin/
├─ geo/countries/page.tsx
├─ geo/states/page.tsx
├─ geo/microareas/page.tsx (NOVO)
├─ prenatal/page.tsx (NOVO)
├─ vaccinations/page.tsx (NOVO)
├─ dcnt/page.tsx (NOVO)
└─ sociodemography/page.tsx (NOVO)

app/patient/
├─ vaccinations/page.tsx (NOVO)
├─ prenatal/page.tsx (NOVO)
└─ health-record/dcnt.tsx (UPDATE)

lib/
├─ geo/index.ts (NOVO)
├─ indicators/
│  ├─ calculator.ts (NOVO)
│  └─ queries.ts (NOVO)
├─ jobs/
│  ├─ generateProductionReport.ts (NOVO)
│  └─ calculateIndicators.ts (NOVO)
└─ reports/
   ├─ productionReport.ts (NOVO)
   └─ epidemiology.ts (NOVO)

components/
├─ geo/
│  ├─ GeoSelector.tsx (NOVO)
│  └─ MicroareaMap.tsx (NOVO)
├─ prenatal/
│  ├─ PreNatalForm.tsx (NOVO)
│  └─ PreNatalTimeline.tsx (NOVO)
├─ vaccination/
│  ├─ VaccinationCard.tsx (NOVO)
│  ├─ VaccinationSchedule.tsx (NOVO)
│  └─ AlertsOverdue.tsx (NOVO)
└─ indicators/
   ├─ EpiDashboard.tsx (NOVO)
   └─ DCNTPrevalence.tsx (NOVO)

scripts/
├─ transform-ssf-geo.js (NOVO)
├─ seed-vaccines.ts (NOVO)
└─ import-legacy-data.ts (NOVO)
```

---

**Próximo passo:** Iniciar com a Hierarquia Geográfica (máxima prioridade + máximo impacto)
