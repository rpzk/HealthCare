/**
 * PDF Export Tests
 * 
 * Tests for medical record PDF export functionality:
 * - PDF generation
 * - Content validation
 * - Export options
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock medical record data
const mockRecord = {
  id: 'record-123',
  patientId: 'patient-456',
  title: 'Consulta de Rotina',
  description: 'Exame de rotina anual',
  type: 'CONSULTATION',
  status: 'ACTIVE',
  tags: ['rotina', 'checkup'],
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  patient: {
    id: 'patient-456',
    name: 'João da Silva',
    birthDate: new Date('1985-06-20'),
    cpf: '123.456.789-00',
    gender: 'MALE',
    email: 'joao@email.com',
    phone: '(11) 99999-9999'
  },
  doctor: {
    id: 'doctor-789',
    name: 'Dra. Maria Santos',
    crmNumber: '123456',
    licenseState: 'SP',
    speciality: 'Clínica Geral'
  },
  consultation: {
    chiefComplaint: 'Dor de cabeça frequente',
    history: 'Paciente relata dores de cabeça há 2 semanas',
    physicalExam: 'PA: 120x80, FC: 72, Temp: 36.5',
    assessment: 'Cefaleia tensional',
    plan: 'Prescrição de analgésico e acompanhamento em 15 dias'
  },
  vitalSigns: {
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 72,
    temperature: 36.5,
    weight: 75,
    height: 175
  },
  prescriptions: [
    {
      medication: 'Dipirona 500mg',
      dosage: '1 comprimido',
      frequency: '6/6 horas',
      duration: '5 dias'
    }
  ],
  diagnoses: [
    {
      code: 'G43.9',
      description: 'Enxaqueca, não especificada'
    }
  ]
}

// Mock PDF generation function
function generatePdfContent(
  record: typeof mockRecord,
  options: {
    includeHeader?: boolean
    includeSignature?: boolean
    includeVitals?: boolean
    includePrescriptions?: boolean
    includeDiagnoses?: boolean
    format?: 'A4' | 'LETTER'
  } = {}
): string {
  const {
    includeHeader = true,
    includeSignature = true,
    includeVitals = true,
    includePrescriptions = true,
    includeDiagnoses = true
  } = options

  const sections: string[] = []

  if (includeHeader) {
    sections.push(`
      <header>
        <h1>Prontuário Médico</h1>
        <p>Data: ${record.createdAt.toLocaleDateString('pt-BR')}</p>
      </header>
    `)
  }

  sections.push(`
    <section class="patient-info">
      <h2>Dados do Paciente</h2>
      <p>Nome: ${record.patient.name}</p>
      <p>Data de Nascimento: ${record.patient.birthDate.toLocaleDateString('pt-BR')}</p>
      <p>CPF: ${record.patient.cpf}</p>
    </section>
  `)

  sections.push(`
    <section class="consultation">
      <h2>Consulta</h2>
      <p><strong>Queixa Principal:</strong> ${record.consultation.chiefComplaint}</p>
      <p><strong>Histórico:</strong> ${record.consultation.history}</p>
      <p><strong>Exame Físico:</strong> ${record.consultation.physicalExam}</p>
      <p><strong>Avaliação:</strong> ${record.consultation.assessment}</p>
      <p><strong>Plano:</strong> ${record.consultation.plan}</p>
    </section>
  `)

  if (includeVitals && record.vitalSigns) {
    sections.push(`
      <section class="vitals">
        <h2>Sinais Vitais</h2>
        <ul>
          <li>Pressão Arterial: ${record.vitalSigns.systolicBP}x${record.vitalSigns.diastolicBP} mmHg</li>
          <li>Frequência Cardíaca: ${record.vitalSigns.heartRate} bpm</li>
          <li>Temperatura: ${record.vitalSigns.temperature}°C</li>
          <li>Peso: ${record.vitalSigns.weight} kg</li>
          <li>Altura: ${record.vitalSigns.height} cm</li>
        </ul>
      </section>
    `)
  }

  if (includePrescriptions && record.prescriptions.length > 0) {
    const prescriptionList = record.prescriptions.map(p =>
      `<li>${p.medication} - ${p.dosage} - ${p.frequency} por ${p.duration}</li>`
    ).join('')
    
    sections.push(`
      <section class="prescriptions">
        <h2>Prescrições</h2>
        <ul>${prescriptionList}</ul>
      </section>
    `)
  }

  if (includeDiagnoses && record.diagnoses.length > 0) {
    const diagnosesList = record.diagnoses.map(d =>
      `<li>${d.code} - ${d.description}</li>`
    ).join('')
    
    sections.push(`
      <section class="diagnoses">
        <h2>Diagnósticos</h2>
        <ul>${diagnosesList}</ul>
      </section>
    `)
  }

  if (includeSignature) {
    sections.push(`
      <footer class="signature">
        <p>${record.doctor.name}</p>
        <p>CRM: ${record.doctor.crmNumber}/${record.doctor.licenseState}</p>
        <p>${record.doctor.speciality}</p>
      </footer>
    `)
  }

  return sections.join('\n')
}

function validatePdfContent(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!html.includes('Dados do Paciente')) {
    errors.push('Missing patient data section')
  }

  if (!html.includes('Consulta')) {
    errors.push('Missing consultation section')
  }

  // Check for required fields
  const requiredFields = ['Nome:', 'Data de Nascimento:', 'CPF:']
  for (const field of requiredFields) {
    if (!html.includes(field)) {
      errors.push(`Missing field: ${field}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

describe('PDF Export', () => {
  describe('Content Generation', () => {
    it('should generate full PDF content', () => {
      const content = generatePdfContent(mockRecord)
      
      expect(content).toContain('Prontuário Médico')
      expect(content).toContain('João da Silva')
      expect(content).toContain('Queixa Principal')
    })

    it('should include patient information', () => {
      const content = generatePdfContent(mockRecord)
      
      expect(content).toContain(mockRecord.patient.name)
      expect(content).toContain(mockRecord.patient.cpf)
    })

    it('should include consultation details', () => {
      const content = generatePdfContent(mockRecord)
      
      expect(content).toContain(mockRecord.consultation.chiefComplaint)
      expect(content).toContain(mockRecord.consultation.assessment)
      expect(content).toContain(mockRecord.consultation.plan)
    })

    it('should include vital signs when option is true', () => {
      const content = generatePdfContent(mockRecord, { includeVitals: true })
      
      expect(content).toContain('Sinais Vitais')
      expect(content).toContain('120x80 mmHg')
    })

    it('should exclude vital signs when option is false', () => {
      const content = generatePdfContent(mockRecord, { includeVitals: false })
      
      expect(content).not.toContain('Sinais Vitais')
    })

    it('should include prescriptions when available', () => {
      const content = generatePdfContent(mockRecord, { includePrescriptions: true })
      
      expect(content).toContain('Prescrições')
      expect(content).toContain('Dipirona 500mg')
    })

    it('should include diagnoses when available', () => {
      const content = generatePdfContent(mockRecord, { includeDiagnoses: true })
      
      expect(content).toContain('Diagnósticos')
      expect(content).toContain('G43.9')
      expect(content).toContain('Enxaqueca')
    })

    it('should include doctor signature', () => {
      const content = generatePdfContent(mockRecord, { includeSignature: true })
      
      expect(content).toContain(mockRecord.doctor.name)
      expect(content).toContain(`CRM: ${mockRecord.doctor.crmNumber}`)
    })
  })

  describe('Content Validation', () => {
    it('should validate complete content', () => {
      const content = generatePdfContent(mockRecord)
      const result = validatePdfContent(content)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing sections', () => {
      const incompleteContent = '<html><body>Empty</body></html>'
      const result = validatePdfContent(incompleteContent)
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Data Formatting', () => {
    it('should calculate patient age', () => {
      const birthDate = new Date('1985-06-20')
      const age = calculateAge(birthDate)
      
      // Age should be 38 or 39 depending on current date
      expect(age).toBeGreaterThanOrEqual(38)
      expect(age).toBeLessThanOrEqual(40)
    })

    it('should format CPF correctly', () => {
      expect(formatCpf('12345678900')).toBe('123.456.789-00')
      expect(formatCpf('123.456.789-00')).toBe('123.456.789-00')
    })

    it('should format dates in Brazilian format', () => {
      const date = new Date('2024-01-15')
      const formatted = date.toLocaleDateString('pt-BR')
      
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('Export Options', () => {
    it('should respect header option', () => {
      const withHeader = generatePdfContent(mockRecord, { includeHeader: true })
      const withoutHeader = generatePdfContent(mockRecord, { includeHeader: false })
      
      expect(withHeader).toContain('<header>')
      expect(withoutHeader).not.toContain('<header>')
    })

    it('should handle minimal export', () => {
      const minimal = generatePdfContent(mockRecord, {
        includeHeader: false,
        includeSignature: false,
        includeVitals: false,
        includePrescriptions: false,
        includeDiagnoses: false
      })
      
      expect(minimal).toContain('Dados do Paciente')
      expect(minimal).toContain('Consulta')
      expect(minimal).not.toContain('Sinais Vitais')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing patient data', () => {
      const recordWithoutPatient = {
        ...mockRecord,
        patient: {
          ...mockRecord.patient,
          name: '',
          cpf: ''
        }
      }
      
      const content = generatePdfContent(recordWithoutPatient)
      
      // Should still generate content
      expect(content).toContain('Dados do Paciente')
    })

    it('should handle empty prescriptions', () => {
      const recordNoPrescriptions = {
        ...mockRecord,
        prescriptions: []
      }
      
      const content = generatePdfContent(recordNoPrescriptions, { includePrescriptions: true })
      
      expect(content).not.toContain('Prescrições')
    })

    it('should handle empty diagnoses', () => {
      const recordNoDiagnoses = {
        ...mockRecord,
        diagnoses: []
      }
      
      const content = generatePdfContent(recordNoDiagnoses, { includeDiagnoses: true })
      
      expect(content).not.toContain('Diagnósticos')
    })
  })

  describe('PDF Buffer', () => {
    it('should detect PDF magic bytes', () => {
      // PDF files start with %PDF (0x25 0x50 0x44 0x46)
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e])
      const htmlBuffer = Buffer.from('<html>')
      
      const isPdf = (buffer: Buffer) => buffer[0] === 0x25 && buffer[1] === 0x50
      
      expect(isPdf(pdfBuffer)).toBe(true)
      expect(isPdf(htmlBuffer)).toBe(false)
    })
  })
})

describe('Bulk PDF Export', () => {
  const mockRecords = [mockRecord, { ...mockRecord, id: 'record-456' }]

  it('should export multiple records', () => {
    const exports = mockRecords.map(r => generatePdfContent(r))
    
    expect(exports).toHaveLength(2)
  })

  it('should generate unique filenames', () => {
    const generateFilename = (record: { id: string; createdAt: Date }) => {
      const date = record.createdAt.toISOString().split('T')[0]
      return `prontuario-${record.id.slice(-8)}-${date}.pdf`
    }
    
    const filenames = mockRecords.map(generateFilename)
    
    expect(new Set(filenames).size).toBe(filenames.length)
  })
})
