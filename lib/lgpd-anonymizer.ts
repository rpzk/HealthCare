/**
 * LGPD Anonymizer - Anonimização de dados sensíveis para compliance com LGPD
 * 
 * Este módulo detecta e substitui dados pessoais sensíveis antes de enviar
 * para APIs de IA na nuvem, garantindo conformidade com a LGPD.
 * 
 * Dados anonimizados:
 * - Nomes de pessoas
 * - CPF
 * - RG
 * - Telefones
 * - E-mails
 * - Endereços
 * - Datas de nascimento
 * - Números de prontuário
 * - CNS (Cartão Nacional de Saúde)
 */

import { logger } from '@/lib/logger'

// Tipos de dados sensíveis
export type SensitiveDataType = 
  | 'NAME'
  | 'CPF'
  | 'RG'
  | 'PHONE'
  | 'EMAIL'
  | 'ADDRESS'
  | 'BIRTHDATE'
  | 'MEDICAL_RECORD'
  | 'CNS'
  | 'CRM'

interface ReplacementEntry {
  type: SensitiveDataType
  original: string
  replacement: string
}

interface AnonymizationResult {
  anonymizedText: string
  replacements: ReplacementEntry[]
  hadSensitiveData: boolean
}

// Contadores para gerar IDs únicos
const counters: Record<SensitiveDataType, number> = {
  NAME: 0,
  CPF: 0,
  RG: 0,
  PHONE: 0,
  EMAIL: 0,
  ADDRESS: 0,
  BIRTHDATE: 0,
  MEDICAL_RECORD: 0,
  CNS: 0,
  CRM: 0,
}

// Padrões regex para detectar dados sensíveis
const PATTERNS = {
  // CPF: 000.000.000-00 ou 00000000000
  CPF: /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/g,
  
  // RG: Diversos formatos estaduais
  RG: /\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?[\dXx]?\b/g,
  
  // Telefone: (00) 00000-0000, (00) 0000-0000, 00 00000-0000
  PHONE: /\b\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}\b/g,
  
  // E-mail
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Data de nascimento: DD/MM/AAAA, DD-MM-AAAA
  BIRTHDATE: /\b(?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:19|20)\d{2}\b/g,
  
  // CNS: 15 dígitos
  CNS: /\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
  
  // CRM: CRM/UF 000000 ou CRM-UF-000000
  CRM: /\bCRM[\/\-]?\s?[A-Z]{2}[\/\-\s]?\d{4,6}\b/gi,
  
  // Número de prontuário: Padrões comuns
  MEDICAL_RECORD: /\b(?:pront(?:uário)?|prontuario|registro|matr[íi]cula)[:\s]*#?\d{4,10}\b/gi,
}

// Lista de nomes próprios comuns para detectar (será expandida dinamicamente)
const COMMON_NAMES = new Set([
  // Nomes masculinos comuns
  'joão', 'josé', 'antonio', 'francisco', 'carlos', 'paulo', 'pedro', 'lucas',
  'marcos', 'luis', 'gabriel', 'rafael', 'daniel', 'marcelo', 'bruno', 'eduardo',
  'felipe', 'raimundo', 'rodrigo', 'manoel', 'manuel', 'fernando', 'fabio', 'marcio',
  'andre', 'gustavo', 'alan', 'alex', 'anderson', 'diego', 'thiago', 'tiago',
  'leandro', 'leonardo', 'sergio', 'roberto', 'ricardo', 'henrique', 'mateus', 'vitor',
  
  // Nomes femininos comuns
  'maria', 'ana', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda',
  'patricia', 'aline', 'sandra', 'camila', 'amanda', 'bruna', 'jessica', 'leticia',
  'julia', 'luciana', 'vanessa', 'mariana', 'gabriela', 'rafaela', 'daniela', 'carolina',
  'beatriz', 'larissa', 'natalia', 'renata', 'paula', 'simone', 'rosa', 'lucia',
  'claudia', 'vera', 'silvia', 'helena', 'elizabete', 'elisabete', 'cristina', 'tereza',
  
  // Sobrenomes comuns
  'silva', 'santos', 'oliveira', 'souza', 'sousa', 'rodrigues', 'ferreira', 'alves',
  'pereira', 'lima', 'gomes', 'costa', 'ribeiro', 'martins', 'carvalho', 'almeida',
  'lopes', 'araujo', 'araújo', 'nascimento', 'fernandes', 'vieira', 'monteiro', 'moura',
  'barbosa', 'rocha', 'cardoso', 'dias', 'nunes', 'mendes', 'freitas', 'pinto',
])

