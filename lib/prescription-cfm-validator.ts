/**
 * Serviço de validação de prescrições médicas conforme normas CFM
 * Implementa regras de Portaria 344/98 e Resolução CFM nº 2.299/2021
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Lista de medicamentos controlados por categoria (Portaria 344/98)
export const CONTROLLED_MEDICATIONS = {
  A1: [
    'anfetamina',
    'cocaína',
    'dietilpropiona',
    'femproporex',
    'mazindol',
    'metilfenidato',
  ],
  A2: ['benzoilecgonina', 'ecgonina', 'folha de coca'],
  A3: ['fentanila', 'metadona', 'tramadol'],
  B1: [
    'alprazolam',
    'bromazepam',
    'diazepam',
    'flumazenil',
    'lorazepam',
    'nitrazepam',
    'triazolam',
  ],
  B2: [
    'amobarbital',
    'butabarbital',
    'fenobarbital',
    'pentobarbital',
    'secobarbital',
  ],
}

export const ANTIMICROBIALS = [
  'amoxicilina',
  'ampicilina',
  'azitromicina',
  'ceftriaxona',
  'cefalexina',
  'ciprofloxacino',
  'claritromicina',
  'clindamicina',
  'doxiciclina',
  'eritromicina',
  'gentamicina',
  'levofloxacino',
  'metronidazol',
  'moxifloxacino',
  'norfloxacino',
  'ofloxacino',
  'penicilina',
  'sulfametoxazol',
  'tetraciclina',
  'tobramicina',
]

// Schema de validação para medicamentos
export const MedicationSchema = z.object({
  name: z.string().min(2, 'Nome do medicamento obrigatório').toUpperCase(),
  concentration: z.string().min(1, 'Concentração obrigatória'),
  form: z.enum(
    ['comprimido', 'cápsula', 'solução', 'injeção', 'pó', 'pomada', 'creme', 'xarope'],
    {
      errorMap: () => ({ message: 'Forma farmacêutica inválida' }),
    }
  ),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  quantityUnit: z
    .enum(['comprimido', 'cápsula', 'mL', 'g', 'ampola', 'tubo', 'frasco', 'dose'], {
      errorMap: () => ({ message: 'Unidade de medida inválida' }),
    })
    .or(z.string()),
  isControlled: z.boolean().default(false),
  quantityWritten: z.string().optional(),
  posology: z
    .string()
    .min(10, 'Posologia deve ser detalhada (mínimo 10 caracteres)')
    .refine(
      (val) => !/(se\s+dor|conforme\s+necessário|a\s+noite|pela\s+manhã)/i.test(val),
      {
        message:
          'Posologia ambígua. Use: "1 comprimido por via oral a cada 6 horas, não excedendo 4 doses ao dia"',
      }
    ),
  observations: z.string().optional(),
  isAntimicrobial: z.boolean().default(false),
})

export type MedicationInput = z.infer<typeof MedicationSchema>

export const DoctorSchema = z.object({
  name: z.string().min(3, 'Nome do médico obrigatório').toUpperCase(),
  crm: z
    .string()
    .regex(/^\d+$/, 'CRM deve conter apenas números')
    .min(4, 'CRM inválido'),
  state: z
    .string()
    .length(2, 'Estado deve ter 2 letras')
    .toUpperCase(),
  rqe: z.string().optional(),
  specialty: z.string().optional(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .optional(),
  address: z.string().min(5, 'Endereço obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  clinicName: z.string().optional(),
  clinicCnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .optional(),
  logoUrl: z.string().url('Logo deve ser URL válida').optional(),
})

export type DoctorInput = z.infer<typeof DoctorSchema>

export const PatientSchema = z.object({
  name: z.string().min(3, 'Nome do paciente obrigatório'),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .optional(),
  dateOfBirth: z
    .date()
    .refine((date) => date < new Date(), {
      message: 'Data de nascimento não pode ser no futuro',
    }),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export type PatientInput = z.infer<typeof PatientSchema>

export const PrescriptionSchema = z.object({
  doctor: DoctorSchema,
  patient: PatientSchema,
  medications: z.array(MedicationSchema).min(1, 'Mínimo 1 medicamento obrigatório'),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
})

export type PrescriptionInput = z.infer<typeof PrescriptionSchema>

/**
 * Valida se um medicamento é controlado segundo Portaria 344/98
 */
export function isControlledMedication(medicationName: string): {
  isControlled: boolean
  category?: 'A1' | 'A2' | 'A3' | 'B1' | 'B2'
} {
  const normalized = medicationName.toLowerCase().trim()

  for (const [category, medications] of Object.entries(CONTROLLED_MEDICATIONS)) {
    if (medications.some((med) => normalized.includes(med.toLowerCase()))) {
      return {
        isControlled: true,
        category: category as 'A1' | 'A2' | 'A3' | 'B1' | 'B2',
      }
    }
  }

  return { isControlled: false }
}

/**
 * Valida se um medicamento é antimicrobiano
 */
export function isAntimicrobial(medicationName: string): boolean {
  const normalized = medicationName.toLowerCase().trim()
  return ANTIMICROBIALS.some((med) => normalized.includes(med.toLowerCase()))
}

/**
 * Valida quantidade escrita por extenso (números de 1-999)
 */
