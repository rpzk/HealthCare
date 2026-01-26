/**
 * Renderizador de templates de documentos
 * Processa placeholders e gera HTML final
 */

import { TEMPLATE_VARIABLES } from './variables'

export interface TemplateDataContext {
  clinic: {
    name?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    phone?: string
    logoUrl?: string
    headerUrl?: string
    footerText?: string
  }
  doctor: {
    name?: string
    speciality?: string
    crmNumber?: string
    licenseType?: string
    licenseState?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    logoUrl?: string
  }
  patient?: {
    name?: string
    email?: string
    phone?: string
    cpf?: string
    birthDate?: Date | string
    gender?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
  document: {
    date?: Date | string
    time?: string
    number?: string
    type?: string
    qrcodeUrl?: string
  }
  signature?: {
    date?: Date | string
  }
  // Variáveis customizadas por tipo de documento
  [key: string]: any
}

/**
 * Classe para renderizar templates com contexto de dados
 */
export class TemplateRenderer {
  private context: TemplateDataContext
  private template: string

  constructor(template: string, context: TemplateDataContext) {
    this.template = template
    this.context = context
  }

  /**
   * Renderizar template com dados do contexto
   */
  render(): string {
    let html = this.template

    // Substituir todas as variáveis
    html = this.replaceClinicVariables(html)
    html = this.replaceDoctorVariables(html)
    html = this.replacePatientVariables(html)
    html = this.replaceDocumentVariables(html)
    html = this.replaceSignatureVariables(html)
    html = this.replaceCustomVariables(html)

    return html
  }

  /**
   * Substituir variáveis de clínica
   */
  private replaceClinicVariables(html: string): string {
    const clinic = this.context.clinic

    const replacements: Record<string, any> = {
      'clinic.name': clinic.name || '',
      'clinic.address': clinic.address || '',
      'clinic.city': clinic.city || '',
      'clinic.state': clinic.state || '',
      'clinic.zipCode': clinic.zipCode || '',
      'clinic.phone': clinic.phone || '',
      'clinic.logo': clinic.logoUrl
        ? `<img src="${clinic.logoUrl}" class="clinic-logo" alt="Logo da Clínica">`
        : '',
      'clinic.header': clinic.headerUrl
        ? `<img src="${clinic.headerUrl}" class="clinic-header" alt="Header da Clínica">`
        : '',
      'clinic.footer': clinic.footerText || '',
    }

    return this.replaceVariables(html, replacements)
  }

  /**
   * Substituir variáveis de médico
   */
  private replaceDoctorVariables(html: string): string {
    const doctor = this.context.doctor

    const replacements: Record<string, any> = {
      'doctor.name': doctor.name || '',
      'doctor.speciality': doctor.speciality || '',
      'doctor.crmNumber': doctor.crmNumber || '',
      'doctor.licenseType': doctor.licenseType || '',
      'doctor.licenseState': doctor.licenseState || '',
      'doctor.phone': doctor.phone || '',
      'doctor.email': doctor.email || '',
      'doctor.address': doctor.address || '',
      'doctor.city': doctor.city || '',
      'doctor.state': doctor.state || '',
      'doctor.zipCode': doctor.zipCode || '',
      'doctor.logo': doctor.logoUrl
        ? `<img src="${doctor.logoUrl}" class="doctor-logo" alt="Logo do Médico">`
        : '',
    }

    return this.replaceVariables(html, replacements)
  }

  /**
   * Substituir variáveis de paciente
   */
  private replacePatientVariables(html: string): string {
    const patient = this.context.patient

    if (!patient) return html

    const replacements: Record<string, any> = {
      'patient.name': patient.name || '',
      'patient.email': patient.email || '',
      'patient.phone': patient.phone || '',
      'patient.cpf': patient.cpf || '',
      'patient.birthDate': patient.birthDate ? this.formatDate(patient.birthDate) : '',
      'patient.age': patient.birthDate
        ? this.calculateAge(patient.birthDate)
        : '',
      'patient.gender': patient.gender || '',
      'patient.address': patient.address || '',
      'patient.city': patient.city || '',
      'patient.state': patient.state || '',
      'patient.zipCode': patient.zipCode || '',
    }

    return this.replaceVariables(html, replacements)
  }

