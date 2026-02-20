/**
 * Cliente unificado de IA - suporta Groq (cloud) e Ollama (local)
 * 
 * Features:
 * - Configurações do banco de dados (SystemSettings)
 * - Anonimização LGPD automática para provedores cloud
 * - Fallback para variáveis de ambiente
 * - Suporte a múltiplos provedores
 */

import axios from 'axios'
import { logger } from '@/lib/logger'
import { LGPDAnonymizer, type ReplacementEntry } from '@/lib/lgpd-anonymizer'
import { SystemSettingsService } from '@/lib/system-settings-service'

// Configurações default (fallback para .env)
const DEFAULT_GROQ_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_OLLAMA_URL = 'http://ollama:11434'
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b'

export type AIProvider = 'groq' | 'ollama' | 'openai'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  messages: AIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  /** Nomes conhecidos do paciente para melhorar anonimização */
  knownNames?: string[]
  /** Se deve pular anonimização (default: false para cloud, true para local) */
  skipAnonymization?: boolean
}

export interface AICompletionResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  /** Se a resposta foi deanonimizada */
  wasAnonymized?: boolean
  /** Estatísticas de anonimização */
  anonymizationStats?: Record<string, number>
}

// Cache de configurações
let configCache: {
  provider: AIProvider
  groqApiKey: string | null
  groqModel: string
  ollamaUrl: string
  ollamaModel: string
  enableAnonymization: boolean
  lastFetch: number
} | null = null

const CONFIG_CACHE_TTL = 60000 // 1 minuto

/**
 * Busca configurações de IA do banco de dados ou env
 */
export async function getAIConfig() {
  // Usar cache se válido
  if (configCache && Date.now() - configCache.lastFetch < CONFIG_CACHE_TTL) {
    return configCache
  }

  try {
    // Tentar buscar do banco de dados
    const [
      dbProvider,
      dbGroqApiKey,
      dbGroqModel,
      dbOllamaUrl,
      dbOllamaModel,
      dbEnableAnonymization
    ] = await Promise.all([
      SystemSettingsService.get('AI_PROVIDER'),
      SystemSettingsService.get('GROQ_API_KEY'),
      SystemSettingsService.get('GROQ_MODEL'),
      SystemSettingsService.get('OLLAMA_URL'),
      SystemSettingsService.get('OLLAMA_MODEL'),
      SystemSettingsService.get('AI_ENABLE_ANONYMIZATION')
    ])

    // Merge com variáveis de ambiente (env tem prioridade se DB não tiver)
    const groqApiKey = dbGroqApiKey || process.env.GROQ_API_KEY || null
    const provider = (dbProvider || process.env.AI_PROVIDER || (groqApiKey ? 'groq' : 'ollama')) as AIProvider

    configCache = {
      provider,
      groqApiKey,
      groqModel: dbGroqModel || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      ollamaUrl: dbOllamaUrl || process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL,
      ollamaModel: dbOllamaModel || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
      enableAnonymization: dbEnableAnonymization !== 'false', // Default: true
      lastFetch: Date.now()
    }

    return configCache
  } catch (error) {
    // Fallback para variáveis de ambiente se banco não disponível
    logger.warn({ error }, 'Erro ao buscar config de IA do banco, usando env')
    
    const groqApiKey = process.env.GROQ_API_KEY || null
    
    configCache = {
      provider: (process.env.AI_PROVIDER || (groqApiKey ? 'groq' : 'ollama')) as AIProvider,
      groqApiKey,
      groqModel: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      ollamaUrl: process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL,
      ollamaModel: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
      enableAnonymization: process.env.AI_ENABLE_ANONYMIZATION !== 'false',
      lastFetch: Date.now()
    }

    return configCache
  }
}

/**
 * Limpa o cache de configurações (útil após atualizar settings)
 */
export function clearAIConfigCache(): void {
  configCache = null
}

/**
 * Cliente unificado de IA com anonimização LGPD
 */
class AIClient {
  /**
   * Retorna o provedor atual
   */
  async getProvider(): Promise<AIProvider> {
    const config = await getAIConfig()
    return config.provider
  }

  /**
   * Verifica se está usando provedor cloud (requer anonimização)
   */
  async isCloudProvider(): Promise<boolean> {
    const config = await getAIConfig()
    return config.provider !== 'ollama'
  }

