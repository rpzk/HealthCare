'use client'

import { useState } from 'react'
import { Bot, MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Olá! Sou seu assistente médico com IA. Posso ajudar com diagnósticos, análise de sintomas, verificação de interações medicamentosas, sugestões de tratamento e muito mais. Como posso ajudá-lo hoje? 🩺',
      role: 'assistant',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    try {
      // Chamar a API real do Google AI
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          type: 'medical_consultation'
        }),
      })

      if (!response.ok) {
        throw new Error('Erro na API')
      }

      const data = await response.json()

      if (data.success) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: data.data.response || 'Desculpe, não consegui processar sua pergunta no momento.',
          role: 'assistant',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiResponse])
      } else {
        // Mostrar erro da API
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: `❌ **${data.error.message}**\n\n${data.error.details}\n\nPor favor, tente novamente em alguns minutos.`,
          role: 'assistant',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorResponse])
      }
    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      
      // Mostrar erro de conexão
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ **Serviço de IA Indisponível**\n\nO assistente médico está temporariamente fora do ar.\n\nTente novamente em alguns minutos ou entre em contato com o suporte técnico.`,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorResponse])
    }

    setIsLoading(false)
  }

  return (
    <>
      <Button
        variant="medical"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        <Bot className="h-4 w-4 mr-2" />
        Assistente IA
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-2xl h-[600px] m-4">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-medical-primary" />
                <span>Assistente Médico IA</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-medical-primary text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua pergunta médica..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                🤖 IA local (Ollama) • Pergunte sobre sintomas, diagnósticos, tratamentos ou interações medicamentosas
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
