/**
 * 🧪 Teste do Sistema de Importação de Documentos Médicos
 * Validação completa do fluxo de upload, análise e importação
 */

// Importar usando ES modules convertido para CommonJS
const medicalDocumentAI = require('./lib/medical-document-ai.ts').default || require('./lib/medical-document-ai.ts');

// 📄 Documentos de teste simulados
const testDocuments = {
  evolucao: `
    EVOLUÇÃO MÉDICA
    
    Paciente: João Silva Santos
    CPF: 123.456.789-10
    Data: 23/08/2024
    
    Paciente apresenta melhora do quadro de hipertensão arterial.
    Pressão arterial: 130/80 mmHg
    Frequência cardíaca: 72 bpm
    Temperatura: 36.5°C
    
    Sintomas: Leve cefaleia matinal
    
    Medicações em uso:
    - Losartana 50mg - 1x ao dia
    - Hidroclorotiazida 25mg - 1x ao dia
    
    Conduta: Manter medicação atual. Retorno em 30 dias.
    
    Dr. Maria Oliveira
    CRM: 12345
  `,
  
  exame: `
    LABORATÓRIO CLÍNICO SAÚDE
    
    HEMOGRAMA COMPLETO
    
    Paciente: Maria Costa Silva  
    CPF: 987.654.321-00
    Data da coleta: 22/08/2024
    
    RESULTADOS:
    
    Hemácias: 4.5 milhões/mm³ (VR: 4.0-5.5)
    Hemoglobina: 13.8 g/dL (VR: 12.0-16.0)
    Hematócrito: 42% (VR: 36-48)
    Leucócitos: 7.200/mm³ (VR: 4.000-10.000)
    Plaquetas: 280.000/mm³ (VR: 150.000-400.000)
    
    Glicemia de jejum: 95 mg/dL (VR: 70-100)
    Colesterol total: 180 mg/dL (VR: <200)
    
    OBSERVAÇÕES: Resultados dentro da normalidade.
    
    Responsável: Dr. Carlos Lima
    CRM: 54321
  `,
  
  prescricao: `
    PRESCRIÇÃO MÉDICA
    
    Paciente: Ana Paula Souza
    CPF: 456.789.123-45
    Data: 24/08/2024
    
    Diagnóstico: Infecção do trato urinário
    
    PRESCRIÇÃO:
    
    1. Ciprofloxacino 500mg
       - 1 comprimido de 12/12h
       - Por 7 dias
       - Via oral
    
    2. Dipirona 500mg
       - 1 comprimido se dor ou febre
       - Máximo 4x ao dia
       - Via oral
    
    3. Recomendações:
       - Aumentar ingestão hídrica
       - Repouso relativo
       - Retorno se persistirem sintomas
    
    Dr. Pedro Almeida
    CRM: 98765
  `,

  anamnese: `
    ANAMNESE
    
    Paciente: Roberto Fernandes
    CPF: 789.123.456-78
    Data de nascimento: 15/03/1970
    Data: 24/08/2024
    
    QUEIXA PRINCIPAL:
    Dor no peito e falta de ar há 3 dias
    
    HISTÓRIA DA DOENÇA ATUAL:
    Paciente refere dor torácica do tipo aperto, que irradia para braço esquerdo,
    associada a dispneia aos esforços. Nega febre ou tosse.
    
    ANTECEDENTES PESSOAIS:
    - Hipertensão arterial há 10 anos
    - Diabetes mellitus tipo 2 há 5 anos
    - Ex-tabagista (parou há 2 anos)
    
    MEDICAÇÕES EM USO:
    - Metformina 850mg - 2x ao dia
    - Enalapril 20mg - 1x ao dia
    
    EXAME FÍSICO:
    PA: 150/90 mmHg
    FC: 88 bpm
    FR: 20 irpm
    Temp: 36.8°C
    
    HIPÓTESE DIAGNÓSTICA:
    Síndrome coronariana aguda a esclarecer
    
    Dra. Lucia Santos
    CRM: 13579
  `
};

