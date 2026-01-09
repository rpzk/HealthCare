/**
 * WebRTC Utilities - Otimização e Configuração
 * Sistema self-hosted sem dependências externas pagas
 */

export interface MediaQualityPreset {
  name: string
  video: MediaTrackConstraints
  audio: MediaTrackConstraints | boolean
}

/**
 * Presets de qualidade de vídeo
 * Ajustam automaticamente conforme largura de banda disponível
 */
export const QUALITY_PRESETS: Record<string, MediaQualityPreset> = {
  // HD - Para conexões excelentes (5+ Mbps)
  high: {
    name: 'Alta Qualidade (HD)',
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  },

  // SD - Para conexões médias (2-5 Mbps) - PADRÃO
  medium: {
    name: 'Qualidade Média (SD)',
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
      channelCount: 1
    }
  },

  // Low - Para conexões fracas (< 2 Mbps)
  low: {
    name: 'Economia de Dados',
    video: {
      width: { ideal: 320, max: 640 },
      height: { ideal: 240, max: 480 },
      frameRate: { ideal: 15, max: 24 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
      channelCount: 1
    }
  },

  // Audio only - Emergência (conexão muito ruim)
  audioOnly: {
    name: 'Apenas Áudio',
    video: false as any,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
      channelCount: 1
    }
  }
}

/**
 * Configuração de ICE servers com fallback
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch('/api/tele/config')
    const data = await response.json()
    
    if (data.iceServers && data.iceServers.length > 0) {
      return data.iceServers
    }
  } catch (error) {
    console.warn('Failed to load ICE config from API, using defaults', error)
  }

  // Fallback: usar STUN servers públicos gratuitos
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ]
}

/**
 * Configuração otimizada de RTCPeerConnection
 */
export function createOptimizedPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  const config: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all' // 'relay' para forçar TURN
  }

  return new RTCPeerConnection(config)
}

/**
 * Detecta qualidade de conexão e ajusta preset automaticamente
 */
export async function detectConnectionQuality(): Promise<keyof typeof QUALITY_PRESETS> {
  if (!('connection' in navigator)) {
    return 'medium' // Fallback se API não disponível
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!conn) return 'medium'

  const effectiveType = conn.effectiveType // '4g', '3g', '2g', 'slow-2g'
  const downlink = conn.downlink // Mbps estimado

  // 4G ou WiFi rápido
  if (effectiveType === '4g' && downlink > 5) {
    return 'high'
  }

  // 3G ou 4G lento
  if (effectiveType === '3g' || (effectiveType === '4g' && downlink < 2)) {
    return 'low'
  }

  // 2G
  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return 'audioOnly'
  }

  return 'medium'
}

/**
 * Aplica constraints de qualidade à stream
 */
export async function getUserMediaWithQuality(
  preset: keyof typeof QUALITY_PRESETS = 'medium',
  allowFallback: boolean = true
): Promise<MediaStream> {
  const quality = QUALITY_PRESETS[preset]

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: quality.video,
      audio: quality.audio
    })

    console.log(`[WebRTC] Stream obtained with ${quality.name}`)
    return stream
  } catch (error) {
    console.error('[WebRTC] Error getting media with preset:', preset, error)

    if (!allowFallback) {
      throw error
    }

    // Fallback automático para qualidade menor
    if (preset === 'high') {
      console.log('[WebRTC] Falling back to medium quality')
      return getUserMediaWithQuality('medium', true)
    }

    if (preset === 'medium') {
      console.log('[WebRTC] Falling back to low quality')
      return getUserMediaWithQuality('low', true)
    }

    if (preset === 'low') {
      console.log('[WebRTC] Falling back to audio only')
      return getUserMediaWithQuality('audioOnly', false)
    }

    throw error
  }
}

/**
 * Monitor de estatísticas de conexão
 */
export class ConnectionStatsMonitor {
  private pc: RTCPeerConnection
  private intervalId: NodeJS.Timeout | null = null
  private onStatsUpdate?: (stats: ConnectionStats) => void

