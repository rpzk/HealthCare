
import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'

const args = process.argv.slice(2)

if (args.length < 4) {
  console.log('Usage: npx tsx create-user.ts <name> <email> <password> <role> [licenseNumber] [licenseType] [speciality]')
  console.log('Available Roles: ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, HEALTH_AGENT, TECHNICIAN, PHARMACIST, DENTIST, NUTRITIONIST, SOCIAL_WORKER, OTHER')
  process.exit(1)
}

const [name, email, password, role, licenseNumber, licenseType, speciality] = args

const validRoles = [
  'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 
  'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'HEALTH_AGENT', 
  'TECHNICIAN', 'PHARMACIST', 'DENTIST', 
  'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER'
]

if (!validRoles.includes(role.toUpperCase())) {
    console.error(`Invalid Role. Available: ${validRoles.join(', ')}`)
    process.exit(1)
}

async function createUser() {
  try {
    console.log(`🔧 Creating user ${role}...`)
    
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase() as any,
        // Map legacy crmNumber if it's a doctor and licenseType is CRM
        crmNumber: (role.toUpperCase() === 'DOCTOR' && licenseType?.toUpperCase() === 'CRM') ? licenseNumber : undefined,
        licenseNumber: licenseNumber === 'null' ? undefined : licenseNumber,
        licenseType: licenseType === 'null' ? undefined : licenseType,
        speciality: speciality === 'null' ? undefined : speciality,
        isActive: true
      }
    })

    console.log('✅ User created successfully!')
    console.log(`👤 Name: ${user.name}`)
    console.log(`📧 Email: ${user.email}`)
    console.log(`🏥 Role: ${user.role}`)
    if (user.licenseNumber) console.log(`🆔 License: ${user.licenseType} ${user.licenseNumber}`)

  } catch (error) {
    console.error('❌ Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
