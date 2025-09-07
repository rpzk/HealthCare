// Teste básico de criação e listagem de pacientes
// Executar com: node test-patients-basic.js (assegure que o servidor Next está rodando)

async function run() {
  const base = 'http://localhost:3000'
  const headers = { 'Content-Type': 'application/json' }

  console.log('> Listando pacientes (expect 200)')
  let res = await fetch(base + '/api/patients?page=1&limit=1')
  console.log('Status:', res.status)
  const list = await res.json().catch(()=>null)
  console.log('Total (se disponível):', list?.total)

  console.log('> Criando paciente (expect 201)')
  const patientPayload = {
    name: 'Teste Paciente '+Date.now(),
    email: 'paciente'+Date.now()+'@teste.com',
    birthDate: new Date('1990-01-01').toISOString(),
    gender: 'MALE'
  }
  res = await fetch(base + '/api/patients', { method: 'POST', headers, body: JSON.stringify(patientPayload) })
  console.log('Status:', res.status)
  const created = await res.json().catch(()=>null)
  console.log('Criado ID:', created?.id || created?.patient?.id)

  if (created?.id) {
    console.log('> Recuperando paciente criado')
    const getRes = await fetch(base + '/api/patients/' + created.id)
    console.log('Status:', getRes.status)
    const getJson = await getRes.json().catch(()=>null)
    console.log('Nome retornado:', getJson?.name)
  }
}

run().catch(e => { console.error(e); process.exit(1) })
