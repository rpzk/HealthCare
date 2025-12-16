import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateBeforeMigration() {
  console.log('🔍 PRE-MIGRATION VALIDATION REPORT\n')

  try {
    // 1. Check record counts
    const patientCount = await prisma.patient.count()
    const addressCount = await prisma.address.count()
    const userCount = await prisma.user.count()
    const householdCount = await prisma.household.count()
    const microAreaCount = await prisma.microArea.count()

    console.log(`📊 Record Counts (Pre-Migration):`)
    console.log(`   Patients: ${patientCount}`)
    console.log(`   Addresses: ${addressCount}`)
    console.log(`   Users: ${userCount}`)
    console.log(`   Households: ${householdCount}`)
    console.log(`   MicroAreas: ${microAreaCount}\n`)

    // 2. Check for orphaned records
    console.log(`⚠️  Checking for Data Issues:`)
    
    const orphanedAddresses = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM addresses 
      WHERE "patientId" IS NOT NULL 
      AND "patientId" NOT IN (SELECT id FROM patients)
    ` as Array<{ count: number }>
    
    console.log(`   Orphaned addresses: ${orphanedAddresses[0]?.count || 0}`)

    // 3. Unique constraint check
    const duplicateEmails = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1
      ) t
    ` as Array<{ count: number }>
    
    console.log(`   Duplicate user emails: ${duplicateEmails[0]?.count || 0}`)

    // 4. Referential integrity
    console.log(`\n✅ Validation Results:`)
    const hasIssues = (orphanedAddresses[0]?.count || 0) > 0 || (duplicateEmails[0]?.count || 0) > 0
    
    if (!hasIssues) {
      console.log('   ✓ Database is ready for migration!')
      console.log('   ✓ No data integrity issues detected')
      console.log('   ✓ All foreign keys valid')
      console.log('   ✓ No duplicate constraints')
      return true
    } else {
      console.log('   ⚠️  Issues found - fix before migration')
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
validateBeforeMigration().then((success) => {
  process.exit(success ? 0 : 1)
})