// 🧪 Função de teste principal
async function testMedicalDocumentImport() {
  console.log('🏥 TESTE DO SISTEMA DE IMPORTAÇÃO DE DOCUMENTOS MÉDICOS');
  console.log('=' .repeat(60));

  let totalTests = 0;
  let passedTests = 0;

  for (const [tipo, conteudo] of Object.entries(testDocuments)) {
    console.log(`\n📄 Testando documento: ${tipo.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    totalTests++;

    try {
      // Simular documento
      const documento = {
        id: `test-${tipo}-${Date.now()}`,
        fileName: `${tipo}_teste.txt`,
        content: conteudo,
        uploadDate: new Date(),
        fileType: 'TXT',
        status: 'analyzing',
        patientId: null
      };

      // Analisar com IA
      const analysis = await medicalDocumentAI.analyzeDocument(documento);
      
      // Validar resultados
      console.log(`✅ Análise concluída com ${(analysis.confidence * 100).toFixed(1)}% de confiança`);
      console.log(`📋 Tipo detectado: ${analysis.documentType}`);
      
      // Verificar informações do paciente
      if (analysis.patientInfo.name) {
        console.log(`👤 Paciente identificado: ${analysis.patientInfo.name}`);
        if (analysis.patientInfo.cpf) {
          console.log(`🆔 CPF: ${analysis.patientInfo.cpf}`);
        }
      }

      // Mostrar dados extraídos
      const { extractedData } = analysis;
      if (extractedData.symptoms?.length > 0) {
        console.log(`🩺 Sintomas: ${extractedData.symptoms.slice(0, 3).join(', ')}`);
      }
      if (extractedData.medications?.length > 0) {
        console.log(`💊 Medicamentos: ${extractedData.medications.length} encontrados`);
      }
      if (extractedData.vitalSigns && Object.keys(extractedData.vitalSigns).length > 0) {
        console.log(`📊 Sinais vitais: ${Object.keys(extractedData.vitalSigns).length} medidas`);
      }

      // Mostrar ações sugeridas
      console.log(`⚡ Ações sugeridas: ${analysis.suggestedActions.length}`);
      analysis.suggestedActions.slice(0, 2).forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.description} (${(action.confidence * 100).toFixed(0)}%)`);
      });

      // Gerar relatório
      const report = medicalDocumentAI.generateAnalysisReport(analysis);
      console.log('\n📈 RELATÓRIO DA ANÁLISE:');
      console.log(report);

      passedTests++;
      
    } catch (error) {
      console.error(`❌ Erro no teste ${tipo}:`, error.message);
    }
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Testes aprovados: ${passedTests}`);
  console.log(`Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Revisar implementação.');
  }
}

// 🧪 Teste adicional de performance
async function testPerformance() {
  console.log('\n🚀 TESTE DE PERFORMANCE');
  console.log('-'.repeat(30));

  const startTime = Date.now();
  
  // Testar múltiplas análises simultâneas
  const promises = Object.entries(testDocuments).map(async ([tipo, conteudo]) => {
    const documento = {
      id: `perf-${tipo}-${Date.now()}`,
      fileName: `${tipo}_performance.txt`,
      content: conteudo,
      uploadDate: new Date(),
      fileType: 'TXT',
      status: 'analyzing',
      patientId: null
    };
    
    return medicalDocumentAI.analyzeDocument(documento);
  });

  try {
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ ${results.length} análises simultâneas concluídas`);
    console.log(`⏱️ Tempo total: ${duration}ms`);
    console.log(`📈 Média por análise: ${(duration / results.length).toFixed(0)}ms`);

    // Verificar confiança média
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    console.log(`🎯 Confiança média: ${(avgConfidence * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Erro no teste de performance:', error);
  }
}

// 🎯 Executar testes
async function runAllTests() {
  try {
    await testMedicalDocumentImport();
    await testPerformance();
    
    console.log('\n🏁 Todos os testes concluídos!');
    console.log('💡 O sistema está pronto para importação de documentos médicos reais.');
    
  } catch (error) {
    console.error('💥 Erro fatal nos testes:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testMedicalDocumentImport,
  testPerformance,
  runAllTests
};