// Nomes de ruas, bairros e cidades comuns
const ADDRESS_INDICATORS = [
  'rua', 'avenida', 'av.', 'av', 'alameda', 'travessa', 'praça', 'largo',
  'estrada', 'rodovia', 'br-', 'quadra', 'qd', 'lote', 'lt', 'bloco', 'bl',
  'apartamento', 'apt', 'apto', 'casa', 'nº', 'numero', 'número',
  'bairro', 'setor', 'jardim', 'jd', 'parque', 'vila', 'conjunto', 'conj',
  'cep', 'cep:', 'CEP'
]

/**
 * Classe principal de anonimização
 */
export class LGPDAnonymizer {
  private replacements: Map<string, ReplacementEntry> = new Map()
  private reverseMap: Map<string, string> = new Map()
  
  constructor() {
    // Reset counters for each instance
    Object.keys(counters).forEach(key => {
      counters[key as SensitiveDataType] = 0
    })
  }

  /**
   * Anonimiza um texto substituindo dados sensíveis
   */
  anonymize(text: string): AnonymizationResult {
    let anonymizedText = text
    const allReplacements: ReplacementEntry[] = []

    // 1. Substituir CPFs
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.CPF, 'CPF', allReplacements)

    // 2. Substituir CNS
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.CNS, 'CNS', allReplacements)

    // 3. Substituir CRM
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.CRM, 'CRM', allReplacements)

    // 4. Substituir telefones
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.PHONE, 'PHONE', allReplacements)

    // 5. Substituir e-mails
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.EMAIL, 'EMAIL', allReplacements)

    // 6. Substituir datas de nascimento
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.BIRTHDATE, 'BIRTHDATE', allReplacements)

    // 7. Substituir prontuários
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.MEDICAL_RECORD, 'MEDICAL_RECORD', allReplacements)

    // 8. Substituir RGs (cuidado para não pegar números já substituídos)
    anonymizedText = this.replacePattern(anonymizedText, PATTERNS.RG, 'RG', allReplacements)

    // 9. Substituir endereços (mais complexo)
    anonymizedText = this.replaceAddresses(anonymizedText, allReplacements)

    // 10. Substituir nomes próprios (última etapa para não confundir com outros padrões)
    anonymizedText = this.replaceNames(anonymizedText, allReplacements)

    return {
      anonymizedText,
      replacements: allReplacements,
      hadSensitiveData: allReplacements.length > 0
    }
  }

  /**
   * Restaura os dados originais a partir do texto anonimizado
   */
  deanonymize(anonymizedText: string, replacements: ReplacementEntry[]): string {
    let restoredText = anonymizedText
    
    // Restaurar na ordem reversa para evitar conflitos
    for (const entry of [...replacements].reverse()) {
      restoredText = restoredText.replace(entry.replacement, entry.original)
    }
    
    return restoredText
  }

  /**
   * Substitui padrões usando regex
   */
  private replacePattern(
    text: string, 
    pattern: RegExp, 
    type: SensitiveDataType,
    allReplacements: ReplacementEntry[]
  ): string {
    const matches = text.match(pattern)
    if (!matches) return text

    let result = text
    const uniqueMatches = [...new Set(matches)]

    for (const match of uniqueMatches) {
      // Verificar se já foi substituído
      if (this.replacements.has(match)) {
        const existing = this.replacements.get(match)!
        result = result.split(match).join(existing.replacement)
        continue
      }

      // Criar novo placeholder
      counters[type]++
      const replacement = `[${type}_${counters[type]}]`
      
      const entry: ReplacementEntry = {
        type,
        original: match,
        replacement
      }

      this.replacements.set(match, entry)
      this.reverseMap.set(replacement, match)
      allReplacements.push(entry)

      result = result.split(match).join(replacement)
    }

    return result
  }

  /**
   * Substitui endereços detectados no texto
   */
  private replaceAddresses(text: string, allReplacements: ReplacementEntry[]): string {
    let result = text
    
    // Padrão para endereços completos
    const addressPatterns = [
      // Rua/Av Nome, número - Bairro
      /\b(?:rua|avenida|av\.?|alameda|travessa|praça|estrada|rodovia)\s+[^,\n]{3,50},?\s*(?:n[°ºo]?\.?\s*)?\d{1,5}[^,\n]{0,30}(?:,\s*[^,\n]{3,30})?/gi,
      // CEP
      /\b(?:cep:?\s*)?\d{5}[-.\s]?\d{3}\b/gi,
    ]

    for (const pattern of addressPatterns) {
      const matches = result.match(pattern)
      if (!matches) continue

      for (const match of [...new Set(matches)]) {
        if (this.replacements.has(match)) {
          const existing = this.replacements.get(match)!
          result = result.split(match).join(existing.replacement)
          continue
        }

        counters.ADDRESS++
        const replacement = `[ENDERECO_${counters.ADDRESS}]`
        
        const entry: ReplacementEntry = {
          type: 'ADDRESS',
          original: match,
          replacement
        }

        this.replacements.set(match, entry)
        this.reverseMap.set(replacement, match)
        allReplacements.push(entry)

        result = result.split(match).join(replacement)
      }
    }

    return result
  }

  /**
   * Substitui nomes próprios detectados no texto
   */
  private replaceNames(text: string, allReplacements: ReplacementEntry[]): string {
    let result = text
    
    // Padrão para nomes completos (2-5 palavras capitalizadas seguidas)
    const namePattern = /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç]+){1,4})\b/g
    
    const matches = result.match(namePattern)
    if (!matches) return result

    for (const match of [...new Set(matches)]) {
      // Verificar se parece ser um nome (contém nomes comuns)
      const words = match.toLowerCase().split(/\s+/)
      const hasCommonName = words.some(word => 
        COMMON_NAMES.has(word.replace(/[áàâã]/g, 'a')
          .replace(/[éèê]/g, 'e')
          .replace(/[íï]/g, 'i')
          .replace(/[óôõö]/g, 'o')
          .replace(/[úü]/g, 'u')
          .replace(/ç/g, 'c'))
      )
      
      // Também considerar nomes que começam com indicadores de nome completo
      const looksLikeName = words.length >= 2 && words.length <= 5
      
      if (!hasCommonName && !looksLikeName) continue
      
      // Ignorar se já foi substituído ou se é muito curto
      if (this.replacements.has(match) || match.length < 5) {
        if (this.replacements.has(match)) {
          const existing = this.replacements.get(match)!
          result = result.split(match).join(existing.replacement)
        }
        continue
      }

      counters.NAME++
      const replacement = `[PACIENTE_${counters.NAME}]`
      
      const entry: ReplacementEntry = {
        type: 'NAME',
        original: match,
        replacement
      }

      this.replacements.set(match, entry)
      this.reverseMap.set(replacement, match)
      allReplacements.push(entry)

      result = result.split(match).join(replacement)
    }

    return result
  }

  /**
   * Adiciona nomes específicos para serem anonimizados
   * Útil quando sabemos o nome do paciente de antemão
   */
  addKnownName(name: string): void {
    if (!name || name.length < 2) return
    
    const normalized = name.toLowerCase()
      .replace(/[áàâã]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íï]/g, 'i')
      .replace(/[óôõö]/g, 'o')
      .replace(/[úü]/g, 'u')
      .replace(/ç/g, 'c')
    
    // Adicionar nome completo e partes
    const parts = normalized.split(/\s+/)
    parts.forEach(part => {
      if (part.length >= 3) {
        COMMON_NAMES.add(part)
      }
    })
  }

  /**
   * Retorna estatísticas da anonimização
   */
  getStats(): Record<SensitiveDataType, number> {
    const stats: Record<SensitiveDataType, number> = {
      NAME: 0,
      CPF: 0,
      RG: 0,
      PHONE: 0,
      EMAIL: 0,
      ADDRESS: 0,
      BIRTHDATE: 0,
      MEDICAL_RECORD: 0,
      CNS: 0,
      CRM: 0,
    }

    for (const entry of this.replacements.values()) {
      stats[entry.type]++
    }

    return stats
  }
}

/**
 * Função utilitária para anonimizar texto de forma simples
 */
export function anonymizeText(text: string, knownNames?: string[]): AnonymizationResult {
  const anonymizer = new LGPDAnonymizer()
  
  // Adicionar nomes conhecidos
  if (knownNames) {
    knownNames.forEach(name => anonymizer.addKnownName(name))
  }
  
  return anonymizer.anonymize(text)
}

/**
 * Função utilitária para restaurar texto anonimizado
 */
export function deanonymizeText(anonymizedText: string, replacements: ReplacementEntry[]): string {
  const anonymizer = new LGPDAnonymizer()
  return anonymizer.deanonymize(anonymizedText, replacements)
}

/**
 * Verifica se um texto contém dados sensíveis
 */
export function hasSensitiveData(text: string): boolean {
  const patterns = Object.values(PATTERNS)
  return patterns.some(pattern => {
    pattern.lastIndex = 0 // Reset regex state
    return pattern.test(text)
  })
}

// Exportar tipos
export type { ReplacementEntry, AnonymizationResult }
