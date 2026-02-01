'use client'

/**
 * Voice Assistant UI Component
 * 
 * Interface para assistente de voz em teleconsultas
 * Usa Web Speech API (browser-only)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  HelpCircle, 
  X,
  Check,
  AlertCircle,
  Command
} from 'lucide-react'
import { 
  VOICE_COMMANDS, 
  parseVoiceCommand, 
  speakText, 
  checkVoiceSupport,
  VOICE_RESPONSES,
  type VoiceCommand,
  type ParsedCommand
} from '@/lib/voice-assistant-service'

interface TranscriptionResult {
  text: string
  isFinal: boolean
  confidence: number
}

interface VoiceAssistantPanelProps {
  onCommand: (action: string, params?: Record<string, string>) => void
  onTranscription?: (result: TranscriptionResult) => void
  position?: 'bottom-left' | 'bottom-right' | 'top-right'
  minimal?: boolean
}

export function VoiceAssistantPanel({
  onCommand,
  onTranscription,
  position = 'bottom-right',
  minimal = false
}: VoiceAssistantPanelProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastTranscription, setLastTranscription] = useState<TranscriptionResult | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<VoiceCommand | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptionResult[]>([])
  
  const recognitionRef = useRef<any>(null)

  // Check browser support on mount
  useEffect(() => {
    const support = checkVoiceSupport()
    setIsSupported(support.recognition)
    
    if (support.recognition) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'pt-BR'
      
      recognitionRef.current.onresult = (event: any) => {
        const last = event.results[event.results.length - 1]
        const transcript = last[0].transcript
        const isFinal = last.isFinal
        const confidence = last[0].confidence
        
        const result: TranscriptionResult = { text: transcript, isFinal, confidence }
        setLastTranscription(result)
        
        if (isFinal) {
          setTranscriptHistory(prev => [...prev.slice(-9), result])
          onTranscription?.(result)
          
          // Try to parse as command
          const parsed = parseVoiceCommand(transcript)
          if (parsed.command) {
            if (parsed.command.requiresConfirmation) {
              setPendingConfirmation(parsed.command)
              speakText(VOICE_RESPONSES.confirmAction(parsed.command.description))
            } else {
              onCommand(parsed.command.action, parsed.params)
            }
          }
        }
      }
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start()
        }
      }
    }
    
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
      setIsListening(true)
      speakText(VOICE_RESPONSES.listening)
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  const confirmCommand = useCallback(() => {
    if (pendingConfirmation) {
      onCommand(pendingConfirmation.action)
      speakText(VOICE_RESPONSES.actionConfirmed)
      setPendingConfirmation(null)
    }
  }, [pendingConfirmation, onCommand])

  const cancelCommand = useCallback(() => {
    speakText(VOICE_RESPONSES.actionCancelled)
    setPendingConfirmation(null)
  }, [])

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-right': 'top-20 right-4'
  }

  if (!isSupported) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Comandos de voz não suportados
        </div>
      </div>
    )
  }

  if (minimal) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          title={isListening ? 'Parar de ouvir' : 'Ativar comandos de voz'}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-80`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Assistente de Voz</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Ajuda"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
              Comandos disponíveis:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {VOICE_COMMANDS.map((cmd: VoiceCommand, i: number) => (
                <div key={i} className="text-xs text-blue-600 dark:text-blue-400">
                  • {cmd.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {pendingConfirmation && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              Confirma: <strong>{pendingConfirmation.description}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmCommand}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm flex items-center justify-center gap-1"
              >
                <Check className="h-4 w-4" /> Sim
              </button>
              <button
                onClick={cancelCommand}
                className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm flex items-center justify-center gap-1"
              >
                <X className="h-4 w-4" /> Não
              </button>
            </div>
          </div>
        )}

        {/* Transcription Display */}
        <div className="p-3 min-h-[80px] max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {lastTranscription ? (
            <p className={`text-sm ${lastTranscription.isFinal ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic'}`}>
              {lastTranscription.text}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {isListening ? 'Ouvindo...' : 'Clique no microfone para começar'}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Ouvindo
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => speakText('Teste de áudio')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Testar áudio"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={isListening ? 'Parar' : 'Ouvir'}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistantPanel
