/**
 * 🧪 Teste Simples do Sistema de Importação
 */

import { medicalDocumentAI } from './lib/medical-document-ai'

const testDocument = `
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
`

async function runTest() {
  console.log('🏥 Testando Sistema de Importação de Documentos Médicos')
  console.log('=' .repeat(60))

  try {
    const documento = {
      id: 'test-001',
      fileName: 'evolucao_joao.txt',
      content: testDocument,
      uploadDate: new Date(),
      fileType: 'TXT' as any,
      status: 'analyzing' as any,
      patientId: undefined
    }

    console.log('📄 Analisando documento...')
    const analysis = await medicalDocumentAI.analyzeDocument(documento)
    
    console.log('✅ Análise concluída!')
    console.log(`📊 Confiança: ${(analysis.confidence * 100).toFixed(1)}%`)
    console.log(`📋 Tipo: ${analysis.documentType}`)
    console.log(`👤 Paciente: ${analysis.patientInfo.name}`)
    console.log(`🆔 CPF: ${analysis.patientInfo.cpf}`)
    console.log(`💊 Medicamentos: ${analysis.extractedData.medications?.length || 0}`)
    console.log(`🩺 Sintomas: ${analysis.extractedData.symptoms?.length || 0}`)
    console.log(`⚡ Ações sugeridas: ${analysis.suggestedActions.length}`)

    console.log('\n📈 Relatório completo:')
    const report = medicalDocumentAI.generateAnalysisReport(analysis)
    console.log(report)

    console.log('\n🎉 Teste concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

runTest().catch(console.error)
