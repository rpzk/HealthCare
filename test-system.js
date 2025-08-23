const testPatientAPI = async () => {
  console.log('🔍 Testando sistema de pacientes...\n')
  
  try {
    // 1. Testar GET de pacientes
    console.log('1. Testando busca de pacientes...')
    const getResponse = await fetch('http://localhost:3000/api/patients?page=1&limit=5')
    const patients = await getResponse.json()
    console.log(`✅ Busca OK - ${patients.patients?.length || 0} pacientes encontrados`)
    console.log(`📊 Paginação: ${patients.pagination?.total || 0} total, ${patients.pagination?.pages || 0} páginas\n`)
    
    // 2. Testar criação de paciente
    console.log('2. Testando criação de paciente...')
    const newPatient = {
      name: "Teste Automatizado Silva",
      email: "teste@email.com",
      phone: "(11) 99999-0000",
      dateOfBirth: "1990-05-20",
      gender: "MALE",
      address: {
        street: "Rua Teste, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        country: "Brasil"
      },
      bloodType: "O_POSITIVE",
      allergies: ["Teste Alergia"],
      chronicDiseases: ["Teste Doença"],
      emergencyContact: {
        name: "Contato Teste",
        relationship: "Irmão",
        phone: "(11) 98888-0000"
      }
    }
    
    const createResponse = await fetch('http://localhost:3000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPatient)
    })
    
    if (createResponse.ok) {
      const createdPatient = await createResponse.json()
      console.log(`✅ Criação OK - Paciente ID: ${createdPatient.patient?.id}`)
      
      // 3. Testar busca individual
      console.log('3. Testando busca individual...')
      const getOneResponse = await fetch(`http://localhost:3000/api/patients/${createdPatient.patient.id}`)
      if (getOneResponse.ok) {
        const foundPatient = await getOneResponse.json()
        console.log(`✅ Busca individual OK - Nome: ${foundPatient.patient?.name}`)
      } else {
        console.log('❌ Erro na busca individual')
      }
      
      // 4. Testar atualização
      console.log('4. Testando atualização...')
      const updateData = { ...newPatient, phone: "(11) 99999-1111" }
      const updateResponse = await fetch(`http://localhost:3000/api/patients/${createdPatient.patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (updateResponse.ok) {
        console.log(`✅ Atualização OK`)
      } else {
        console.log('❌ Erro na atualização')
      }
      
      // 5. Testar desativação
      console.log('5. Testando desativação...')
      const deactivateResponse = await fetch(`http://localhost:3000/api/patients/${createdPatient.patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' })
      })
      
      if (deactivateResponse.ok) {
        console.log(`✅ Desativação OK`)
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

// Aguardar servidor estar pronto e executar teste
setTimeout(testPatientAPI, 3000)
