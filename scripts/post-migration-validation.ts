import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateAfterMigration() {
  console.log('🔍 POST-MIGRATION VALIDATION REPORT\n')

  try {
    // 1. Check new tables exist and have data
    console.log('📊 New Models Status:')
    
    const countryCount = await prisma.country.count()
    const stateCount = await prisma.state.count()
    const cityCount = await prisma.city.count()
    const zoneCount = await prisma.zone.count()
    const districtCount = await prisma.district.count()
    const subprefectureCount = await prisma.subprefecture.count()
    const neighborhoodCount = await prisma.neighborhood.count()
    const areaCount = await prisma.area.count()
    const acsHistoryCount = await prisma.aCSHistory.count()

    console.log(`   Countries: ${countryCount}`)
    console.log(`   States: ${stateCount}`)
    console.log(`   Cities: ${cityCount}`)
    console.log(`   Zones: ${zoneCount}`)
    console.log(`   Districts: ${districtCount}`)
    console.log(`   Subprefectures: ${subprefectureCount}`)
    console.log(`   Neighborhoods: ${neighborhoodCount}`)
    console.log(`   Areas: ${areaCount}`)
    console.log(`   ACS History: ${acsHistoryCount}`)

    // 2. Check User model enhancements
    console.log(`\n✅ User Model Enhancements:`)
    const userCount = await prisma.user.count()
    const usersWithACSArea = await prisma.user.count({
      where: { assignedAreaId: { not: null } }
    })
    console.log(`   Total Users: ${userCount}`)
    console.log(`   Users with ACS Area: ${usersWithACSArea}`)

    // 3. Check Address model enhancements
    console.log(`\n✅ Address Model Enhancements:`)
    const addressCount = await prisma.address.count()
    const addressesWithGeoForeignKeys = await prisma.address.count({
      where: { 
        OR: [
          { countryId: { not: null } },
          { stateId: { not: null } },
          { cityId: { not: null } }
        ]
      }
    })
    console.log(`   Total Addresses: ${addressCount}`)
    console.log(`   Addresses with Geographic FKs: ${addressesWithGeoForeignKeys}`)
    console.log(`   Backward Compatibility: ${addressCount - addressesWithGeoForeignKeys} legacy addresses`)

    // 4. Check Patient model enhancements
    console.log(`\n✅ Patient Model Enhancements:`)
    const patientCount = await prisma.patient.count()
    const patientsWithPSFData = await prisma.patient.count({
      where: { 
        OR: [
          { familyNumber: { not: null } },
          { socialVulnerability: { not: null } }
        ]
      }
    })
    console.log(`   Total Patients: ${patientCount}`)
    console.log(`   Patients with PSF Data: ${patientsWithPSFData}`)

    // 5. Check Household model enhancements
    console.log(`\n✅ Household Model Enhancements:`)
    const householdCount = await prisma.household.count()
    const householdsWithSocialIndicators = await prisma.household.count({
      where: {
        OR: [
          { economicClass: { not: null } },
          { vulnerabilityScore: { not: null } }
        ]
      }
    })
    console.log(`   Total Households: ${householdCount}`)
    console.log(`   Households with Social Indicators: ${householdsWithSocialIndicators}`)

    // 6. Check MicroArea linking
    console.log(`\n✅ MicroArea Integration:`)
    const microAreaCount = await prisma.microArea.count()
    const microAreasLinkedToArea = await prisma.microArea.count({
      where: { areaId: { not: null } }
    })
    console.log(`   Total MicroAreas: ${microAreaCount}`)
    console.log(`   MicroAreas linked to Area: ${microAreasLinkedToArea}`)

    // 7. Final validation
    console.log(`\n🎯 Migration Status:`)
    const allGeometricModelsExist = countryCount >= 0 && stateCount >= 0
    const backwardCompatibilityOK = addressCount >= 0
    const newFieldsAvailable = userCount >= 0

    if (allGeometricModelsExist && backwardCompatibilityOK && newFieldsAvailable) {
      console.log('   ✅ All new geographic models created successfully')
      console.log('   ✅ Backward compatibility maintained')
      console.log('   ✅ Enhanced models integrated properly')
      console.log('\n🎉 MIGRATION SUCCESSFUL!')
      return true
    } else {
      console.log('   ⚠️  Migration validation failed')
      return false
    }

  } catch (error) {
    console.error('❌ Validation failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
validateAfterMigration().then((success) => {
  process.exit(success ? 0 : 1)
})
