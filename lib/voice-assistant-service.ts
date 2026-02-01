/**
 * Voice Assistant Service
 * 
 * Comandos de voz para telemedicina - executa no browser apenas
 * Este arquivo fornece types e helpers para o cliente
 */

// Voice command types
export interface VoiceCommand {
  name: string
  patterns: RegExp[]
  description: string
  action: string
  requiresConfirmation?: boolean
}

export interface ParsedCommand {
  command: VoiceCommand | null
  confidence: number
  rawText: string
  params?: Record<string, string>
}

export interface CommandResult {
  success: boolean
  action: string
  message: string
  data?: any
}

// Available commands registry
export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    name: 'toggle_video',
    patterns: [
      /\b(ligar|desligar|ativar|desativar)\s*(o\s*)?(meu\s*)?(vídeo|video|câmera|camera)\b/i,
      /\b(vídeo|video)\s*(on|off|liga|desliga)\b/i
    ],
    description: 'Ligar/desligar câmera',
    action: 'TOGGLE_VIDEO',
    requiresConfirmation: false
  },
  {
    name: 'toggle_microphone',
    patterns: [
      /\b(ligar|desligar|ativar|desativar|mutar|desmutar)\s*(o\s*)?(meu\s*)?(microfone|mic|áudio|audio)\b/i,
      /\b(microfone|mic)\s*(on|off|liga|desliga)\b/i
    ],
    description: 'Ligar/desligar microfone',
    action: 'TOGGLE_MIC',
    requiresConfirmation: false
  },
  {
    name: 'start_recording',
    patterns: [
      /\b(iniciar|começar|start)\s*(a\s*)?(gravação|gravar|recording)\b/i,
      /\bgravar\s*(consulta|sessão|tudo)?\b/i
    ],
    description: 'Iniciar gravação',
    action: 'START_RECORDING',
    requiresConfirmation: true
  },
  {
    name: 'stop_recording',
    patterns: [
      /\b(parar|encerrar|stop)\s*(a\s*)?(gravação|gravar|recording)\b/i,
      /\bfinalizar\s*gravação\b/i
    ],
    description: 'Parar gravação',
    action: 'STOP_RECORDING',
    requiresConfirmation: false
  },
  {
    name: 'end_consultation',
    patterns: [
      /\b(encerrar|finalizar|terminar)\s*(a\s*)?(consulta|sessão|chamada)\b/i,
      /\bdesligar\s*(a\s*)?(chamada|ligação)\b/i
    ],
    description: 'Encerrar consulta',
    action: 'END_CONSULTATION',
    requiresConfirmation: true
  },
  {
    name: 'share_screen',
    patterns: [
      /\b(compartilhar|mostrar)\s*(minha\s*)?(tela|screen)\b/i,
      /\bscreen\s*share\b/i
    ],
    description: 'Compartilhar tela',
    action: 'SHARE_SCREEN',
    requiresConfirmation: false
  },
  {
    name: 'stop_screen_share',
    patterns: [
      /\b(parar|encerrar)\s*(de\s*)?(compartilhar|mostrar)\s*(tela)?\b/i,
      /\bstop\s*shar(e|ing)\b/i
    ],
    description: 'Parar compartilhamento',
    action: 'STOP_SHARE',
    requiresConfirmation: false
  },
  {
    name: 'take_note',
    patterns: [
      /\b(anotar|nota|anotação)\s*:?\s*(.+)/i,
      /\bescrever?\s*:?\s*(.+)/i
    ],
    description: 'Fazer anotação',
    action: 'TAKE_NOTE',
    requiresConfirmation: false
  },
  {
    name: 'help',
    patterns: [
      /\b(ajuda|help|comandos|o\s*que\s*(você\s*)?(pode|consegue)\s*fazer)\b/i
    ],
    description: 'Mostrar ajuda',
    action: 'SHOW_HELP',
    requiresConfirmation: false
  },
  {
    name: 'zoom_in',
    patterns: [
      /\b(aumentar|ampliar)\s*(o\s*)?(zoom|vídeo|video)\b/i,
      /\bzoom\s*(in|mais)\b/i
    ],
    description: 'Aumentar zoom',
    action: 'ZOOM_IN',
    requiresConfirmation: false
  },
  {
    name: 'zoom_out',
    patterns: [
      /\b(diminuir|reduzir)\s*(o\s*)?(zoom|vídeo|video)\b/i,
      /\bzoom\s*(out|menos)\b/i
    ],
    description: 'Diminuir zoom',
    action: 'ZOOM_OUT',
    requiresConfirmation: false
  },
  {
    name: 'toggle_fullscreen',
    patterns: [
      /\b(tela\s*cheia|fullscreen|maximizar)\b/i,
      /\b(sair|fechar)\s*(da\s*)?(tela\s*cheia|fullscreen)\b/i
    ],
    description: 'Tela cheia',
    action: 'TOGGLE_FULLSCREEN',
    requiresConfirmation: false
  }
]

// Parse text and find matching command
export function parseVoiceCommand(text: string): ParsedCommand {
  const normalizedText = text.toLowerCase().trim()
  
  for (const command of VOICE_COMMANDS) {
    for (const pattern of command.patterns) {
      const match = normalizedText.match(pattern)
      if (match) {
        const params: Record<string, string> = {}
        
        // Extract note content for take_note command
        if (command.action === 'TAKE_NOTE' && match[2]) {
          params.noteContent = match[2].trim()
        }
        
        return {
          command,
          confidence: 0.9,
          rawText: text,
          params
        }
      }
    }
  }
  
  return {
    command: null,
    confidence: 0,
    rawText: text
  }
}

// Get all available command descriptions for help
export function getCommandHelp(): string[] {
  return VOICE_COMMANDS.map(cmd => `"${cmd.description}" - ${cmd.name}`)
}

// Browser Speech Recognition wrapper types
export interface SpeechRecognitionConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
}

export const DEFAULT_SPEECH_CONFIG: SpeechRecognitionConfig = {
  language: 'pt-BR',
  continuous: true,
  interimResults: true,
  maxAlternatives: 1
}

// Voice feedback messages
export const VOICE_RESPONSES = {
  listening: 'Estou ouvindo...',
  notUnderstood: 'Não entendi o comando. Diga "ajuda" para ver os comandos disponíveis.',
  confirmAction: (action: string) => `Confirma ${action}?`,
  actionConfirmed: 'Ação confirmada.',
  actionCancelled: 'Ação cancelada.',
  videoOn: 'Câmera ligada.',
  videoOff: 'Câmera desligada.',
  micOn: 'Microfone ligado.',
  micOff: 'Microfone desligado.',
  recordingStarted: 'Gravação iniciada.',
  recordingStopped: 'Gravação encerrada.',
  consultationEnded: 'Consulta encerrada.',
  screenSharing: 'Compartilhando tela.',
  screenShareStopped: 'Compartilhamento encerrado.',
  noteTaken: 'Anotação salva.',
  error: 'Ocorreu um erro. Tente novamente.'
}

// Text-to-speech helper
export function speakText(text: string, lang = 'pt-BR'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1.0
  utterance.pitch = 1.0
  utterance.volume = 0.8
  
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

// Check browser support
export function checkVoiceSupport(): { recognition: boolean; synthesis: boolean } {
  if (typeof window === 'undefined') {
    return { recognition: false, synthesis: false }
  }
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  return {
    recognition: !!SpeechRecognition,
    synthesis: !!window.speechSynthesis
  }
}
