// Script de teste autenticado para pacientes
// Requer servidor dev rodando em http://localhost:3000
// Usa provider credentials (email: admin@healthcare.com senha: admin123)

const BASE = 'http://localhost:3000'

async function login(email, password) {
  const cookieJar = []
  // Obter csrfToken via endpoint oficial
  const csrfRes = await fetch(BASE + '/api/auth/csrf')
  if (!csrfRes.ok) throw new Error('Falha ao obter csrf')
  const csrfJson = await csrfRes.json()
  const setCookieA = csrfRes.headers.get('set-cookie') || ''
  if (setCookieA) {
    setCookieA.split(/,(?=[^ ;]+=)/).forEach(c => {
      const base = c.split(';')[0].trim()
      if (!cookieJar.some(existing => existing.startsWith(base.split('=')[0]+'='))) {
        cookieJar.push(base)
      }
    })
  }
  const csrfToken = csrfJson.csrfToken

  const form = new URLSearchParams()
  form.append('csrfToken', csrfToken)
  form.append('email', email)
  form.append('password', password)
  form.append('callbackUrl', BASE)
  form.append('json', 'true')

  const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieJar.join('; ')
    },
    body: form.toString(),
    redirect: 'manual'
  })
  const setCookieB = loginRes.headers.get('set-cookie') || ''
  if (setCookieB) {
    setCookieB.split(/,(?=[^ ;]+=)/).forEach(c => {
      const base = c.split(';')[0].trim()
      const name = base.split('=')[0]
      const idx = cookieJar.findIndex(existing => existing.startsWith(name + '='))
      if (idx >= 0) cookieJar[idx] = base; else cookieJar.push(base)
    })
  }
  console.log('Cookies pós-login:', cookieJar)
  if (loginRes.status !== 200 && loginRes.status !== 302) throw new Error('Falha no login status=' + loginRes.status)

  // Validar sessão
  const sessionRes = await fetch(BASE + '/api/auth/session', {
    headers: { 'Cookie': cookieJar.join('; ') }
  })
  const sessionJson = await sessionRes.json().catch(()=>null)
  console.log('Sessão raw 1:', sessionJson)
  if (!sessionJson || !sessionJson.user) {
    // Retry rápido
    await new Promise(r=>setTimeout(r,200))
    const sessionRes2 = await fetch(BASE + '/api/auth/session', { headers: { 'Cookie': cookieJar.join('; ') }})
    const sessionJson2 = await sessionRes2.json().catch(()=>null)
    console.log('Sessão raw 2:', sessionJson2)
    if (!sessionJson2 || !sessionJson2.user) {
      // Dump cookies para inspeção
      console.log('Cookies disponíveis (debug):', cookieJar)
      throw new Error('Sessão não estabelecida')
    }
  }
  return cookieJar
}

async function authFetch(url, options = {}, cookieJar) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      'Cookie': cookieJar.join('; ')
    }
  })
}

async function run() {
  console.log('> Realizando login...')
  const cookies = await login('admin@healthcare.com', 'admin123')
  console.log('Cookies obtidos:', cookies.map(c=>c.split('=')[0]).join(','))

  console.log('> Listando pacientes')
  let res = await authFetch(BASE + '/api/patients?page=1&limit=2', {}, cookies)
  console.log('Status list:', res.status)
  const list = await res.json().catch(()=>null)
  console.log('Total pacientes (se disponível):', list?.total)

  console.log('> Criando novo paciente')
  const payload = {
    name: 'Paciente Auth '+Date.now(),
    email: 'auth'+Date.now()+'@teste.com',
    birthDate: new Date('1995-05-05').toISOString(),
    gender: 'FEMALE'
  }
  res = await authFetch(BASE + '/api/patients', { method: 'POST', body: JSON.stringify(payload) }, cookies)
  console.log('Status create:', res.status)
  const created = await res.json().catch(()=>null)
  const patientId = created?.id || created?.patient?.id
  console.log('Novo paciente ID:', patientId)

  if (patientId) {
    console.log('> Buscando paciente criado')
    const getRes = await authFetch(BASE + '/api/patients/' + patientId, {}, cookies)
    console.log('Status get:', getRes.status)
    const getJson = await getRes.json().catch(()=>null)
    console.log('Nome retornado:', getJson?.name)
  }

  console.log('> Healthcheck')
  const health = await fetch(BASE + '/api/health')
  console.log('Health status:', health.status)
}

run().catch(e => { console.error('Erro script:', e); process.exit(1) })
