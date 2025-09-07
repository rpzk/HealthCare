// Teste simples de RBAC para endpoints de paciente usando withRbac
// Requer servidor dev rodando em http://localhost:3000
// Usa credenciais: admin@healthcare.com / admin123 já deve existir (seed)
// Cria usuário DOCTOR e NURSE temporários para validar acesso a anonymize e export

const BASE = 'http://localhost:3000'

async function createUser(email, role){
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, name: email.split('@')[0], role }
    })
    return user
  } finally { await prisma.$disconnect() }
}

async function login(email, password='admin123') {
  // Reaproveita fluxo do script test-patients-auth simplificado
  const cookieJar = []
  const csrfRes = await fetch(BASE + '/api/auth/csrf')
  const csrfJson = await csrfRes.json()
  const setCookieA = csrfRes.headers.get('set-cookie') || ''
  if (setCookieA) setCookieA.split(/,(?=[^ ;]+=)/).forEach(c=>{ const base=c.split(';')[0].trim(); const name=base.split('=')[0]; if(!cookieJar.some(x=>x.startsWith(name+'='))) cookieJar.push(base) })
  const form = new URLSearchParams()
  form.append('csrfToken', csrfJson.csrfToken)
  form.append('email', email)
  form.append('password', password)
  form.append('callbackUrl', BASE)
  form.append('json','true')
  const loginRes = await fetch(BASE + '/api/auth/callback/credentials', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':cookieJar.join('; ')}, body:form.toString(), redirect:'manual' })
  const setCookieB = loginRes.headers.get('set-cookie') || ''
  if (setCookieB) setCookieB.split(/,(?=[^ ;]+=)/).forEach(c=>{ const base=c.split(';')[0].trim(); const name=base.split('=')[0]; const idx=cookieJar.findIndex(x=>x.startsWith(name+'=')); if(idx>=0) cookieJar[idx]=base; else cookieJar.push(base) })
  return cookieJar
}

async function authFetch(url, options={}, cookies){
  return fetch(url, { ...options, headers: { 'Content-Type':'application/json', ...(options.headers||{}), 'Cookie': cookies.join('; ') } })
}

async function run(){
  console.log('[RBAC] Criando usuários de teste...')
  await createUser('doctor-rbac@example.com','DOCTOR')
  await createUser('nurse-rbac@example.com','NURSE')

  // Criar paciente base com doctor
  const doctorCookies = await login('doctor-rbac@example.com')
  const payload = { name:'Paciente RBAC', email:'paciente.rbac+'+Date.now()+'@ex.com', birthDate:new Date('1990-01-01').toISOString(), gender:'MALE' }
  const createRes = await authFetch(BASE + '/api/patients', { method:'POST', body: JSON.stringify(payload) }, doctorCookies)
  console.log('[RBAC] create patient status', createRes.status)
  const created = await createRes.json().catch(()=>null)
  const patientId = created?.id
  if(!patientId){ throw new Error('Falha criar paciente base') }

  // Nurse tenta anonimizar (deve falhar 403)
  const nurseCookies = await login('nurse-rbac@example.com')
  const anonResForbidden = await authFetch(BASE + `/api/patients/${patientId}/anonymize`, { method:'POST' }, nurseCookies)
  console.log('[RBAC] anonymize como NURSE status', anonResForbidden.status)

  // Doctor anonimiza (200)
  const anonResOk = await authFetch(BASE + `/api/patients/${patientId}/anonymize`, { method:'POST' }, doctorCookies)
  console.log('[RBAC] anonymize como DOCTOR status', anonResOk.status)

  // Nurse pode ler? (patient.read inclui NURSE) -> esperar 200 GET
  const getRes = await authFetch(BASE + `/api/patients/${patientId}`, {}, nurseCookies)
  console.log('[RBAC] get patient como NURSE status', getRes.status)

  // Nurse tenta full export (RBAC patient.export só DOCTOR/ADMIN) -> 403
  const exportRes = await authFetch(BASE + `/api/patients/${patientId}/full-export`, {}, nurseCookies)
  console.log('[RBAC] full export NURSE status', exportRes.status)

  const summary = {
    anonymizeForbidden: anonResForbidden.status,
    anonymizeDoctor: anonResOk.status,
    nurseGet: getRes.status,
    nurseFullExport: exportRes.status
  }
  console.log('[RBAC] Summary', summary)
  const ok = summary.anonymizeForbidden === 403 && summary.anonymizeDoctor === 200 && summary.nurseGet === 200 && summary.nurseFullExport === 403
  if(!ok){
    console.error('[RBAC] TEST FAILED')
    process.exit(1)
  } else {
    console.log('[RBAC] TEST PASSED')
  }
}

run().catch(e=>{ console.error('[RBAC] Erro geral', e); process.exit(1) })
