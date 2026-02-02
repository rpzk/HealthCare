/**
 * Cliente unificado de IA - suporta Groq (cloud) e Ollama (local)
 * Por padrão usa Groq se API key estiver configurada, senão usa Ollama
 */

import axios from 'axios'
import { logger } from '@/lib/logger'

// Configurações
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'

// Determina qual provedor usar
const AI_PROVIDER = process.env.AI_PROVIDER || (GROQ_API_KEY ? 'groq' : 'ollama')

export type AIProvider = 'groq' | 'ollama'

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
}

export interface AICompletionResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Cliente unificado de IA
 */
class AIClient {
  private provider: AIProvider
  
  constructor() {
    this.provider = AI_PROVIDER as AIProvider
    logger.info({ provider: this.provider }, 'AI Client inicializado')
  }

  getProvider(): AIProvider {
    return this.provider
  }

  /**
   * Gera uma resposta de chat
   */
  async chat(options: AICompletionOptions): Promise<AICompletionResponse> {
    if (this.provider === 'groq') {
      return this.chatGroq(options)
    } else {
      return this.chatOllama(options)
    }
  }

  /**
   * Gera conteúdo a partir de um prompt simples
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: AIMessage[] = []
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.chat({ messages })
    return response.content
  }

  /**
   * Chat via Groq API
   */
  private async chatGroq(options: AICompletionOptions): Promise<AICompletionResponse> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada')
    }

    try {
      const response = await axios.post(
        `${GROQ_URL}/chat/completions`,
        {
          model: options.model || GROQ_MODEL,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens || 4096,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 segundos
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
        throw new Error('API key do Groq inválida')
      }
      if (error.response?.status === 429) {
        throw new Error('Limite de requisições do Groq atingido. Aguarde um momento.')
      }
      
      throw new Error('Serviço de IA temporariamente indisponível')
    }
  }

  /**
   * Chat via Ollama API
   */
  private async chatOllama(options: AICompletionOptions): Promise<AICompletionResponse> {
    try {
      const response = await axios.post(
        `${OLLAMA_URL}/api/chat`,
        {
          model: options.model || OLLAMA_MODEL,
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
          timeout: 120000 // 120 segundos (Ollama local pode ser mais lento)
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
      throw new Error('Serviço de IA local temporariamente indisponível')
    }
  }

  /**
   * Verifica se o serviço está disponível
   */
  async healthCheck(): Promise<{ ok: boolean; provider: AIProvider; model: string }> {
    try {
      if (this.provider === 'groq') {
        // Groq não tem endpoint de health, fazemos uma chamada mínima
        await axios.get(`${GROQ_URL}/models`, {
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
          timeout: 5000
        })
        return { ok: true, provider: 'groq', model: GROQ_MODEL }
      } else {
        await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 })
        return { ok: true, provider: 'ollama', model: OLLAMA_MODEL }
      }
    } catch {
      return { ok: false, provider: this.provider, model: this.provider === 'groq' ? GROQ_MODEL : OLLAMA_MODEL }
    }
  }
}

// Instância global
export const aiClient = new AIClient()

// Export para compatibilidade
export default aiClient
