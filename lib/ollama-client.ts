/**
 * Cliente Ollama - wrapper para compatibilidade com código existente
 * Internamente usa o ai-client unificado (Groq ou Ollama)
 */

import { aiClient, AIMessage } from './ai-client'
import { logger } from '@/lib/logger'

/**
 * Cliente para interagir com a API do Ollama/Groq
 * Mantém interface compatível com código existente
 */
export class OllamaClient {
  /**
   * Obtém um modelo generativo para uso
   * @param options Opções do modelo
   * @returns Um modelo generativo
   */
  getGenerativeModel(_options?: { model?: string }) {
    return new GenerativeModel()
  }
}

/**
 * Modelo generativo - interface compatível com Google AI
 */
class GenerativeModel {
  /**
   * Gera conteúdo a partir de um prompt de texto
   * @param prompt Prompt de texto para geração
   * @returns Resposta gerada
   */
  async generateContent(prompt: string | { text: string; role?: string }) {
    let text: string
    let systemPrompt: string | undefined

    if (typeof prompt === 'string') {
      text = prompt
    } else {
      text = prompt.text
      if (prompt.role === 'system') {
        systemPrompt = text
        text = ''
      }
    }

    try {
      const content = await aiClient.generate(text, systemPrompt)
      
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
      logger.error({ error }, 'Erro ao gerar conteúdo')
      throw new Error('Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.')
    }
  }

  /**
   * Inicia uma conversa com o modelo
   * @returns Um objeto de conversa
   */
  startChat(options?: { history?: Array<{ role: string; parts: Array<{ text: string }> }> }) {
    return new Chat(options?.history || [])
  }
}

/**
 * Implementação de chat
 */
class Chat {
  private history: AIMessage[]

  constructor(history: Array<{ role: string; parts: Array<{ text: string }> }> = []) {
    // Converter o histórico para o formato do ai-client
    this.history = history.map(msg => ({
      role: (msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'assistant') as AIMessage['role'],
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
      const response = await aiClient.chat({ messages: this.history })
      const assistantMessage = response.content
      
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
      logger.error({ error }, 'Erro ao chamar chat')
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

// Criar uma instância global do cliente
const ollamaClient = new OllamaClient()

export default ollamaClient
