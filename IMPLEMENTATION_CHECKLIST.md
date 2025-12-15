# ✅ CHECKLIST DE IMPLEMENTAÇÃO - SISTEMA PRONTO PARA SSF

**Status**: Guia de ação prático e sequencial

---

## 🎯 ANTES DE INICIAR (PRÉ-REQUISITOS)

- [ ] Equipe revisou `STRATEGIC_REVIEW_RESULT.md`
- [ ] Equipe revisou `CONFLICT_ANALYSIS_DETAILED.md`
- [ ] Backup completo do banco de produção criado
- [ ] Ambiente de staging preparado
- [ ] Git branch feature criado: `feature/ssf-geographic-integration`
- [ ] Feature flags configuradas em `.env`

---

## FASE 1: SCHEMA EXPANSION (1-2 DIAS)

### Modelos Geográficos

#### [ ] City Model
```prisma
model City {
  id        String   @id @default(cuid())
  ibgeCode  String   @unique  // IBGE 7-digit code
  name      String
  state     String   @db.Char(2)  // UF code
  region    String?  // Região (Sul, Sudeste, etc)
  
  // Relations
  zones     Zone[]
  addresses Address[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([state, name])
  @@map("cities")
}
```

- [ ] Criar arquivo `prisma/migrations/xxx_create_city_model.sql`
- [ ] Adicionar validação em `lib/validation-schemas.ts`
- [ ] Test no banco sandbox

#### [ ] Zone Model
```prisma
model Zone {
  id        String   @id @default(cuid())
  code      String?
  name      String
  
  cityId    String
  city      City     @relation(fields: [cityId], references: [id], onDelete: Cascade)
  
  districts District[]
  addresses Address[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([cityId, name])
  @@index([cityId])
  @@map("zones")
}
```

- [ ] Criar model
- [ ] Test relação City → Zone
- [ ] Verificar indexes

#### [ ] District Model
```prisma
model District {
  id        String   @id @default(cuid())
  code      String?
  name      String
  
  zoneId    String
  zone      Zone     @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  
  subprefectures Subprefecture[]
  addresses Address[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([zoneId, name])
  @@index([zoneId])
  @@map("districts")
}
```

- [ ] Criar model
- [ ] Test relação Zone → District
- [ ] Verificar cascades

#### [ ] Subprefecture Model
```prisma
model Subprefecture {
  id        String   @id @default(cuid())
  code      String?
  name      String
  
  districtId String
  district  District @relation(fields: [districtId], references: [id], onDelete: Cascade)
  
  neighborhoods Neighborhood[]
  addresses Address[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([districtId, name])
  @@index([districtId])
  @@map("subprefectures")
}
```

- [ ] Criar model
- [ ] Test com District

#### [ ] Neighborhood Model
```prisma
model Neighborhood {
  id        String   @id @default(cuid())
  code      String?
  name      String
  
  subprefectureId String
  subprefecture   Subprefecture @relation(fields: [subprefectureId], references: [id], onDelete: Cascade)
  
  areas     Area[]
  addresses Address[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([subprefectureId, name])
  @@index([subprefectureId])
  @@map("neighborhoods")
}
```

- [ ] Criar model
- [ ] Test com Subprefecture

#### [ ] Area Model
```prisma
model Area {
  id        String   @id @default(cuid())
  code      String?
  name      String
  
  neighborhoodId String
  neighborhood   Neighborhood @relation(fields: [neighborhoodId], references: [id], onDelete: Cascade)
  
  microAreas MicroArea[]
  addresses  Address[]
  acsUsers   User[]  // ACS designados a esta área
  households Household[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([neighborhoodId, name])
  @@index([neighborhoodId])
  @@map("areas")
}
```

- [ ] Criar model
- [ ] Adicionar FK a MicroArea: `areaId String?`
- [ ] Adicionar FK a MicroArea relation

#### [ ] Update MicroArea
```prisma
model MicroArea {
  // ... existing fields
  
  areaId      String?
  area        Area?   @relation(fields: [areaId], references: [id], onDelete: SetNull)
  
  // ... rest of model
  
  @@index([areaId])
  // Keep existing indexes
}
```

- [ ] Adicionar areaId FK
- [ ] Adicionar relation
- [ ] Test integração completa

### User e ACS Management

