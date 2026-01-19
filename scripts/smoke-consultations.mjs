const base = 'http://127.0.0.1:3000'

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${base}/api/notifications?limit=1`, { headers: { 'x-test-user': 'true' } })
      if (r.ok) return true
    } catch (_) {
      // ignore
    }
    await new Promise((res) => setTimeout(res, 500))
  }
  return false
}

async function main(){
  const ready = await waitForServer(20000)
  if (!ready) {
    console.error('Server did not become ready in time')
    process.exit(2)
  }

  try{
    console.log('GET /api/consultations')
    let res = await fetch(`${base}/api/consultations?page=1&limit=2`, { headers: { 'x-test-user': 'true' } })
    console.log('status', res.status)
    let body = await res.text()
    console.log('body', body.slice(0, 2000))

    console.log('\nPATCH /api/consultations/1')
    res = await fetch(`${base}/api/consultations/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'true' },
      body: JSON.stringify({ notes: 'Smoke test update' })
    })
    console.log('status', res.status)
    body = await res.text()
    console.log('body', body.slice(0, 2000))

  }catch(e){
    console.error('smoke test failed', e)
    process.exit(2)
  }
}

main()
