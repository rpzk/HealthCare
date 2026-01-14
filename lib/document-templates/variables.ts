/**
 * Definição de variáveis disponíveis para templates
 * Usado para validação, autocomplete e geração de placeholders
 */

export interface TemplateVariable {
  name: string
  description: string
  example: string
  type: 'text' | 'html' | 'image' | 'date' | 'number'
  required?: boolean
  category: 'clinic' | 'doctor' | 'patient' | 'document' | 'signature'
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Clínica
  {
    name: 'clinic.name',
    description: 'Nome da clínica',
    example: 'Clínica Saúde Total',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.address',
    description: 'Endereço da clínica',
    example: 'Rua das Flores, 123',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.city',
    description: 'Cidade da clínica',
    example: 'São Paulo',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.state',
    description: 'Estado da clínica',
    example: 'SP',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.zipCode',
    description: 'CEP da clínica',
    example: '01310-100',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.phone',
    description: 'Telefone da clínica',
    example: '(11) 3333-4444',
    type: 'text',
    category: 'clinic',
  },
  {
    name: 'clinic.logo',
    description: 'Logo da clínica (HTML img tag)',
    example: '<img src="..." alt="Logo">',
    type: 'html',
    category: 'clinic',
  },
  {
    name: 'clinic.header',
    description: 'Header da clínica (HTML img tag)',
    example: '<img src="..." alt="Header">',
    type: 'html',
    category: 'clinic',
  },
  {
    name: 'clinic.footer',
    description: 'Texto do rodapé da clínica',
    example: 'Todos os direitos reservados',
    type: 'text',
    category: 'clinic',
  },

  // Médico
  {
    name: 'doctor.name',
    description: 'Nome completo do médico',
    example: 'Dr. João Silva',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.speciality',
    description: 'Especialidade do médico',
    example: 'Cardiologia',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.crmNumber',
    description: 'Número do CRM',
    example: '123456',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.licenseType',
    description: 'Tipo de licença (CRM, COREN, etc)',
    example: 'CRM',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.licenseState',
    description: 'Estado da licença',
    example: 'SP',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.phone',
    description: 'Telefone do médico',
    example: '(11) 98765-4321',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.email',
    description: 'Email do médico',
    example: 'joao@email.com',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.address',
    description: 'Endereço profissional do médico',
    example: 'Av. Paulista, 1000',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.city',
    description: 'Cidade do endereço profissional',
    example: 'São Paulo',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.state',
    description: 'Estado do endereço profissional',
    example: 'SP',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.zipCode',
    description: 'CEP do endereço profissional',
    example: '01311-100',
    type: 'text',
    category: 'doctor',
  },
  {
    name: 'doctor.logo',
    description: 'Logo pessoal do médico (HTML img tag)',
    example: '<img src="..." alt="Logo Médico">',
    type: 'html',
    category: 'doctor',
  },

  // Paciente
  {
    name: 'patient.name',
    description: 'Nome completo do paciente',
    example: 'Maria Santos',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.email',
    description: 'Email do paciente',
    example: 'maria@email.com',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.phone',
    description: 'Telefone do paciente',
    example: '(11) 99999-8888',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.cpf',
    description: 'CPF do paciente',
    example: '123.456.789-00',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.birthDate',
    description: 'Data de nascimento do paciente',
    example: '01/01/1990',
    type: 'date',
    category: 'patient',
  },
  {
    name: 'patient.age',
    description: 'Idade do paciente',
    example: '34',
    type: 'number',
    category: 'patient',
  },
  {
    name: 'patient.gender',
    description: 'Gênero do paciente',
    example: 'Feminino',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.address',
    description: 'Endereço do paciente',
    example: 'Rua das Acácias, 456',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.city',
    description: 'Cidade do paciente',
    example: 'São Paulo',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.state',
    description: 'Estado do paciente',
    example: 'SP',
    type: 'text',
    category: 'patient',
  },
  {
    name: 'patient.zipCode',
    description: 'CEP do paciente',
    example: '01450-000',
    type: 'text',
    category: 'patient',
  },

  // Documento
  {
    name: 'document.date',
    description: 'Data do documento (DD/MM/YYYY)',
    example: '14/01/2026',
    type: 'date',
    category: 'document',
  },
  {
    name: 'document.datetime',
    description: 'Data e hora do documento',
    example: '14/01/2026 10:30',
    type: 'date',
    category: 'document',
  },
  {
    name: 'document.time',
    description: 'Hora do documento (HH:MM)',
    example: '10:30',
    type: 'text',
    category: 'document',
  },
  {
    name: 'document.number',
    description: 'Número/ID do documento',
    example: '12345',
    type: 'text',
    category: 'document',
  },
  {
    name: 'document.type',
    description: 'Tipo do documento',
    example: 'Prescrição',
    type: 'text',
    category: 'document',
  },
  {
    name: 'document.qrcode',
    description: 'QR Code do documento (HTML img tag)',
    example: '<img src="..." alt="QR Code">',
    type: 'html',
    category: 'document',
  },

  // Assinatura
  {
    name: 'signature.line',
    description: 'Linha para assinatura manuscrita',
    example: '_______________________',
    type: 'html',
    category: 'signature',
  },
  {
    name: 'signature.digital',
    description: 'Indicador de assinatura digital',
    example: '✓ Assinado Digitalmente',
    type: 'html',
    category: 'signature',
  },
  {
    name: 'signature.date',
    description: 'Data da assinatura',
    example: '14/01/2026',
    type: 'date',
    category: 'signature',
  },
]

/**
 * Agrupar variáveis por categoria
 */
export function getVariablesByCategory(
  category: TemplateVariable['category']
): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter((v) => v.category === category)
}

/**
 * Obter todas as categorias
 */
export function getCategories(): TemplateVariable['category'][] {
  return Array.from(new Set(TEMPLATE_VARIABLES.map((v) => v.category)))
}

/**
 * Validar se uma variável existe
 */
export function isValidVariable(variableName: string): boolean {
  return TEMPLATE_VARIABLES.some((v) => v.name === variableName)
}

/**
 * Extrair todas as variáveis de um template HTML
 */
export function extractVariables(htmlTemplate: string): string[] {
  const regex = /\{\{([\w.]+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(htmlTemplate)) !== null) {
    variables.push(match[1])
  }

  return Array.from(new Set(variables))
}

/**
 * Validar variáveis em um template
 */
export function validateTemplateVariables(htmlTemplate: string): {
  valid: boolean
  invalid: string[]
  message: string
} {
  const extracted = extractVariables(htmlTemplate)
  const invalid = extracted.filter((v) => !isValidVariable(v))

  return {
    valid: invalid.length === 0,
    invalid,
    message:
      invalid.length === 0
        ? 'Todas as variáveis são válidas'
        : `Variáveis inválidas encontradas: ${invalid.join(', ')}`,
  }
}
