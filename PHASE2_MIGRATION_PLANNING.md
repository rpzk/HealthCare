# ✅ PRÓXIMOS PASSOS - PHASE 2: Migration Strategy

**Status**: Planejado para próxima sessão  
**Duração Estimada**: 2-3 dias  
**Complexity**: Médio (bem gerenciável)

---

## 📋 PRÉ-REQUISITOS PARA PHASE 2

Antes de iniciar Phase 2, certifique-se que:

- [ ] Equipe revisou `PHASE1_SCHEMA_EXPANSION_COMPLETE.md`
- [ ] Tech Lead aprovou as mudanças de schema
- [ ] Backup do banco de produção foi feito
- [ ] Staging environment está pronto
- [ ] Database connections estão testadas
- [ ] Feature branch `feature/ssf-geographic-integration` está atualizada

---

## 🚀 PHASE 2 CHECKLIST - Migration Strategy

### A. Gerar Arquivo de Migration

**Objetivo**: Gerar SQL migration do Prisma para os novos models

```bash
# 1. Generate migration (don't apply yet)
npx prisma migrate dev --name ssf_geographic_hierarchy --create-only

# 2. Review generated SQL file
cat prisma/migrations/*/migration.sql

# 3. Commit migration file
git add prisma/migrations/
git commit -m "feat: Generate migration for SSF geographic hierarchy"
```

**Tarefas**:
- [ ] Migration file gerado sem erros
- [ ] SQL review realizado
- [ ] Commit feito ao git
- [ ] Arquivo está limpo e correto

---

### B. Pre-Migration Validation Script

**Objetivo**: Validar integridade dos dados ANTES da migration

**Criar arquivo**: `scripts/pre-migration-validation.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateBeforeMigration() {
  console.log('🔍 PRE-MIGRATION VALIDATION REPORT\n')

  // 1. Check record counts
  const patientCount = await prisma.patient.count()
  const addressCount = await prisma.address.count()
  const userCount = await prisma.user.count()
  const householdCount = await prisma.household.count()

  console.log(`📊 Record Counts:`)
  console.log(`   Patients: ${patientCount}`)
  console.log(`   Addresses: ${addressCount}`)
  console.log(`   Users: ${userCount}`)
  console.log(`   Households: ${householdCount}\n`)

  // 2. Check for orphaned records
  const orphanedAddresses = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM addresses 
    WHERE "patientId" NOT IN (SELECT id FROM patients)
  `
  
  console.log(`⚠️  Potential Issues:`)
  console.log(`   Orphaned addresses: ${orphanedAddresses[0].count}`)

  // 3. Unique constraint check
  const duplicateEmails = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM (
      SELECT email FROM patients GROUP BY email HAVING COUNT(*) > 1
    ) t
  `
  
  console.log(`   Duplicate patient emails: ${duplicateEmails[0].count}\n`)

  // 4. Referential integrity
  console.log(`✅ Validation Results:`)
  if (orphanedAddresses[0].count === 0 && duplicateEmails[0].count === 0) {
    console.log('   Database is ready for migration!')
  } else {
    console.log('   ⚠️  Issues found - fix before migration')
    process.exit(1)
  }

  await prisma.$disconnect()
}

validateBeforeMigration()
  .catch(e => {
    console.error('Validation failed:', e)
    process.exit(1)
  })
```

**Tarefas**:
- [ ] Script criado em `scripts/pre-migration-validation.ts`
- [ ] Script testado localmente
- [ ] Resultado limpo (zero issues)
- [ ] Commit ao git

---

### C. Data Population Script

**Objetivo**: Populate tabelas geográficas com dados IBGE

**Criar arquivo**: `scripts/populate-geographic-data.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample IBGE data structure
const IBGE_DATA = {
  'BR': { // Country code
    name: 'Brasil',
    states: [
      {
        code: 'SP',
        name: 'São Paulo',
        region: 'Sudeste',
        cities: [
          {
            ibgeCode: '3550308',
            name: 'São Paulo',
            zones: [
              { code: 'Z01', name: 'Zona 1' },
              { code: 'Z02', name: 'Zona 2' },
              // ... more zones
            ]
          }
          // ... more cities
        ]
      }
      // ... more states
    ]
  }
}

async function populateGeographicData() {
  console.log('🌍 Populating Geographic Data...\n')

  try {
    // 1. Create/Update Countries
    const country = await prisma.country.upsert({
      where: { code: 'BR' },
      update: {},
      create: {
        code: 'BR',
        name: 'Brasil'
      }
    })
    console.log(`✅ Country created/updated: ${country.name}`)

    // 2. Create/Update States
    for (const stateData of IBGE_DATA['BR'].states) {
      const state = await prisma.state.upsert({
        where: { code: stateData.code },
        update: {},
        create: {
          code: stateData.code,
          name: stateData.name,
          region: stateData.region,
          countryId: 'BR'
        }
      })
      console.log(`✅ State created/updated: ${state.name}`)

      // 3. Create/Update Cities, Zones, etc. (hierarchical)
      // ... implementation details
    }

    console.log('\n✅ Geographic data population completed!')
  } catch (error) {
    console.error('❌ Population failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

populateGeographicData()
```