#### [ ] Update User Model
```prisma
model User {
  // ... existing fields
  
  // ACS Assignment
  acsAssignedMicroAreaId  String?
  acsAssignedMicroArea    MicroArea? @relation("ACSMicroArea", fields: [acsAssignedMicroAreaId], references: [id])
  
  assignedAreaId          String?
  assignedArea            Area?      @relation(fields: [assignedAreaId], references: [id])
  
  acsHistory              ACSHistory[]
  
  // ... rest of model
  
  @@index([acsAssignedMicroAreaId])
  @@index([assignedAreaId])
}
```

- [ ] Adicionar fields
- [ ] Adicionar relations
- [ ] Validar backward compatibility

#### [ ] Create ACSHistory Model
```prisma
model ACSHistory {
  id              String   @id @default(cuid())
  
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  microAreaId     String?
  microArea       MicroArea? @relation(fields: [microAreaId], references: [id], onDelete: SetNull)
  
  areaId          String?
  area            Area?      @relation(fields: [areaId], references: [id], onDelete: SetNull)
  
  assignedAt      DateTime @default(now())
  unassignedAt    DateTime?
  assignmentReason String?
  assignedByUserId String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([userId, assignedAt desc])
  @@index([microAreaId])
  @@index([areaId])
  @@map("acs_history")
}
```

- [ ] Criar model
- [ ] Test cascades
- [ ] Test indexes

### Patient e Household Expansion

#### [ ] Update Patient Model
```prisma
model Patient {
  // ... existing fields
  
  // PSF/Família
  rg              String?       // RG or equivalent ID
  rgState         String?       // State code where RG was issued
  fatherName      String?
  
  familyNumber    String?       // "001.0001.0001" format from SSF
  sequenceInFamily Int?         // Order in family (1, 2, 3...)
  
  // Social Assessment
  socialVulnerability String?    // LOW, MEDIUM, HIGH (or numeric 0-100)
  economicClass       String?    // A, B, C, D, E
  monthlyFamilyIncome Float?     // In BRL
  
  // Location
  preferredAddressId String?
  preferredAddress    Address?   @relation("PreferredAddress", fields: [preferredAddressId], references: [id])
  
  // ... rest of relations
  
  @@index([familyNumber, sequenceInFamily])
  @@index([preferredAddressId])
  @@index([socialVulnerability])
}

// Add new relation to Address:
model Address {
  // ... existing fields
  patientsPreferring Patient[] @relation("PreferredAddress")
}
```

- [ ] Adicionar fields ao Patient
- [ ] Adicionar relação Address.patientsPreferring
- [ ] Criar índices compostos
- [ ] Test queries de família

#### [ ] Update Household Model
```prisma
model Household {
  // ... existing fields
  
  // Update reference to MicroArea (was string)
  microArea       String?      // Keep for backward compatibility
  microAreaId     String?      // New FK
  microAreaObj    MicroArea?   @relation(fields: [microAreaId])
  
  // Geographic hierarchy
  areaId          String?
  area            Area?        @relation(fields: [areaId])
  
  // Social indicators
  monthlyIncome   Float?
  economicClass   String?      // A, B, C, D, E
  numberOfRooms   Int?
  hasWater        Boolean?     @default(false)
  hasElectricity  Boolean?     @default(false)
  hasSewage       Boolean?     @default(false)
  hasGarbage      Boolean?     @default(false)
  vulnerabilityScore Float?    // 0-100
  
  // Relations
  members Patient[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([microAreaId])
  @@index([areaId])
  @@index([vulnerabilityScore])
}
```

- [ ] Adicionar fields
- [ ] Adicionar relações
- [ ] Criar migration com defaults
- [ ] Test backward compatibility

#### [ ] Update Address Model
```prisma
model Address {
  // Keep ALL existing fields
  id           String  @id @default(cuid())
  street       String
  number       String?
  complement   String?
  neighborhood String?  // Keep for compatibility
  city         String   // Keep for compatibility
  state        String   // Keep for compatibility
  zipCode      String?
  latitude     Float?
  longitude    Float?
  isPrimary    Boolean @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  patientId    String?
  microAreaId  String?
  
  // ADD New Geographic FKs
  cityId         String?
  zoneId         String?
  districtId     String?
  subprefectureId String?
  neighborhoodId String?  // Different from string field above
  areaId         String?
  // microAreaId  // Keep existing
  
  // Relations
  patient      Patient?        @relation(fields: [patientId], references: [id])
  microArea    MicroArea?      @relation(fields: [microAreaId], references: [id])
  
  city         City?           @relation(fields: [cityId])
  zone         Zone?           @relation(fields: [zoneId])
  district     District?       @relation(fields: [districtId])
  subprefecture Subprefecture? @relation(fields: [subprefectureId])
  neighborhood Neighborhood?   @relation(fields: [neighborhoodId])
  area         Area?           @relation(fields: [areaId])
  
  residents    PersonAddress[]
  places       Place[]
  patientsPreferring Patient[] @relation("PreferredAddress")
  
  @@index([patientId])
  @@index([microAreaId])
  @@index([cityId])
  @@index([zoneId])
  @@index([districtId])
  @@index([neighborhoodId])
  @@index([areaId])
  @@index([latitude, longitude])
  @@index([cityId, zoneId, districtId])  // Composite for hierarchy queries
  @@map("addresses")
}
```

