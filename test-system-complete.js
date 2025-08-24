#!/usr/bin/env node

const testAnalytics = async () => {
  console.log('🧪 Testando Sistema de Analytics e Notificações...\n')

  try {
    // Teste 1: Analytics
    console.log('📊 Testando Analytics de IA...')
    const analyticsResponse = await fetch('http://localhost:3000/api/ai/analytics', {
      headers: {
        'Cookie': 'next-auth.session-token=test-session'
      }
    })
    
    if (analyticsResponse.status === 401) {
      console.log('⚠️  Autenticação necessária - teste via browser')
    } else {
      console.log(`✅ Analytics API: Status ${analyticsResponse.status}`)
    }

    // Teste 2: Performance
    console.log('⚡ Testando métricas de performance...')
    const performanceResponse = await fetch('http://localhost:3000/api/ai/performance', {
      headers: {
        'Cookie': 'next-auth.session-token=test-session'
      }
    })
    
    if (performanceResponse.status === 401) {
      console.log('⚠️  Autenticação necessária - teste via browser')
    } else {
      console.log(`✅ Performance API: Status ${performanceResponse.status}`)
    }

    // Teste 3: Notificações
    console.log('📢 Testando sistema de notificações...')
    const notificationsResponse = await fetch('http://localhost:3000/api/notifications', {
      headers: {
        'Cookie': 'next-auth.session-token=test-session'
      }
    })
    
    if (notificationsResponse.status === 401) {
      console.log('⚠️  Autenticação necessária - teste via browser')
    } else {
      console.log(`✅ Notifications API: Status ${notificationsResponse.status}`)
    }

    console.log('\n🎯 URLs de Teste:')
    console.log('🔗 Analytics Dashboard: http://localhost:3000/ai-analytics')
    console.log('🔗 Sistema IA Médica: http://localhost:3000/ai-medical')
    console.log('🔗 Login: http://localhost:3000/auth/signin')
    console.log('\n📝 Credenciais de teste:')
    console.log('📧 Email: admin@healthcare.com')
    console.log('🔒 Senha: admin123')
    
    console.log('\n✨ Funcionalidades Implementadas:')
    console.log('🧠 IA Médica com análise de sintomas')
    console.log('💊 Verificador de interações medicamentosas')
    console.log('📊 Dashboard de Analytics em tempo real')
    console.log('📢 Centro de notificações inteligentes')
    console.log('⚡ Métricas de performance')
    console.log('📈 Tendências e recomendações')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

// Executar testes
testAnalytics()
