const BASE = 'http://localhost:3000'

function extractSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    try {
      const arr = res.headers.getSetCookie()
      if (Array.isArray(arr) && arr.length) return arr
    } catch (_) {}
  }
  const raw = res.headers.get('set-cookie') || ''
  if (!raw) return []
  return raw.split(/,(?=[^ ;]+=)/).map(c => c.trim())
}

function generateCpf() {
  // Pseudo CPF: 11 random digits formatted as XXX.XXX.XXX-XX
  const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
}

async function login(email, password) {
  const jar = []
  const csrfRes = await fetch(BASE + '/api/auth/csrf')
  const csrf = await csrfRes.json()
  extractSetCookies(csrfRes).forEach(c => {
    const base = c.split(';')[0]
    const name = base.split('=')[0]
    const idx = jar.findIndex(x => x.startsWith(name + '='))
    if (idx >= 0) jar[idx] = base; else jar.push(base)
  })
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email,
    password,
    callbackUrl: BASE,
    json: 'true'
  })
  const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': jar.join('; ') },
    body: form.toString(),
    redirect: 'manual'
  })
  extractSetCookies(loginRes).forEach(c => {
    const base = c.split(';')[0]
    const name = base.split('=')[0]
    const idx = jar.findIndex(x => x.startsWith(name + '='))
    if (idx >= 0) jar[idx] = base; else jar.push(base)
  })
  // sanity: ensure session exists
  const s = await fetch(BASE + '/api/auth/session', { headers: { Cookie: jar.join('; ') } })
  const sj = await s.json().catch(()=>null)
  if (!sj?.user) throw new Error('Falha ao autenticar')
  return { jar, user: sj.user }
}

async function authFetch(url, init, jar) {
  return fetch(url, {
    ...(init || {}),
    headers: {
      'Content-Type': 'application/json',
      ...((init && init.headers) || {}),
      Cookie: jar.join('; ')
    }
  })
}

const testPatientAPI = async () => {
  console.log('🔍 Testando sistema de pacientes...\n')

  try {
    // login primeiro
  const { jar: cookies, user } = await login('admin@healthcare.com', 'admin123')

    // 1. Testar GET de pacientes (autenticado)
    console.log('1. Testando busca de pacientes...')
    const getResponse = await authFetch(BASE + '/api/patients?page=1&limit=5', {}, cookies)
    const patients = await getResponse.json()
    console.log(`✅ Busca OK - ${patients.patients?.length || 0} pacientes encontrados`)
    // Ajustar campos conforme implementação atual
    const total = patients.total ?? patients.pagination?.total ?? 0
    const pages = patients.totalPages ?? patients.pagination?.pages ?? 0
    console.log(`📊 Paginação: ${total} total, ${pages} páginas\n`)

    // 2. Testar criação de paciente (payload compatível com API atual)
    console.log('2. Testando criação de paciente...')
    const newPatient = {
      name: 'Teste Automatizado Silva',
      email: `teste+${Date.now()}@email.com`,
      phone: '(11) 99999-0000',
      birthDate: '1990-05-20T00:00:00.000Z',
      gender: 'MALE',
      address: 'Rua Teste, 123',
      emergencyContact: 'Contato Teste',
      allergies: ['Poeira'],
      // Campos exigidos pelo schema
      cpf: generateCpf(),
      doctorId: user.id
    }

    const createResponse = await authFetch(BASE + '/api/patients', { method: 'POST', body: JSON.stringify(newPatient) }, cookies)
    if (createResponse.ok) {
      const created = await createResponse.json()
      const createdId = created?.id || created?.patient?.id
      console.log(`✅ Criação OK - Paciente ID: ${createdId}`)

      // 3. Testar busca individual
      console.log('3. Testando busca individual...')
      const getOneResponse = await authFetch(BASE + `/api/patients/${createdId}`, {}, cookies)
      if (getOneResponse.ok) {
        const found = await getOneResponse.json()
        const name = found?.name || found?.patient?.name
        console.log(`✅ Busca individual OK - Nome: ${name}`)
      } else {
        console.log('❌ Erro na busca individual')
      }

      // 4. Testar atualização
      console.log('4. Testando atualização...')
      const updateData = { phone: '(11) 99999-1111' }
      const updateResponse = await authFetch(BASE + `/api/patients/${createdId}`, { method: 'PUT', body: JSON.stringify(updateData) }, cookies)
      if (updateResponse.ok) {
        console.log('✅ Atualização OK')
      } else {
        console.log('❌ Erro na atualização')
      }

      // 5. Testar desativação (não implementada -> 501 esperado)
      console.log('5. Testando desativação...')
      const deactivateResponse = await authFetch(BASE + `/api/patients/${createdId}`, { method: 'PATCH', body: JSON.stringify({ action: 'deactivate' }) }, cookies)
      if (deactivateResponse.status === 501) {
        console.log('✅ Desativação retorna 501 (não implementada)')
      } else if (deactivateResponse.ok) {
        console.log('✅ Desativação OK')
      } else {
        console.log('❌ Erro na desativação')
      }
    } else {
      const error = await createResponse.text()
      console.log(`❌ Erro na criação: ${error}`)
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }

  console.log('\n🏁 Teste concluído!')
}

setTimeout(testPatientAPI, 2000)
