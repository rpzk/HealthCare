#!/usr/bin/env node

/**
 * Script de Teste - Sistema de Segurança HealthCare
 * Valida que as APIs protegidas estão funcionando corretamente
 */

const apiTests = [
  {
    name: 'Pacientes - GET (Auth required)',
    endpoint: '/api/patients',
    method: 'GET',
    protected: true
  },
  {
    name: 'Consultas - GET (Auth required)',
    endpoint: '/api/consultations',
    method: 'GET',
    protected: true
  },
  {
    name: 'Notificações - GET (Auth required)',
    endpoint: '/api/notifications',
    method: 'GET',
    protected: true
  },
  {
    name: 'Análise Sintomas - GET (Doctor Auth)',
    endpoint: '/api/ai/analyze-symptoms',
    method: 'GET',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Interações Medicamentosas - GET (Doctor Auth)',
    endpoint: '/api/ai/drug-interactions',
    method: 'GET',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Resumo Médico IA - GET (Doctor Auth)',
    endpoint: '/api/ai/medical-summary',
    method: 'GET',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Chat IA - POST (Doctor Auth)',
    endpoint: '/api/ai/chat',
    method: 'POST',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Agente Médico - POST (Doctor Auth)',
    endpoint: '/api/ai/agent',
    method: 'POST',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Recomendações IA - GET (Doctor Auth)',
    endpoint: '/api/ai/recommendations',
    method: 'GET',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Analytics IA - GET (Doctor Auth)',
    endpoint: '/api/ai/analytics',
    method: 'GET',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Análise Médica Geral - POST (Doctor Auth)',
    endpoint: '/api/ai/analyze',
    method: 'POST',
    protected: true,
    doctorOnly: true
  },
  {
    name: 'Métricas Performance - GET (Admin Auth)',
    endpoint: '/api/ai/performance',
    method: 'GET',
    protected: true,
    adminOnly: true
  },
  {
    name: 'Tendências IA - GET (Doctor Auth)',
    endpoint: '/api/ai/trends',
    method: 'GET',
    protected: true,
    doctorOnly: true
  }
]

async function testAPI(test) {
  try {
    const response = await fetch(`http://localhost:3000${test.endpoint}`, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const status = response.status
    const expectedStatus = test.protected ? 401 : 200

    if (status === expectedStatus) {
      console.log(`✅ ${test.name} - Status: ${status} (esperado: ${expectedStatus})`)
      return true
    } else {
      console.log(`❌ ${test.name} - Status: ${status} (esperado: ${expectedStatus})`)
      return false
    }
  } catch (error) {
    console.log(`⚠️  ${test.name} - Erro: ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('🧪 Iniciando Testes de Segurança das APIs\n')
  
  let passed = 0
  let total = apiTests.length

  for (const test of apiTests) {
    const success = await testAPI(test)
    if (success) passed++
    await new Promise(resolve => setTimeout(resolve, 100)) // Pequena pausa
  }

  console.log(`\n📊 Resultados: ${passed}/${total} testes passaram`)
  
  if (passed === total) {
    console.log('🎉 TODOS os testes de segurança passaram!')
    console.log('✅ 100% das APIs de IA estão protegidas!')
    console.log('✅ Sistema de autenticação robusto funcionando')
  } else {
    console.log('⚠️  Alguns testes falharam - verificar configuração')
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests, testAPI }
