// RBAC matrix centralizada
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