- [ ] Adicionar todos os FKs
- [ ] Adicionar todas as relations
- [ ] Test para não quebrar queries existentes
- [ ] Run migration e validar

---

## FASE 2: MIGRATION STRATEGY (2-3 DIAS)

#### [ ] Pre-migration Validation
```bash
# Check patient count
SELECT COUNT(*) FROM patients;

# Check addresses count
SELECT COUNT(*) FROM addresses;

# Verify referential integrity
SELECT * FROM addresses WHERE "patientId" NOT IN (SELECT id FROM patients);
```

- [ ] Run validation scripts
- [ ] Document any data issues
- [ ] Fix orphaned records

#### [ ] Create Migration Files
- [ ] `prisma/migrations/xxx_add_geographic_hierarchy.sql`
- [ ] `prisma/migrations/xxx_expand_patient_household.sql`
- [ ] `prisma/migrations/xxx_add_acs_management.sql`

```bash
# Generate migrations
npx prisma migrate dev --name add_geographic_hierarchy
npx prisma migrate dev --name expand_patient_household  
npx prisma migrate dev --name add_acs_management
```

- [ ] Review generated SQL
- [ ] Test on staging DB
- [ ] Create rollback scripts

#### [ ] Data Population Scripts
- [ ] Script para inicializar tabelas geográficas (IBGE codes)
- [ ] Script para mapear endereços atuais para hierarquia
- [ ] Script para validar integridade após migration

```typescript
// scripts/populate-geographic-hierarchy.ts
// Será implementado na Fase 3
```

#### [ ] Validation After Migration
```bash
# Verify foreign keys
SELECT COUNT(*) FROM addresses WHERE "cityId" IS NOT NULL;

# Check data integrity
SELECT COUNT(*) FROM addresses WHERE "areaId" IS NULL AND "microAreaId" IS NOT NULL;

# Verify indexes created
SELECT indexname FROM pg_indexes WHERE tablename = 'addresses';
```

- [ ] All FKs properly set
- [ ] No orphaned records
- [ ] All indexes created
- [ ] Query performance acceptable

---

## FASE 3: BACKEND SERVICE UPDATES (3-4 DIAS)

### [ ] Expand AddressService

**File**: `lib/address-service.ts`

- [ ] Add methods for geographic hierarchy queries
  ```typescript
  static async getGeographicHierarchy(cityId: string): Promise<GeoHierarchy>
  static async findAddressesByArea(areaId: string): Promise<Address[]>
  static async findAddressesByMicroArea(microAreaId: string): Promise<Address[]>
  static async getAddressWithHierarchy(addressId: string): Promise<AddressWithHierarchy>
  ```

- [ ] Add validation for geographic data
  ```typescript
  static async validateGeographicPath(address: AddressInput): Promise<boolean>
  ```

- [ ] Optimize geographic lookups with caching
  ```typescript
  private static geoCache = new Map<string, GeographicData>()
  ```

### [ ] Create ACS Management Service

**File**: `lib/acs-service.ts` (NEW)

```typescript
export class ACSService {
  static async assignACSToArea(userId: string, areaId: string, reason?: string)
  static async unassignACS(userId: string)
  static async getACSForArea(areaId: string): Promise<User[]>
  static async getACSHistory(userId: string): Promise<ACSHistory[]>
  static async validateACSCoverage(addressId: string): Promise<ACSValidation>
  static async getACSStatistics(areaId: string): Promise<ACSStats>
}
```

- [ ] Criar arquivo
- [ ] Implementar métodos
- [ ] Adicionar validações
- [ ] Create tests

### [ ] Create Patient Service Enhancement

**File**: `lib/patient-service.ts` (NEW or expand)

```typescript
export class PatientService {
  static async enrollPatientPSF(patientId: string, familyNumber: string, sequence: number)
  static async getFamily(familyNumber: string): Promise<Patient[]>
  static async calculateSocialVulnerability(patientId: string): Promise<number>
  static async getPatientsByArea(areaId: string): Promise<Patient[]>
  static async getPatientsByMicroArea(microAreaId: string): Promise<Patient[]>
}
```