  /**
   * Substituir variáveis de documento
   */
  private replaceDocumentVariables(html: string): string {
    const doc = this.context.document
    const now = new Date()

    const replacements: Record<string, any> = {
      'document.date': this.formatDate(doc.date || now),
      'document.datetime': this.formatDateTime(doc.date || now),
      'document.time': this.formatTime(doc.time || now),
      'document.number': doc.number || '',
      'document.type': doc.type || '',
      'document.qrcode': doc.qrcodeUrl
        ? `<img src="${doc.qrcodeUrl}" class="document-qrcode" alt="QR Code">`
        : '',
    }

    return this.replaceVariables(html, replacements)
  }

  /**
   * Substituir variáveis de assinatura
   */
  private replaceSignatureVariables(html: string): string {
    const signature = this.context.signature
    const now = new Date()

    const replacements: Record<string, any> = {
      'signature.line': '<div class="signature-line">_______________________</div>',
      'signature.digital':
        '<div class="signature-digital">✓ Assinatura registrada</div>',
      'signature.date': this.formatDate(signature?.date || now),
    }

    return this.replaceVariables(html, replacements)
  }

  /**
   * Substituir variáveis customizadas (específicas por tipo de documento)
   */
  private replaceCustomVariables(html: string): string {
    const regex = /\{\{([\w.]+)\}\}/g
    let result = html

    result = result.replace(regex, (match, variable) => {
      const parts = variable.split('.')
      let value = this.context as any

      for (const part of parts) {
        value = value?.[part]
      }

      if (value === undefined || value === null) {
        return match // Manter placeholder se não encontrar
      }

      // Se for data, formatar
      if (value instanceof Date) {
        return this.formatDate(value)
      }

      return String(value)
    })

    return result
  }

  /**
   * Substituir múltiplas variáveis
   */
  private replaceVariables(
    html: string,
    replacements: Record<string, any>
  ): string {
    let result = html

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(regex, String(value))
    }

    return result
  }

  /**
   * Formatar data (DD/MM/YYYY)
   */
  private formatDate(date: Date | string): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date

      if (isNaN(d.getTime())) {
        return ''
      }

      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()

      return `${day}/${month}/${year}`
    } catch {
      return ''
    }
  }

  /**
   * Formatar data e hora (DD/MM/YYYY HH:MM)
   */
  private formatDateTime(date: Date | string): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date

      if (isNaN(d.getTime())) {
        return ''
      }

      const dateStr = this.formatDate(d)
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')

      return `${dateStr} ${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  /**
   * Formatar hora (HH:MM)
   */
  private formatTime(date: Date | string): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date

      if (isNaN(d.getTime())) {
        return ''
      }

      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')

      return `${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  /**
   * Calcular idade
   */
  private calculateAge(birthDate: Date | string): number {
    try {
      const birth =
        typeof birthDate === 'string' ? new Date(birthDate) : birthDate
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()

      const monthDiff = today.getMonth() - birth.getMonth()
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--
      }

      return age
    } catch {
      return 0
    }
  }
}

/**
 * Renderizar template simples (função helper)
 */
export function renderTemplate(
  template: string,
  context: TemplateDataContext
): string {
  const renderer = new TemplateRenderer(template, context)
  return renderer.render()
}

/**
 * Validar se contexto tem dados mínimos necessários
 */
export function validateContext(
  context: TemplateDataContext
): {
  valid: boolean
  missing: string[]
} {
  const required = ['clinic', 'doctor', 'document']
  const missing: string[] = []

  for (const field of required) {
    if (!context[field as keyof TemplateDataContext]) {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
