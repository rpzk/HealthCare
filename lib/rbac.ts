import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export type UserSession = { id:string; email?:string|null; role:string }

export async function requireSession(roles?: string[]) {
  const session = await getServerSession(authOptions as any) as any
  if(!session?.user) throw new Error('not_authenticated')
  if(roles && roles.length && !roles.includes(session.user.role)) throw new Error('forbidden')
  return session.user as UserSession
}

export function canEvaluate(role:string){ return ['ADMIN','DOCTOR'].includes(role) }
export function canManageOccupation(role:string){ return ['ADMIN'].includes(role) }// RBAC matrix centralizada
// action -> roles permitidas
export const RBAC_MATRIX: Record<string,string[]> = {
  'patient.read': ['ADMIN','DOCTOR','NURSE'],
  'patient.write': ['ADMIN','DOCTOR'],
  'patient.export': ['ADMIN','DOCTOR'],
  'patient.anonymize': ['ADMIN'],
  'audit.read': ['ADMIN'],
  'ai.symptom_analysis': ['ADMIN','DOCTOR'],
  'ai.drug_interaction': ['ADMIN','DOCTOR'],
  'ai.summary': ['ADMIN','DOCTOR'],
  'backup.run': ['ADMIN']
}

export function isAllowed(action: string, role: string){
  const allowed = RBAC_MATRIX[action]
  if (!allowed) return false
  return allowed.includes(role)
}
