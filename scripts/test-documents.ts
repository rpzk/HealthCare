#!/usr/bin/env npx ts-node --transpile-only
/**
 * Script de Teste - Sistema de Documentos Médicos
 * 
 * Testa a geração e assinatura de documentos médicos.
 * 
 * Uso:
 *   npx ts-node --transpile-only scripts/test-documents.ts
 * 
 * ATENÇÃO: Requer certificado digital ICP-Brasil A1 (.pfx) para testar assinatura.
 */

import { validateCertificate, extractCertificateInfo } from '@/lib/documents/pades-signer'
import { validatePrescription, validateCertificate as validateCertDoc, classifyMedication } from '@/lib/documents/validator'
import { generatePrescriptionPdf, generateCertificatePdf } from '@/lib/documents/pdf-generator'
import { DoctorInfo, PatientInfo, PrescriptionDocument, MedicalCertificateDocument } from '@/lib/documents/types'
import * as fs from 'fs'
import * as path from 'path'

// Dados de teste
const doctorTest: DoctorInfo = {
  name: 'Dr. João da Silva',
  crm: '123456',
  crmState: 'SP',
  specialty: 'Clínica Médica',
  rqe: '78901',
  address: 'Rua das Flores, 100 - Centro - São Paulo/SP',
  city: 'São Paulo',
  phone: '(11) 99999-9999',
  email: 'dr.joao@clinica.com.br',
}

const patientTest: PatientInfo = {
  name: 'Maria Aparecida dos Santos',
  documentType: 'CPF',
  documentNumber: '123.456.789-00',
  birthDate: new Date('1985-03-15'),
  age: 39,
  address: 'Av. Brasil, 500 - Centro - São Paulo/SP',
  phone: '(11) 88888-8888',
}

async function testMedicationClassification() {
  console.log('\n=== Teste de Classificação de Medicamentos ===\n')
  
  const medications = [
    'Amoxicilina',
    'Azitromicina',
    'Diazepam',
    'Clonazepam',
    'Morfina',
    'Fentanila',
    'Ritalina',
    'Sibutramina',
    'Isotretinoína',
    'Paracetamol',
    'Ibuprofeno',
  ]
  
  for (const med of medications) {
    const result = classifyMedication(med)
    console.log(`${med}:`)
    console.log(`  - Controlado: ${result.isControlled ? 'Sim' : 'Não'}`)
    console.log(`  - Tipo: ${result.controlledType || 'N/A'}`)
    console.log(`  - Antimicrobiano: ${result.isAntimicrobial ? 'Sim' : 'Não'}`)
    console.log()
  }
}

async function testPrescriptionValidation() {
  console.log('\n=== Teste de Validação de Prescrição ===\n')
  
  const prescription: PrescriptionDocument = {
    type: 'PRESCRIPTION',
    prescriptionId: 'test-123',
    doctor: doctorTest,
    patient: patientTest,
    issuedAt: new Date(),
    usageType: 'INTERNAL',
    medications: [
      {
        genericName: 'Amoxicilina',
        concentration: '500mg',
        pharmaceuticalForm: 'cápsula',
        quantity: 21,
        quantityUnit: 'cápsulas',
        dosage: '1 cápsula',
        route: 'oral',
        frequency: 'de 8 em 8 horas',
        duration: 'por 7 dias',
        isAntimicrobial: true,
      },
    ],
    validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  }
  
  const result = validatePrescription(prescription)
  
  console.log('Prescrição válida:', result.valid)
  if (!result.valid && result.errors) {
    console.log('Erros:')
    for (const error of result.errors) {
      console.log(`  - [${error.field}] ${error.message} (${error.code})`)
    }
  }
  if (result.warnings) {
    console.log('Alertas:')
    for (const warning of result.warnings) {
      console.log(`  - [${warning.field}] ${warning.message}`)
    }
  }
}

