// Teste simplificado LGPD (requer servidor rodando e auth configurada manualmente)
(async () => {
  console.log('🔐 Teste LGPD (manual)')
  console.log('⚠ Necessário sessão autenticada ADMIN/DOCTOR para sucesso real.')
  const pid = process.env.TEST_PATIENT_ID || 'dummy'
  try {
    const exp = await fetch(`http://localhost:3000/api/patients/${pid}/full-export`)
    console.log('Export status:', exp.status)
    const anon = await fetch(`http://localhost:3000/api/patients/${pid}/anonymize`, { method: 'POST' })
    console.log('Anonymize status:', anon.status)
  } catch (e) {
    console.error('Falha teste LGPD:', e.message)
  }
})()
