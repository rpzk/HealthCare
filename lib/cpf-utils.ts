/**
 * Utilitários para validação e formatação de CPF
 */

/**
 * Formata CPF para padrão 000.000.000-00
 * @param value String bruta do CPF
 * @returns CPF formatado ou string vazia
 */
export function formatCPF(value: string): string {
  if (!value) return ''

  const cleaned = value.replace(/\D/g, '')

  if (cleaned.length === 0) return ''

  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

/**
 * Remove formatação do CPF
 * @param value CPF formatado
 * @returns CPF apenas com dígitos
 */
export function unformatCPF(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Valida CPF usando algoritmo de dígito verificador
 * @param cpf CPF formatado ou não
 * @returns true se válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = unformatCPF(cpf)

  // Deve ter exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false

  // Rejeita sequências iguais (000.000.000-00, 111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Calcula primeiro dígito verificador
  let sum = 0
  let remainder

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0

  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false

  // Calcula segundo dígito verificador
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0

  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false

  return true
}

/**
 * Máscara para input em tempo real
 * @param value Valor do input
 * @returns Valor com máscara aplicada
 */
export function maskCPF(value: string): string {
  return formatCPF(value)
}