- [ ] Criar arquivo
- [ ] Implementar métodos
- [ ] Add business logic
- [ ] Create tests

### [ ] Update Validation Schemas

**File**: `lib/validation-schemas.ts`

- [ ] Add geographic validation schemas
- [ ] Add PSF enrollment schemas
- [ ] Add ACS assignment schemas
- [ ] Update address schema with new fields
- [ ] Test all schemas

---

## FASE 4: API ROUTES (3-4 DIAS)

### [ ] Geographic Hierarchy Endpoints

**File**: `app/api/geographic/` (NEW FOLDER)

#### [ ] Cities Route
```typescript
// app/api/geographic/cities/route.ts
GET  /api/geographic/cities
GET  /api/geographic/cities/:id
POST /api/geographic/cities
PATCH /api/geographic/cities/:id
DELETE /api/geographic/cities/:id
```

- [ ] Criar arquivo
- [ ] Implement CRUD
- [ ] Add auth check
- [ ] Add validation
- [ ] Add error handling
- [ ] Create tests

#### [ ] Zones Route
```typescript
// app/api/geographic/zones/route.ts
GET  /api/geographic/zones
GET  /api/geographic/zones/:id
GET  /api/geographic/cities/:cityId/zones
POST /api/geographic/zones
PATCH /api/geographic/zones/:id
DELETE /api/geographic/zones/:id
```

- [ ] Similar pattern to Cities
- [ ] Implement all methods
- [ ] Add relationship validation

#### [ ] Districts, Subprefectures, Neighborhoods, Areas
- [ ] Follow same pattern
- [ ] Create all route files
- [ ] Implement all methods
- [ ] Add comprehensive validation

### [ ] Geographic Tree/Hierarchy Endpoint

**File**: `app/api/geographic/tree/route.ts`

```typescript
GET /api/geographic/tree?cityId=...
Response: {
  city: City,
  zones: [
    { zone, districts: [ ... ] }
  ]
}
```

- [ ] Implement tree structure response
- [ ] Add caching
- [ ] Optimize for performance

### [ ] ACS Management Endpoints

**File**: `app/api/acs/` (NEW FOLDER)

#### [ ] Assign/Unassign Routes
```typescript
// app/api/acs/assign/route.ts
POST /api/acs/assign
{
  userId: string
  areaId: string
  microAreaId: string
  reason?: string
}

// app/api/acs/unassign/route.ts
POST /api/acs/unassign/:userId
```

- [ ] Implement assignment logic
- [ ] Add validation
- [ ] Create history records
- [ ] Add auth/authorization

#### [ ] History Routes
```typescript
// app/api/acs/history/route.ts
GET /api/acs/history/:userId
GET /api/acs/areas/:areaId/staff
```

- [ ] Implement queries
- [ ] Add pagination
- [ ] Add filtering

### [ ] Patient PSF Endpoints

**File**: `app/api/patients/` (EXPAND)

- [ ] PATCH `/api/patients/:id/psf-enroll`
  ```typescript
  {
    familyNumber: string
    sequenceInFamily: number
    socialVulnerability: string
  }
  ```

- [ ] GET `/api/patients/family/:familyNumber`
- [ ] GET `/api/patients/area/:areaId`
- [ ] GET `/api/patients/microarea/:microAreaId`

### [ ] Household Enhancement Endpoints

**File**: `app/api/households/` (EXPAND)

- [ ] PATCH `/api/households/:id`
  - Support new fields (income, vulnerability, etc)
- [ ] GET `/api/households/area/:areaId`
- [ ] GET `/api/households/microarea/:microAreaId`

### [ ] Address Endpoint Updates

**File**: `app/api/addresses/` (EXPAND)

- [ ] Update existing routes para suportar new geographic fields
- [ ] Add new query parameters:
  ```
  ?cityId=...&zoneId=...&districtId=...
  ```
- [ ] Implement geographic filtering

---

## FASE 5: FRONTEND COMPONENTS (3-4 DIAS)

### [ ] Geographic Selector Component

**File**: `components/geographic/geographic-selector.tsx`

```typescript
interface GeographicSelectorProps {
  value?: {
    cityId?: string
    zoneId?: string
    districtId?: string
    neighborhoodId?: string
    areaId?: string
    microAreaId?: string
  }
  onChange: (selected: typeof value) => void
  required?: boolean
}
```

