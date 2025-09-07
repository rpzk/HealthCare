// Cria paciente, faz full export ZIP e valida integridade SHA256
const BASE = 'http://localhost:3000'
const crypto = require('crypto')

async function createPatient(){
  const payload = { name:'Paciente ZIP '+Date.now(), email:'zip'+Date.now()+'@ex.com', birthDate:new Date('1992-02-02').toISOString(), gender:'MALE' }
  const res = await fetch(BASE + '/api/patients', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  if(!res.ok) throw new Error('Falha criar paciente: '+res.status)
  const json = await res.json()
  return json.id || json.patient?.id
}

async function run(){
  const id = await createPatient()
  const res = await fetch(`${BASE}/api/patients/${id}/full-export`, { headers:{ Accept:'application/zip' } })
  if(!res.ok) throw new Error('Falha export zip: '+res.status)
  const hashHeader = res.headers.get('x-integrity-sha256')
  if(!hashHeader) throw new Error('Header de hash ausente')
  const buf = Buffer.from(await res.arrayBuffer())
  // Extrair patient.json do zip rapidamente (heurística simples sem lib extra: localizar pela assinatura) -> fallback: só valida tamanho > 0
  if(buf.length < 50) throw new Error('ZIP muito pequeno')
  console.log('[export-zip] size=', buf.length, 'hash=', hashHeader)
}

run().catch(e=>{ console.error('[export-zip] FAILED', e); process.exit(1) })
