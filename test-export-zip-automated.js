// Cria paciente, faz full export ZIP e valida integridade SHA256 (conteúdo + arquivo integrity)
const BASE = 'http://localhost:3000'
const crypto = require('crypto')
const JSZip = require('jszip')

async function login(){
  const cookieJar=[]
  const csrfRes = await fetch(BASE + '/api/auth/csrf')
  const csrfJson = await csrfRes.json()
  const setCookieA = csrfRes.headers.get('set-cookie')||''
  if(setCookieA) setCookieA.split(/,(?=[^ ;]+=)/).forEach(c=>{const base=c.split(';')[0].trim(); const name=base.split('=')[0]; if(!cookieJar.some(x=>x.startsWith(name+'='))) cookieJar.push(base)})
  const form=new URLSearchParams(); form.append('csrfToken',csrfJson.csrfToken); form.append('email','admin@healthcare.com'); form.append('password','admin123'); form.append('callbackUrl',BASE); form.append('json','true')
  const loginRes= await fetch(BASE + '/api/auth/callback/credentials',{method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':cookieJar.join('; ')}, body: form.toString(), redirect:'manual'})
  const setCookieB = loginRes.headers.get('set-cookie')||''
  if(setCookieB) setCookieB.split(/,(?=[^ ;]+=)/).forEach(c=>{const base=c.split(';')[0].trim(); const name=base.split('=')[0]; const idx=cookieJar.findIndex(x=>x.startsWith(name+'=')); if(idx>=0) cookieJar[idx]=base; else cookieJar.push(base)})
  return cookieJar
}

async function createPatient(cookies){
  const payload = { name:'Paciente ZIP '+Date.now(), email:'zip'+Date.now()+'@ex.com', birthDate:new Date('1992-02-02').toISOString(), gender:'MALE' }
  const res = await fetch(BASE + '/api/patients', { method:'POST', headers:{'Content-Type':'application/json','Cookie':cookies.join('; ')}, body: JSON.stringify(payload) })
  if(!res.ok) throw new Error('Falha criar paciente: '+res.status)
  const json = await res.json()
  return json.id || json.patient?.id
}

async function run(){
  const cookies = await login()
  const id = await createPatient(cookies)
  const res = await fetch(`${BASE}/api/patients/${id}/full-export`, { headers:{ Accept:'application/zip','Cookie':cookies.join('; ') } })
  if(!res.ok) throw new Error('Falha export zip: '+res.status)
  const hashHeader = res.headers.get('x-integrity-sha256')
  if(!hashHeader) throw new Error('Header de hash ausente')
  const buf = Buffer.from(await res.arrayBuffer())
  if(buf.length < 50) throw new Error('ZIP muito pequeno')
  const zip = await JSZip.loadAsync(buf)
  const patientEntry = zip.file('patient.json')
  const integrityEntry = zip.file('integrity.sha256')
  if(!patientEntry) throw new Error('patient.json ausente no ZIP')
  if(!integrityEntry) throw new Error('integrity.sha256 ausente no ZIP')
  const patientJsonStr = await patientEntry.async('string')
  const integrityStr = (await integrityEntry.async('string')).trim()
  const calcHash = crypto.createHash('sha256').update(patientJsonStr).digest('hex')
  if(calcHash !== hashHeader) throw new Error(`Hash header divergente: header=${hashHeader} calc=${calcHash}`)
  if(!integrityStr.startsWith(calcHash)) throw new Error('Arquivo integrity.sha256 não corresponde ao hash calculado')
  let parsed
  try { parsed = JSON.parse(patientJsonStr) } catch { throw new Error('patient.json inválido (JSON parse)') }
  if(!parsed.patient || !parsed.exportedAt) throw new Error('Campos esperados ausentes em patient.json')
  console.log('[export-zip] ok size=', buf.length, 'hash=', hashHeader, 'patientId=', parsed.patient.id)
}

run().catch(e=>{ console.error('[export-zip] FAILED', e); process.exit(1) })