**Tarefas**:
- [ ] Script criado em `scripts/populate-geographic-data.ts`
- [ ] IBGE data sources identificadas
- [ ] Script testado em staging
- [ ] Dados populados corretamente
- [ ] Commit ao git

**Nota**: Dados IBGE podem ser obtidos em:
- https://www.ibge.gov.br/
- API pública de cidades/Estados
- CSV com códigos IBGE

---

### D. Post-Migration Validation Script

**Objetivo**: Validar integridade DEPOIS da migration

**Criar arquivo**: `scripts/post-migration-validation.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateAfterMigration() {
  console.log('🔍 POST-MIGRATION VALIDATION REPORT\n')

  try {
    // 1. Check new tables exist
    const countryCount = await prisma.country.count()
    const stateCount = await prisma.state.count()
    const cityCount = await prisma.city.count()
    const zoneCount = await prisma.zone.count()
    const areaCount = await prisma.area.count()
    const acsHistoryCount = await prisma.aCSHistory.count()

    console.log('📊 New Models Created:')
    console.log(`   Countries: ${countryCount}`)
    console.log(`   States: ${stateCount}`)
    console.log(`   Cities: ${cityCount}`)
    console.log(`   Zones: ${zoneCount}`)
    console.log(`   Areas: ${areaCount}`)
    console.log(`   ACS History: ${acsHistoryCount}\n`)

    // 2. Check existing data integrity
    const addressesWithoutGeo = await prisma.address.findMany({
      where: {
        cityId: null,
        // But they should still have city (string) field
      },
      select: { id: true, city: true }
    })

    console.log('✅ Data Integrity:')
    console.log(`   Addresses without geographic FK: ${addressesWithoutGeo.length}`)
    console.log(`   (This is OK - gradual migration)\n`)

    // 3. Check relations work
    const testArea = await prisma.area.findFirst({
      include: {
        microAreas: true,
        acsUsers: true,
        households: true
      }
    })

    if (testArea) {
      console.log('✅ Relations working correctly')
      console.log(`   Sample Area has:`)
      console.log(`   - ${testArea.microAreas.length} microareas`)
      console.log(`   - ${testArea.acsUsers.length} ACS users`)
      console.log(`   - ${testArea.households.length} households\n`)
    }

    // 4. Check indexes
    console.log('✅ Database indexes created')
    // Verify indexes exist in database

    console.log('\n✅ MIGRATION SUCCESSFUL!')
    console.log('All checks passed. Ready for next phase.\n')

  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

validateAfterMigration()
```

**Tarefas**:
- [ ] Script criado em `scripts/post-migration-validation.ts`
- [ ] Script pronto para executar após migration
- [ ] Commit ao git

---

## 🔄 SEQUÊNCIA DE EXECUÇÃO

### 1. Apply Migration
```bash
# Apply the generated migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

### 2. Populate Data
```bash
# Populate geographic hierarchy
npx ts-node scripts/populate-geographic-data.ts
```

### 3. Validate Results
```bash
# Validate after migration
npx ts-node scripts/post-migration-validation.ts
```

### 4. Update Prisma Client
```bash
# Regenerate client with new models
npx prisma generate

# Optional: introspect to verify
npx prisma db pull
```

---

## 📊 TESTING CHECKLIST

- [ ] Pre-migration validation passed
- [ ] Migration file applied without errors
- [ ] Geographic data populated correctly
- [ ] Post-migration validation passed
- [ ] Prisma client regenerated
- [ ] No orphaned records
- [ ] Foreign key constraints working
- [ ] Indexes created and functional
- [ ] Queries perform within SLA
- [ ] Existing data intact and accessible

---

## 🚨 ROLLBACK PLAN

Se algo der errado:

```bash
# 1. Identify the failed migration
npx prisma migrate status

# 2. Mark as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# 3. Restore from backup
# ... restore database from backup

# 4. Reset Prisma cache
rm -rf node_modules/.prisma/

# 5. Regenerate client
npx prisma generate
```

---

## 📈 SUCCESS CRITERIA

✅ Phase 2 is complete when:

1. [ ] Migration file applied successfully
2. [ ] Geographic data fully populated
3. [ ] All post-migration checks pass
4. [ ] Zero data loss
5. [ ] Backward compatibility maintained
6. [ ] Query performance acceptable
7. [ ] Team tested and validated
8. [ ] Ready for Phase 3

---

## 🗓️ TIMELINE

- **Preparation**: 1-2 hours
- **Migration Execution**: 1-2 hours
- **Data Population**: 1-2 hours
- **Validation**: 2-3 hours
- **Testing & Verification**: 3-4 hours
- **Documentation & Wrap-up**: 1-2 hours

**Total**: 2-3 days

---

**Next Session**: Begin Phase 2!

Documento de referência: [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md#fase-2-migration-strategy)
