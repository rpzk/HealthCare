// Teste básico da API de análise de sintomas
async function testSymptomAnalysis() {
  const testData = {
    symptoms: ['dor de cabeça', 'febre', 'fadiga'],
    patientAge: 35,
    patientGender: 'F',
    medicalHistory: ['hipertensão'],
    vitalSigns: {
      temperature: 38.2,
      bloodPressure: '140/90',
      heartRate: 95
    }
  }

  try {
    console.log('🔬 Testando API de análise de sintomas...')
    console.log('📊 Dados de entrada:', testData)
    
    const response = await fetch('http://localhost:3000/api/ai/analyze-symptoms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Análise bem-sucedida!')
      console.log('🎯 Possíveis diagnósticos encontrados:', result.data.possibleDiagnoses?.length || 0)
      console.log('🧪 Exames recomendados:', result.data.recommendedTests?.length || 0)
      console.log('⚠️ Sinais de alerta:', result.data.redFlags?.length || 0)
    } else {
      console.error('❌ Erro na análise:', result)
    }

    return result
  } catch (error) {
    console.error('🚨 Erro na requisição:', error)
    return null
  }
}

// Teste básico da API de interações medicamentosas
async function testDrugInteractions() {
  const testData = {
    medications: ['Aspirina', 'Warfarina', 'Omeprazol']
  }

  try {
    console.log('💊 Testando API de interações medicamentosas...')
    console.log('📋 Medicamentos:', testData.medications)
    
    const response = await fetch('http://localhost:3000/api/ai/drug-interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Verificação bem-sucedida!')
      console.log('⚡ Interações encontradas:', result.data.interactions?.length || 0)
      console.log('🚫 Contraindicações:', result.data.contraindications?.length || 0)
    } else {
      console.error('❌ Erro na verificação:', result)
    }

    return result
  } catch (error) {
    console.error('🚨 Erro na requisição:', error)
    return null
  }
}

// Executar testes
if (typeof window !== 'undefined') {
  console.log('🏥 Iniciando testes do sistema de IA médica...')
  
  // Teste 1: Análise de sintomas
  testSymptomAnalysis().then(result => {
    if (result) {
      console.log('📈 Resultado da análise de sintomas:', result)
    }
  })

  // Teste 2: Interações medicamentosas
  setTimeout(() => {
    testDrugInteractions().then(result => {
      if (result) {
        console.log('📈 Resultado das interações:', result)
      }
    })
  }, 2000)
} else {
  module.exports = { testSymptomAnalysis, testDrugInteractions }
}
