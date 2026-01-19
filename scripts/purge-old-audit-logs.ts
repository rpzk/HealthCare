import { prisma } from '@/lib/prisma'

const DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '180')

async function run(){
  const cutoff = new Date(Date.now() - DAYS*24*60*60*1000)
  const deleted = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  console.log(`Audit logs antigos removidos: ${deleted.count} (retention ${DAYS}d)`) 
}
run().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())
