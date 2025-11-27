/**
 * Cliente Ollama para substituir o Google AI Studio
 * Implementa uma interface compatível para facilitar a migração
 */

import axios from 'axios'

// URL do serviço Ollama, configurável via variável de ambiente
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
// Modelo padrão a ser usado, configurável via variável de ambiente
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'

/**
 * Cliente para interagir com a API do Ollama
 */
export class OllamaClient {
  private baseUrl: string
  private defaultModel: string

  constructor(baseUrl = OLLAMA_URL, defaultModel = DEFAULT_MODEL) {
    // Forçar localhost se estiver usando 'ollama'
    this.baseUrl = baseUrl
    this.defaultModel = defaultModel
  }

  /**
   * Obtém um modelo generativo para uso
   * @param options Opções do modelo
   * @returns Um modelo generativo
   */
  getGenerativeModel(options: { model?: string }) {
    const modelName = options.model || this.defaultModel
    return new OllamaGenerativeModel(this.baseUrl, modelName)
  }
}

/**
 * Modelo generativo do Ollama
 * Implementa uma interface similar à do Google AI para facilitar migração
 */
class OllamaGenerativeModel {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl
    this.model = model
  }

  /**
   * Gera conteúdo a partir de um prompt de texto
   * @param prompt Prompt de texto para geração
   * @returns Resposta gerada
   */
  async generateContent(prompt: string | { text: string; role?: string }) {
    let text: string
    let system: string | undefined

    if (typeof prompt === 'string') {
      text = prompt
    } else {
      text = prompt.text
      system = prompt.role === 'system' ? text : undefined
      if (system) text = '' // Se for uma mensagem de sistema, o texto vai vazio
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: text,
        system: system,
        stream: false
      })

      const content = response.data.response || ''
      
      return {
        response: {
          text: () => content
        },
        candidates: [
          {
            content: {
              parts: [{ text: content }]
            }
          }
        ]
      }
    } catch (error) {
      console.error('Erro ao chamar Ollama:', error)
      
      // Retornar erro claro em vez de fallback
      throw new Error('Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.')
    }
  }

  /**
   * Inicia uma conversa com o modelo
   * @returns Um objeto de conversa
   */
  startChat(options?: { history?: Array<{ role: string; parts: Array<{ text: string }> }> }) {
    return new OllamaChat(this.baseUrl, this.model, options?.history || [])
  }
}

/**
 * Implementação de chat para o Ollama
 */
class OllamaChat {
  private baseUrl: string
  private model: string
  private history: Array<{ role: string; content: string }>

  constructor(baseUrl: string, model: string, history: Array<{ role: string; parts: Array<{ text: string }> }> = []) {
    this.baseUrl = baseUrl
    this.model = model
    
    // Converter o histórico para o formato do Ollama
    this.history = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts.map(part => part.text).join(' ')
    }))
  }

  /**
   * Envia uma mensagem para o chat
   * @param message Mensagem a ser enviada
   * @returns Resposta do chat
   */
  async sendMessage(message: string | { text: string }) {
    const text = typeof message === 'string' ? message : message.text
    
    // Adicionar a mensagem do usuário ao histórico
    this.history.push({
      role: 'user',
      content: text
    })

    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages: this.history,
        stream: false
      })

      const assistantMessage = response.data.message?.content || ''
      
      // Adicionar a resposta do assistente ao histórico
      this.history.push({
        role: 'assistant',
        content: assistantMessage
      })

      return {
        response: {
          text: () => assistantMessage
        },
        candidates: [
          {
            content: {
              parts: [{ text: assistantMessage }]
            }
          }
        ]
      }
    } catch (error) {
      console.error('Erro ao chamar chat do Ollama:', error)
      
      // Retornar erro claro em vez de fallback
      throw new Error('Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.')
    }
  }

  /**
   * Obtém o histórico da conversa
   * @returns Histórico da conversa
   */
  getHistory() {
    return this.history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }))
  }
}

// Criar uma instância global do cliente Ollama
const ollamaClient = new OllamaClient()

export default ollamaClient