function validateQuantityWritten(number: number, written: string): boolean {
  const numberWords: { [key: number]: string } = {
    1: 'um',
    2: 'dois',
    3: 'três',
    4: 'quatro',
    5: 'cinco',
    6: 'seis',
    7: 'sete',
    8: 'oito',
    9: 'nove',
    10: 'dez',
    11: 'onze',
    12: 'doze',
    13: 'treze',
    14: 'quatorze',
    15: 'quinze',
    16: 'dezesseis',
    17: 'dezessete',
    18: 'dezoito',
    19: 'dezenove',
    20: 'vinte',
    30: 'trinta',
    40: 'quarenta',
    50: 'cinquenta',
    60: 'sessenta',
    70: 'setenta',
    80: 'oitenta',
    90: 'noventa',
    100: 'cem',
    200: 'duzentos',
    300: 'trezentos',
    400: 'quatrocentos',
    500: 'quinhentos',
    600: 'seiscentos',
    700: 'setecentos',
    800: 'oitocentos',
    900: 'novecentos',
  }

  const normalized = written.toLowerCase().trim()
  const expected = numberWords[number] || ''

  return normalized === expected || number.toString() === normalized
}

/**
 * Valida prescrição completa
 * Retorna erros detalhados se houver violação de normas CFM
 */
export async function validatePrescriptionCFM(
  data: PrescriptionInput
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // 1. Validação de schema básico
  try {
    PrescriptionSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(
        ...error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      )
      return { valid: false, errors }
    }
  }

  // 2. Validação de médico (CRM deve existir no banco)
  if (process.env.NODE_ENV === 'production') {
    const doctorExists = await prisma.user.findFirst({
      where: {
        licenseNumber: data.doctor.crm,
        licenseState: data.doctor.state,
      },
    })

    if (!doctorExists) {
      errors.push(
        `Médico CRM-${data.doctor.state} ${data.doctor.crm} não encontrado no sistema`
      )
    }
  }

  // 3. Validação de medicamentos
  data.medications.forEach((med, index) => {
    const medNumber = index + 1

    // Verificar se é controlado
    const controlled = isControlledMedication(med.name)
    if (controlled.isControlled && !med.quantityWritten) {
      errors.push(
        `Medicamento ${medNumber} (${med.name}) é controlado (${controlled.category}). Quantidade OBRIGATORIAMENTE por extenso (ex: 30 (trinta))`
      )
    }

    // Se controlado e tem quantidade escrita, validar formato
    if (controlled.isControlled && med.quantityWritten) {
      if (!/^\d+\s*\(\w+\)$/.test(`${med.quantity} (${med.quantityWritten})`)) {
        errors.push(
          `Medicamento ${medNumber}: Formato de quantidade controlada inválido. Use: "30 (trinta)"`
        )
      }
    }

    // Verificar antimicrobiano
    const isMicro = isAntimicrobial(med.name)
    if (isMicro && !med.isAntimicrobial) {
      errors.push(`Medicamento ${medNumber} é antimicrobiano. Marque isAntimicrobial=true`)
    }

    // Validar posologia
    if (!/\b(cada|por)\s+(hora|6\s+horas|8\s+horas|12\s+horas)/.test(med.posology)) {
      errors.push(
        `Medicamento ${medNumber}: Posologia deve incluir intervalo (ex: "a cada 6 horas")`
      )
    }

    // Validar limite de doses
    if (!/não\s+excedendo|máximo|máx/i.test(med.posology)) {
      errors.push(
        `Medicamento ${medNumber}: Posologia deve indicar limite de doses (ex: "não excedendo 4 doses ao dia")`
      )
    }
  })

  // 4. Validação de regra de antimicrobianos (2 vias)
  const hasAntibiotics = data.medications.some((m) => m.isAntimicrobial)
  if (hasAntibiotics) {
    // Nota: A regra de 2 vias deve ser aplicada durante a geração, não aqui
    console.info(
      'ℹ️ Prescrição contém antimicrobiano. Sistema deve gerar 2 vias automaticamente.'
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Gera sugestões corretivas para erros comuns
 */
export function getPrescriptionCorrectionSuggestions(medicationName: string): {
  controlled?: 'A1' | 'A2' | 'A3' | 'B1' | 'B2'
  requiresQuantityWritten?: boolean
  isAntimicrobial?: boolean
  suggestedPosology?: string
} {
  const suggestions: ReturnType<typeof getPrescriptionCorrectionSuggestions> = {}

  const controlled = isControlledMedication(medicationName)
  if (controlled.isControlled) {
    suggestions.controlled = controlled.category
    suggestions.requiresQuantityWritten = true
  }

  if (isAntimicrobial(medicationName)) {
    suggestions.isAntimicrobial = true
    suggestions.suggestedPosology = '1 dose por via oral a cada 6-8 horas, não excedendo 4 doses ao dia'
  }

  return suggestions
}

/**
 * Formata a prescrição para exibição em HTML/PDF respeitando normas CFM
 */
export function formatPrescriptionForDisplay(data: PrescriptionInput): string {
  let html = `
    <div class="prescription-cfm">
      <header class="prescription-header">
        <h1>${data.doctor.name}</h1>
        <p>CRM-${data.doctor.state} ${data.doctor.crm}${data.doctor.rqe ? ` · RQE ${data.doctor.rqe}` : ''}</p>
        <p>${data.doctor.address}</p>
      </header>
      
      <section class="patient-section">
        <p><strong>Paciente:</strong> ${data.patient.name}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </section>
      
      <main class="medications-section">
  `

  data.medications.forEach((med, index) => {
    html += `
      <div class="medication-item">
        <p><strong>${index + 1}. ${med.name} ${med.concentration}</strong></p>
        <p>Quantidade: ${med.quantity} ${med.quantityUnit}${med.quantityWritten ? ` (${med.quantityWritten.toUpperCase()})` : ''}</p>
        <p>Posologia: ${med.posology}</p>
      </div>
    `
  })

  html += `
      </main>
      
      <footer class="prescription-footer">
        <div class="signature-area">
          <p>${data.doctor.name}</p>
          <p>CRM-${data.doctor.state} ${data.doctor.crm}</p>
        </div>
      </footer>
    </div>
  `

  return html
}