async function testCertificateValidation() {
  console.log('\n=== Teste de Validação de Atestado ===\n')
  
  const certificate: MedicalCertificateDocument = {
    type: 'MEDICAL_CERTIFICATE',
    certificateId: 'cert-456',
    sequenceNumber: 1,
    year: 2024,
    doctor: doctorTest,
    patient: patientTest,
    issuedAt: new Date(),
    certificateType: 'MEDICAL_LEAVE',
    title: 'ATESTADO MÉDICO',
    content: 'Atesto que o(a) paciente acima identificado(a) esteve sob meus cuidados médicos e necessita de afastamento de suas atividades.',
    startDate: new Date(),
    days: 3,
    includeCid: false,
  }
  
  const result = validateCertDoc(certificate)
  
  console.log('Atestado válido:', result.valid)
  if (!result.valid && result.errors) {
    console.log('Erros:')
    for (const error of result.errors) {
      console.log(`  - [${error.field}] ${error.message} (${error.code})`)
    }
  }
}

async function testPdfGeneration() {
  console.log('\n=== Teste de Geração de PDF ===\n')
  
  const prescription: PrescriptionDocument = {
    type: 'PRESCRIPTION',
    prescriptionId: 'test-pdf-123',
    doctor: doctorTest,
    patient: patientTest,
    issuedAt: new Date(),
    usageType: 'INTERNAL',
    medications: [
      {
        genericName: 'Amoxicilina',
        concentration: '500mg',
        pharmaceuticalForm: 'cápsula',
        quantity: 21,
        quantityUnit: 'cápsulas',
        dosage: '1 cápsula',
        route: 'oral',
        frequency: 'de 8 em 8 horas',
        duration: 'por 7 dias',
      },
      {
        genericName: 'Ibuprofeno',
        concentration: '400mg',
        pharmaceuticalForm: 'comprimido',
        quantity: 10,
        quantityUnit: 'comprimidos',
        dosage: '1 comprimido',
        route: 'oral',
        frequency: 'de 6 em 6 horas se dor',
        duration: 'se necessário',
      },
    ],
    notes: 'Retorno em 7 dias se não houver melhora.',
  }
  
  try {
    const pdfBuffer = await generatePrescriptionPdf(
      prescription,
      'https://sistema.clinica.com.br/verify/prescription/test-pdf-123'
    )
    
    // Salvar PDF para inspeção
    const outputPath = path.join(process.cwd(), 'uploads', 'test-prescription.pdf')
    fs.writeFileSync(outputPath, pdfBuffer)
    
    console.log(`PDF gerado com sucesso: ${outputPath}`)
    console.log(`Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
  }
}

async function testCertificateValidation2() {
  console.log('\n=== Teste de Certificado Digital ===\n')
  
  // Procurar por certificados de teste
  const certPaths = [
    process.env.TEST_CERTIFICATE_PATH,
    './certificates/test.pfx',
    './test-cert.pfx',
    './uploads/certificates/test.pfx',
  ].filter(Boolean) as string[]
  
  const password = process.env.TEST_CERTIFICATE_PASSWORD || ''
  
  for (const certPath of certPaths) {
    if (fs.existsSync(certPath)) {
      console.log(`Testando certificado: ${certPath}`)
      
      try {
        const pfxBuffer = fs.readFileSync(certPath)
        const validation = validateCertificate(pfxBuffer, password)
        
        console.log('Certificado válido:', validation.valid)
        if (validation.info) {
          console.log('Informações:')
          console.log(`  - Subject: ${validation.info.subject}`)
          console.log(`  - Issuer: ${validation.info.issuer}`)
          console.log(`  - Serial: ${validation.info.serial}`)
          console.log(`  - Válido de: ${validation.info.validFrom?.toISOString()}`)
          console.log(`  - Válido até: ${validation.info.validTo?.toISOString()}`)
          console.log(`  - CPF: ${validation.info.cpf || 'N/A'}`)
          console.log(`  - Nome: ${validation.info.name || 'N/A'}`)
        }
        if (!validation.valid) {
          console.log('Erros:', validation.errors)
        }
      } catch (error) {
        console.error('Erro ao validar certificado:', error)
      }
      
      return
    }
  }
  
  console.log('Nenhum certificado de teste encontrado.')
  console.log('Para testar a assinatura digital:')
  console.log('1. Coloque um certificado .pfx em ./certificates/test.pfx')
  console.log('2. Defina TEST_CERTIFICATE_PATH e TEST_CERTIFICATE_PASSWORD')
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║    Sistema de Documentos Médicos - Teste de Validação     ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  await testMedicationClassification()
  await testPrescriptionValidation()
  await testCertificateValidation()
  await testPdfGeneration()
  await testCertificateValidation2()
  
  console.log('\n=== Testes concluídos ===\n')
}

main().catch(console.error)
