import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@healthcare.com' } })
  if (!user) {
    console.log('User not found')
    return
  }
  console.log('Hash in DB:', user.password)
  if (!user.password) {
    console.log('Password is null')
    return
  }
  const match = await bcrypt.compare('admin123', user.password)
  console.log('Password match:', match)
}

check()