- [ ] Create component with cascading dropdowns
- [ ] Load data from API
- [ ] Handle async loading
- [ ] Show selected path
- [ ] Implement clear functionality

### [ ] Geographic Tree Component

**File**: `components/geographic/geographic-tree.tsx`

- [ ] Visualize complete hierarchy
- [ ] Expandable tree nodes
- [ ] Show population/stats per level
- [ ] Allow selection

### [ ] ACS Assignment Component

**File**: `components/acs/acs-assignment-form.tsx`

- [ ] User selector
- [ ] Area selector (using GeographicSelector)
- [ ] Reason field
- [ ] Submit handler
- [ ] Success/error messages

### [ ] ACS History Component

**File**: `components/acs/acs-history.tsx`

- [ ] Timeline of assignments
- [ ] Show assigned/unassigned dates
- [ ] Filter by date range
- [ ] Export functionality

### [ ] Patient PSF Form

**File**: `components/patient/patient-psf-form.tsx`

- [ ] Family number input
- [ ] Sequence in family
- [ ] Social vulnerability selector
- [ ] Economic class selector
- [ ] Monthly income input
- [ ] Validation

### [ ] Update AddressForm

**File**: `components/addresses/address-form.tsx`

- [ ] Add GeographicSelector integration
- [ ] Auto-fill from selection
- [ ] Backward compatible (keep existing)
- [ ] Show hierarchy path

### [ ] Update PatientForm

**File**: `components/patient/patient-form.tsx`

- [ ] Add new fields (RG, father name, etc)
- [ ] Add PSF section
- [ ] Social vulnerability assessment
- [ ] Preferred address selector

### [ ] Household Form Expansion

**File**: `components/household/household-form-expanded.tsx`

- [ ] Geographic hierarchy selector
- [ ] Social indicators (income, utilities)
- [ ] Vulnerability score calculator
- [ ] Family type selector

---

## FASE 6: TESTING & VALIDATION (2-3 DIAS)

### [ ] Unit Tests

- [ ] AddressService tests
- [ ] ACSService tests
- [ ] PatientService tests
- [ ] Validation schema tests

### [ ] Integration Tests

- [ ] API endpoint tests
- [ ] Database migration tests
- [ ] Data consistency tests
- [ ] Geographic hierarchy queries

### [ ] E2E Tests

- [ ] Complete flow: Create patient with family
- [ ] Assign ACS to area
- [ ] Create address with full hierarchy
- [ ] Query patients by area/micro-area

### [ ] Performance Tests

- [ ] Geographic hierarchy query performance
- [ ] ACS history retrieval performance
- [ ] Patient family queries
- [ ] Index effectiveness

### [ ] Data Validation

- [ ] No orphaned records
- [ ] All foreign keys valid
- [ ] Referential integrity
- [ ] Backward compatibility with existing data

---

## FASE 7: DEPLOYMENT & MONITORING (1-2 DIAS)

### [ ] Pre-deployment

- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Team trained

### [ ] Deployment Steps

1. [ ] Create backup of production DB
2. [ ] Deploy migration to production
3. [ ] Run data population scripts
4. [ ] Validate migration on production
5. [ ] Deploy new backend code
6. [ ] Deploy new frontend code
7. [ ] Smoke tests on production

### [ ] Post-deployment

- [ ] Monitor error logs
- [ ] Check query performance
- [ ] Verify data integrity
- [ ] User acceptance testing
- [ ] Performance monitoring

---

## 🚀 QUICK START COMMAND REFERENCE

```bash
# Create new branch
git checkout -b feature/ssf-geographic-integration

# Create migrations
npx prisma migrate dev --name add_geographic_hierarchy
npx prisma migrate dev --name expand_patient_household
npx prisma migrate dev --name add_acs_management

# Regenerate Prisma client
npx prisma generate

# Run tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Deploy to production
npm run deploy:prod
```

---

## 📊 PROGRESS TRACKING

Track completion in this format:

```markdown
## Progress Summary

### Phase 1: Schema Expansion
- City Model: ✅ Done / ⏳ In Progress / ❌ Not Started
- Zone Model: ✅ Done / ⏳ In Progress / ❌ Not Started
- District Model: ✅ Done / ⏳ In Progress / ❌ Not Started
- ... (continue for all)

### Overall Timeline
- Start: YYYY-MM-DD
- Expected End: YYYY-MM-DD
- Current Progress: X%
```

---

**Document Status**: Ready for Implementation  
**Last Updated**: 2025-01-15  
**Estimated Total Duration**: 3-4 weeks (including all phases)
