/**
 * 👥 Sistema Otimizado de Cadastro Automático de Pacientes
 * Especializado em processar documentos cadastrais completos
 */

import { medicalDocumentAI } from './medical-document-ai'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

export interface PatientRegistrationData {
  // Dados Básicos (Obrigatórios)
  nome: string
  cpf?: string
  rg?: string
  dataNascimento?: Date
  sexo?: 'M' | 'F' | 'OUTRO'

  // Contato
  telefone?: string
  celular?: string
  email?: string

  // Endereço Completo
  endereco?: {
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  }

  // Dados Médicos
  tipoSanguineo?: string
  alergias?: string[]
  medicamentosUso?: string[]
  convenio?: {
    nome?: string
    numero?: string
    plano?: string
  }

  // Contato de Emergência
  contatoEmergencia?: {
    nome?: string
    parentesco?: string
    telefone?: string
  }

  // Dados Profissionais
  profissao?: string
  empresa?: string

  // Observações
  observacoes?: string
}

class PatientRegistrationAI {
  
  /**
   * 🤖 Patterns específicos para documentos cadastrais
   */
  private cadastralPatterns = {
    // Dados pessoais
    nome: [
      /nome[:\s]+([^,\n]+)/gi,
      /paciente[:\s]+([^,\n]+)/gi,
      /identificação[:\s]+([^,\n]+)/gi
    ],
    
    cpf: [
      /cpf[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi,
      /documento[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi
    ],
    
    rg: [
      /rg[:\s]*([a-zA-Z0-9\-\.\/\s]+)/gi,
      /identidade[:\s]*([a-zA-Z0-9\-\.\/\s]+)/gi
    ],
    
    nascimento: [
      /nascimento[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /data\s+nasc[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}/gi
    ],
    
    sexo: [
      /sexo[:\s]*(masculino|feminino|m|f)/gi,
      /gênero[:\s]*(masculino|feminino|m|f)/gi
    ],

    // Contato
    telefone: [
      /telefone[:\s]*\(?(\d{2})\)?\s*\d{4,5}-?\d{4}/gi,
      /fone[:\s]*\(?(\d{2})\)?\s*\d{4,5}-?\d{4}/gi,
      /contato[:\s]*\(?(\d{2})\)?\s*\d{4,5}-?\d{4}/gi
    ],
    
    celular: [
      /celular[:\s]*\(?(\d{2})\)?\s*9\d{4}-?\d{4}/gi,
      /móvel[:\s]*\(?(\d{2})\)?\s*9\d{4}-?\d{4}/gi
    ],
    
    email: [
      /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /e-mail[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
    ],

    // Endereço
    endereco: [
      /endereço[:\s]*([^,\n]+)/gi,
      /logradouro[:\s]*([^,\n]+)/gi,
      /rua[:\s]*([^,\n]+)/gi,
      /avenida[:\s]*([^,\n]+)/gi
    ],
    
    numero: [
      /número[:\s]*(\d+[a-zA-Z]*)/gi,
      /nº[:\s]*(\d+[a-zA-Z]*)/gi,
      /n°[:\s]*(\d+[a-zA-Z]*)/gi
    ],
    
    bairro: [
      /bairro[:\s]*([^,\n]+)/gi,
      /distrito[:\s]*([^,\n]+)/gi
    ],
    
    cidade: [
      /cidade[:\s]*([^,\n]+)/gi,
      /município[:\s]*([^,\n]+)/gi
    ],
    
    cep: [
      /cep[:\s]*(\d{5}-?\d{3})/gi,
      /código postal[:\s]*(\d{5}-?\d{3})/gi
    ],

    // Dados médicos
    tipoSanguineo: [
      /tipo\s+sanguíneo[:\s]*(A|B|AB|O)[+-]?/gi,
      /sangue[:\s]*(A|B|AB|O)[+-]?/gi
    ],
    
    alergias: [
      /alergia[s]?[:\s]*([^,\n]+)/gi,
      /sensibilidade[:\s]*([^,\n]+)/gi
    ],
    
    convenio: [
      /convênio[:\s]*([^,\n]+)/gi,
      /plano[:\s]*([^,\n]+)/gi,
      /seguro[:\s]*([^,\n]+)/gi
    ],

    // Emergência
    contatoEmergencia: [
      /emergência[:\s]*([^,\n]+)/gi,
      /contato\s+emergência[:\s]*([^,\n]+)/gi,
      /pessoa\s+responsável[:\s]*([^,\n]+)/gi
    ]
  }

  /**
   * 📋 Analisa documento cadastral completo
   */
  async analyzePatientRegistrationDocument(content: string): Promise<PatientRegistrationData> {
    const data: PatientRegistrationData = {
      nome: ''
    }

    // Extrair dados básicos
    data.nome = this.extractField(content, this.cadastralPatterns.nome) || 'Nome não identificado'
    data.cpf = this.extractField(content, this.cadastralPatterns.cpf)
    data.rg = this.extractField(content, this.cadastralPatterns.rg)
    
    // Data de nascimento
    const nascimentoStr = this.extractField(content, this.cadastralPatterns.nascimento)
    if (nascimentoStr) {
      data.dataNascimento = this.parseDate(nascimentoStr)
    }

    // Sexo/Gênero
    const sexoStr = this.extractField(content, this.cadastralPatterns.sexo)
    if (sexoStr) {
      const sexoLower = sexoStr.toLowerCase()
      if (sexoLower.includes('m') || sexoLower.includes('masculino')) {
        data.sexo = 'M'
      } else if (sexoLower.includes('f') || sexoLower.includes('feminino')) {
        data.sexo = 'F'
      } else {
        data.sexo = 'OUTRO'
      }
    }

    // Contato
    data.telefone = this.extractField(content, this.cadastralPatterns.telefone)
    data.celular = this.extractField(content, this.cadastralPatterns.celular)
    data.email = this.extractField(content, this.cadastralPatterns.email)

    // Endereço
    const endereco = this.extractField(content, this.cadastralPatterns.endereco)
    if (endereco) {
      data.endereco = {
        logradouro: endereco,
        numero: this.extractField(content, this.cadastralPatterns.numero),
        bairro: this.extractField(content, this.cadastralPatterns.bairro),
        cidade: this.extractField(content, this.cadastralPatterns.cidade),
        cep: this.extractField(content, this.cadastralPatterns.cep)
      }
    }

    // Dados médicos
    data.tipoSanguineo = this.extractField(content, this.cadastralPatterns.tipoSanguineo)
    
    const alergiasStr = this.extractField(content, this.cadastralPatterns.alergias)
    if (alergiasStr) {
      data.alergias = alergiasStr.split(/[,;]/).map(a => a.trim()).filter(Boolean)
    }

    // Convênio
    const convenioStr = this.extractField(content, this.cadastralPatterns.convenio)
    if (convenioStr) {
      data.convenio = {
        nome: convenioStr
      }
    }

    return data
  }

  /**
   * 🏥 Cria ou atualiza paciente com dados cadastrais completos
   */
  async createOrUpdatePatientFromRegistration(registrationData: PatientRegistrationData): Promise<{
    patient: { id: string; name: string; cpf: string | null; email: string; phone: string | null; birthDate: Date | null; gender: string | null }
    action: 'created' | 'updated'
    confidence: number
  }> {
    let patient = null
    let action: 'created' | 'updated' = 'created'

    // Buscar paciente existente (prioridade: CPF > nome)
    if (registrationData.cpf) {
      const clean = registrationData.cpf.replace(/\D/g,'')
      patient = await prisma.patient.findFirst({ where: { cpf: { contains: clean.slice(-4) } } })
    }

    if (!patient && registrationData.nome) {
      patient = await prisma.patient.findFirst({
        where: {
          name: {
            contains: registrationData.nome.split(' ')[0],
            mode: 'insensitive'
          }
        }
      })
    }

    // Preparar dados para o banco (usar campos corretos do schema)
    const patientData = {
      name: registrationData.nome,
  cpf: registrationData.cpf?.replace(/\D/g, ''),
      email: registrationData.email || `patient_${Date.now()}@temp.com`,
      phone: registrationData.telefone || registrationData.celular,
      birthDate: registrationData.dataNascimento || new Date('1900-01-01'),
      gender: this.convertGender(registrationData.sexo),
      address: this.formatAddress(registrationData.endereco),
      allergies: registrationData.alergias?.join(', '),
      emergencyContact: registrationData.contatoEmergencia?.nome,
      medicalHistory: this.formatMedicalHistory(registrationData),
      currentMedications: registrationData.medicamentosUso?.join(', ')
    }

    if (patient) {
      // Atualizar paciente existente
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          name: patientData.name || patient.name,
          cpf: patientData.cpf ? encrypt(patientData.cpf) : patient.cpf,
          email: patientData.email || patient.email,
          phone: patientData.phone || patient.phone,
          birthDate: patientData.birthDate || patient.birthDate,
          gender: patientData.gender || patient.gender,
          address: patientData.address || patient.address,
          allergies: patientData.allergies || patient.allergies,
          emergencyContact: patientData.emergencyContact || patient.emergencyContact,
          medicalHistory: patientData.medicalHistory || patient.medicalHistory,
          currentMedications: patientData.currentMedications || patient.currentMedications
        }
      })
      action = 'updated'
    } else {
      // Criar novo paciente
      patient = await prisma.patient.create({
        data: {
          ...patientData,
          cpf: patientData.cpf ? encrypt(patientData.cpf) : null,
          email: patientData.email || `patient_${Date.now()}@temp.com` // Campo obrigatório
        }
      })
      action = 'created'
    }

    // Calcular confiança baseada na quantidade de dados extraídos
    const confidence = this.calculateRegistrationConfidence(registrationData)

    return { patient, action, confidence }
  }

  /**
   * 🔍 Extrai campo usando múltiplos patterns
   */
  private extractField(content: string, patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1]?.trim() || match[0]?.trim()
      }
    }
    return undefined
  }

  /**
   * 📅 Converte string para data
   */
  private parseDate(dateStr: string): Date | undefined {
    const cleaned = dateStr.replace(/\D/g, '')
    if (cleaned.length === 8) {
      const day = parseInt(cleaned.substring(0, 2))
      const month = parseInt(cleaned.substring(2, 4))
      const year = parseInt(cleaned.substring(4, 8))
      
      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
        return new Date(year, month - 1, day)
      }
    }
    return undefined
  }

  /**
   * 👥 Converte gênero para formato do banco
   */
  private convertGender(sexo?: 'M' | 'F' | 'OUTRO'): 'MALE' | 'FEMALE' | 'OTHER' {
    switch (sexo) {
      case 'M': return 'MALE'
      case 'F': return 'FEMALE'
      default: return 'OTHER'
    }
  }

  /**
   * 🏠 Formata endereço completo
   */
  private formatAddress(endereco?: PatientRegistrationData['endereco']): string {
    if (!endereco) return ''
    
    const parts = [
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.cep
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  /**
   * 📋 Formata histórico médico
   */
  private formatMedicalHistory(data: PatientRegistrationData): string {
    const history = []
    
    if (data.tipoSanguineo) {
      history.push(`Tipo sanguíneo: ${data.tipoSanguineo}`)
    }
    
    if (data.alergias?.length) {
      history.push(`Alergias: ${data.alergias.join(', ')}`)
    }
    
    if (data.medicamentosUso?.length) {
      history.push(`Medicamentos em uso: ${data.medicamentosUso.join(', ')}`)
    }
    
    if (data.convenio) {
      history.push(`Convênio: ${data.convenio.nome}`)
    }
    
    if (data.observacoes) {
      history.push(`Observações: ${data.observacoes}`)
    }
    
    return history.join('\n')
  }

  /**
   * 🎯 Calcula confiança baseada na completude dos dados
   */
  private calculateRegistrationConfidence(data: PatientRegistrationData): number {
    let score = 0
    const maxScore = 10

    // Dados obrigatórios
    if (data.nome && data.nome !== 'Nome não identificado') score += 2
    if (data.cpf) score += 2
    if (data.dataNascimento) score += 1

    // Dados de contato
    if (data.telefone || data.celular) score += 1
    if (data.email) score += 1

    // Endereço
    if (data.endereco?.logradouro) score += 1

    // Dados médicos
    if (data.tipoSanguineo) score += 1
    if (data.alergias?.length) score += 1

    return Math.min(score / maxScore, 1)
  }
}

export const patientRegistrationAI = new PatientRegistrationAI()