  constructor(pc: RTCPeerConnection, onStatsUpdate?: (stats: ConnectionStats) => void) {
    this.pc = pc
    this.onStatsUpdate = onStatsUpdate
  }

  start(interval: number = 2000) {
    this.intervalId = setInterval(async () => {
      const stats = await this.getStats()
      this.onStatsUpdate?.(stats)
    }, interval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async getStats(): Promise<ConnectionStats> {
    const stats = await this.pc.getStats()
    
    let bytesReceived = 0
    let bytesSent = 0
    let packetsLost = 0
    let jitter = 0
    let roundTripTime = 0
    let quality: 'good' | 'medium' | 'poor' = 'good'

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        bytesReceived += report.bytesReceived || 0
        packetsLost += report.packetsLost || 0
        jitter = report.jitter || 0
      }

      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        bytesSent += report.bytesSent || 0
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        roundTripTime = report.currentRoundTripTime || 0
      }
    })

    // Calcular qualidade baseada em métricas
    if (roundTripTime > 0.3 || packetsLost > 10) {
      quality = 'poor'
    } else if (roundTripTime > 0.15 || packetsLost > 5) {
      quality = 'medium'
    }

    return {
      bytesReceived,
      bytesSent,
      packetsLost,
      jitter,
      roundTripTime: Math.round(roundTripTime * 1000), // em ms
      quality,
      timestamp: Date.now()
    }
  }
}

export interface ConnectionStats {
  bytesReceived: number
  bytesSent: number
  packetsLost: number
  jitter: number
  roundTripTime: number // ms
  quality: 'good' | 'medium' | 'poor'
  timestamp: number
}

/**
 * Formata bytes para exibição
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Testa conectividade com STUN/TURN
 */
export async function testIceConnectivity(iceServers: RTCIceServer[]): Promise<IceTestResult> {
  return new Promise((resolve) => {
    const run = async () => {
      const pc = new RTCPeerConnection({ iceServers })

      const candidates: RTCIceCandidate[] = []
      let hasHost = false
      let hasSrflx = false
      let hasRelay = false

      const finish = () => {
        pc.close()
        resolve({
          hasHost,
          hasSrflx,
          hasRelay,
          candidatesCount: candidates.length,
          quality: hasRelay ? 'excellent' : hasSrflx ? 'good' : hasHost ? 'limited' : 'none',
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate)

          if (event.candidate.type === 'host') hasHost = true
          if (event.candidate.type === 'srflx') hasSrflx = true
          if (event.candidate.type === 'relay') hasRelay = true
        }
      }

      // Wait for gathering to complete
      const timeout = setTimeout(() => {
        finish()
      }, 5000)

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout)
          finish()
        }
      }

      // Trigger ICE gathering
      await pc.createOffer()
      await pc.setLocalDescription()
    }

    void run().catch(() => {
      resolve({
        hasHost: false,
        hasSrflx: false,
        hasRelay: false,
        candidatesCount: 0,
        quality: 'none',
      })
    })
  })
}

export interface IceTestResult {
  hasHost: boolean
  hasSrflx: boolean
  hasRelay: boolean
  candidatesCount: number
  quality: 'excellent' | 'good' | 'limited' | 'none'
}

/**
 * Recuperação automática de conexão perdida
 */
export class ConnectionRecovery {
  private pc: RTCPeerConnection
  private onReconnect?: () => void
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  constructor(pc: RTCPeerConnection, onReconnect?: () => void) {
    this.pc = pc
    this.onReconnect = onReconnect

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
      
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.handleDisconnection()
      }

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.reconnectAttempts = 0
      }
    }
  }

  private async handleDisconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebRTC] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`[WebRTC] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    try {
      // ICE restart
      await this.pc.restartIce()
      this.onReconnect?.()
    } catch (error) {
      console.error('[WebRTC] Reconnection failed:', error)
    }
  }
}
