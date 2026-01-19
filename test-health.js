// Teste simples de health endpoint
(async () => {
  console.log('🔎 Testando /api/health')
  try {
    const res = await fetch('http://localhost:3000/api/health')
    const data = await res.json()
    console.log('Status HTTP:', res.status)
    console.log('Resposta:', data)
  } catch (e) {
    console.error('Falha health:', e.message)
  }
})()
