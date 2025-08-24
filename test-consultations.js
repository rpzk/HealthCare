const testConsultationAPI = async () => {
  console.log('🔍 Testando sistema de consultas...\n')
  
  try {
    // 1. Testar estatísticas
    console.log('1. Testando estatísticas...')
    const statsResponse = await fetch('http://localhost:3000/api/consultations/stats')
    if (statsResponse.ok) {
      const stats = await statsResponse.json()
      console.log(`✅ Stats OK - ${stats.stats.total} consultas totais`)
    } else {
      console.log('❌ Erro nas estatísticas')
    }
    
    // 2. Testar busca de consultas
    console.log('2. Testando busca de consultas...')
    const getResponse = await fetch('http://localhost:3000/api/consultations?page=1&limit=5')
    const consultations = await getResponse.json()
    console.log(`✅ Busca OK - ${consultations.consultations?.length || 0} consultas encontradas`)
    console.log(`📊 Paginação: ${consultations.pagination?.total || 0} total\n`)
    
    // 3. Testar criação de consulta
    console.log('3. Testando criação de consulta...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0) // 10:00 amanhã
    
    // Buscar um paciente primeiro
    const patientsResponse = await fetch('http://localhost:3000/api/patients?limit=1')
    const patientsData = await patientsResponse.json()
    
    if (patientsData.patients && patientsData.patients.length > 0) {
      const patient = patientsData.patients[0]
      
      const newConsultation = {
        patientId: patient.id,
        doctorId: "cmeokjwn60000re2t8uldf5d5",
        scheduledDate: tomorrow.toISOString(),
        type: "ROUTINE",
        description: "Consulta de teste automático",
        duration: 60
      }
      
      const createResponse = await fetch('http://localhost:3000/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConsultation)
      })
      
      if (createResponse.ok) {
        const createdConsultation = await createResponse.json()
        console.log(`✅ Criação OK - Consulta ID: ${createdConsultation.consultation?.id}`)
        
        // 4. Testar horários disponíveis
        console.log('4. Testando horários disponíveis...')
        const dateStr = tomorrow.toISOString().split('T')[0]
        const slotsResponse = await fetch(`http://localhost:3000/api/consultations/available-slots?doctorId=cmeokjwn60000re2t8uldf5d5&date=${dateStr}`)
        
        if (slotsResponse.ok) {
          const slotsData = await slotsResponse.json()
          console.log(`✅ Horários OK - ${slotsData.availableSlots?.length || 0} slots disponíveis`)
        } else {
          console.log('❌ Erro nos horários disponíveis')
        }
        
      } else {
        const error = await createResponse.text()
        console.log(`❌ Erro na criação: ${error}`)
      }
    } else {
      console.log('❌ Nenhum paciente encontrado para teste')
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
  
  console.log('\n🏁 Teste de consultas concluído!')
}

// Aguardar servidor estar pronto e executar teste
setTimeout(testConsultationAPI, 2000)