  /**
   * Gera uma resposta de chat com anonimização LGPD automática
   */
  async chat(options: AICompletionOptions): Promise<AICompletionResponse> {
    const config = await getAIConfig()
    const isCloud = config.provider !== 'ollama'
    const shouldAnonymize = isCloud && config.enableAnonymization && !options.skipAnonymization

    let processedMessages = options.messages
    let anonymizer: LGPDAnonymizer | null = null
    let replacements: ReplacementEntry[] = []

    // Anonimizar dados sensíveis se usando provedor cloud
    if (shouldAnonymize) {
      anonymizer = new LGPDAnonymizer()
      
      // Adicionar nomes conhecidos
      if (options.knownNames) {
        options.knownNames.forEach(name => anonymizer!.addKnownName(name))
      }

      // Anonimizar cada mensagem
      processedMessages = options.messages.map(msg => {
        const result = anonymizer!.anonymize(msg.content)
        replacements.push(...result.replacements)
        return {
          ...msg,
          content: result.anonymizedText
        }
      })

      if (replacements.length > 0) {
        logger.info({ 
          stats: anonymizer.getStats(),
          provider: config.provider 
        }, 'Dados anonimizados antes de enviar para IA cloud')
      }
    }

    // Chamar o provedor apropriado
    let response: AICompletionResponse
    
    if (config.provider === 'groq') {
      response = await this.chatGroq(config, { ...options, messages: processedMessages })
    } else if (config.provider === 'openai') {
      response = await this.chatOpenAI(config, { ...options, messages: processedMessages })
    } else {
      response = await this.chatOllama(config, { ...options, messages: processedMessages })
    }

    // Deanonimizar a resposta se necessário
    if (shouldAnonymize && replacements.length > 0 && anonymizer) {
      const originalContent = anonymizer.deanonymize(response.content, replacements)
      
      return {
        ...response,
        content: originalContent,
        wasAnonymized: true,
        anonymizationStats: anonymizer.getStats()
      }
    }

    return response
  }

  /**
   * Gera conteúdo a partir de um prompt simples
   */
  async generate(prompt: string, systemPrompt?: string, knownNames?: string[]): Promise<string> {
    const messages: AIMessage[] = []
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.chat({ messages, knownNames })
    return response.content
  }

  /**
   * Chat via Groq API
   */
  private async chatGroq(
    config: NonNullable<typeof configCache>, 
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY não configurada. Configure em Configurações > IA.')
    }

    try {
      const response = await axios.post(
        `${DEFAULT_GROQ_URL}/chat/completions`,
        {
          model: options.model || config.groqModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      const data = response.data
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage
      }
    } catch (error: any) {
      logger.error({ error: error.message, provider: 'groq' }, 'Erro ao chamar Groq API')
      
      if (error.response?.status === 401) {
        throw new Error('API key do Groq inválida. Verifique a configuração.')
      }
      if (error.response?.status === 429) {
        throw new Error('Limite de requisições do Groq atingido. Aguarde um momento.')
      }
      
      throw new Error('Serviço de IA temporariamente indisponível')
    }
  }

  /**
   * Chat via OpenAI API (para futura expansão)
   */
  private async chatOpenAI(
    config: NonNullable<typeof configCache>,
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    // TODO: Implementar quando necessário
    throw new Error('Provedor OpenAI não implementado ainda')
  }

  /**
   * Chat via Ollama API (local, sem anonimização necessária)
   */
  private async chatOllama(
    config: NonNullable<typeof configCache>,
    options: AICompletionOptions
  ): Promise<AICompletionResponse> {
    try {
      const response = await axios.post(
        `${config.ollamaUrl}/api/chat`,
        {
          model: options.model || config.ollamaModel,
          messages: options.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.max_tokens || 4096
          }
        },
        {
          timeout: 120000
        }
      )

      const data = response.data
      return {
        content: data.message?.content || '',
        model: data.model,
        usage: data.eval_count ? {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        } : undefined
      }
    } catch (error: any) {
      logger.error({ error: error.message, provider: 'ollama' }, 'Erro ao chamar Ollama')
      throw new Error('Serviço de IA local indisponível. Verifique se o Ollama está rodando.')
    }
  }

  /**
   * Verifica se o serviço está disponível
   */
  async healthCheck(): Promise<{ ok: boolean; provider: AIProvider; model: string; anonymizationEnabled: boolean }> {
    const config = await getAIConfig()
    
    try {
      if (config.provider === 'groq') {
        await axios.get(`${DEFAULT_GROQ_URL}/models`, {
          headers: { 'Authorization': `Bearer ${config.groqApiKey}` },
          timeout: 5000
        })
        return { 
          ok: true, 
          provider: 'groq', 
          model: config.groqModel,
          anonymizationEnabled: config.enableAnonymization
        }
      } else {
        await axios.get(`${config.ollamaUrl}/api/tags`, { timeout: 5000 })
        return { 
          ok: true, 
          provider: 'ollama', 
          model: config.ollamaModel,
          anonymizationEnabled: false // Local não precisa
        }
      }
    } catch {
      return { 
        ok: false, 
        provider: config.provider, 
        model: config.provider === 'groq' ? config.groqModel : config.ollamaModel,
        anonymizationEnabled: config.enableAnonymization
      }
    }
  }

  /**
   * Retorna informações sobre a configuração atual
   */
  async getInfo(): Promise<{
    provider: AIProvider
    model: string
    isCloud: boolean
    anonymizationEnabled: boolean
  }> {
    const config = await getAIConfig()
    return {
      provider: config.provider,
      model: config.provider === 'groq' ? config.groqModel : config.ollamaModel,
      isCloud: config.provider !== 'ollama',
      anonymizationEnabled: config.enableAnonymization
    }
  }
}

// Instância global
export const aiClient = new AIClient()

// Export para compatibilidade
export default aiClient
