"use client"
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  Settings, AlertCircle, CheckCircle2, Loader2, 
  Volume2, VolumeX, Maximize, Minimize, RefreshCw,
  Shield, Wifi, WifiOff, Camera
} from 'lucide-react'

type Props = {
  roomId: string
  joinToken: string
  consultationStartedAt?: string
  patientName: string
  doctorName?: string
}

type ConnectionStatus = 'idle' | 'checking' | 'requesting' | 'connecting' | 'connected' | 'waiting' | 'error' | 'disconnected'

export function TelePatientRoom({ roomId, joinToken, consultationStartedAt, patientName, doctorName }: Props) {
  const clientId = useMemo(() => `patient-${Math.random().toString(36).slice(2, 9)}`, [])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const localPipRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)
  const esRef = useRef<EventSource | null>(null)
  
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor' | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [consultationElapsedSeconds, setConsultationElapsedSeconds] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)

  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ])
  
  // Load ICE servers config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tele/config')
        const json = await res.json().catch(() => null)
        if (json?.iceServers) setIceServers(json.iceServers)
      } catch (e) {
        logger.warn('Failed to load ICE config', e)
      }
    })()
  }, [])

  const sendSignal = useCallback(async (payload: any) => {
    await fetch(`/api/tele/rooms/${roomId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, token: joinToken }),
    })
  }, [roomId, joinToken])

  // Check permissions on mount
  useEffect(() => {
    checkPermissions()
  }, [])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'connected') {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [status])

  // Consultation timer (based on consultation start time)
  useEffect(() => {
    if (!consultationStartedAt) return
    const startedAtMs = new Date(consultationStartedAt).getTime()
    if (!Number.isFinite(startedAtMs)) return

    const tick = () => {
      const nowMs = Date.now()
      const diffSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
      setConsultationElapsedSeconds(diffSeconds)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [consultationStartedAt])

  const cleanup = useCallback(() => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop())
      }
      const localStream = localStreamRef.current ?? (localPipRef.current?.srcObject as MediaStream | null)
      localStream?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null
      if (localPipRef.current) localPipRef.current.srcObject = null
      pcRef.current?.close()
      esRef.current?.close()
    } catch (e) {
      logger.warn('Cleanup error', e)
    }
  }, [previewStream])

  const attachLocalPip = useCallback(async () => {
    const stream = localStreamRef.current
    const el = localPipRef.current
    if (!stream || !el) return
    if (el.srcObject !== stream) el.srcObject = stream
    try {
      await el.play()
    } catch {
      // ignore autoplay/play errors
    }
  }, [])

  useEffect(() => {
    if (!joined) return
    void attachLocalPip()
  }, [joined, attachLocalPip])

  // Cleanup on unmount — include cleanup dependency (stable via useCallback)
  useEffect(() => cleanup, [cleanup])

  async function checkPermissions() {
    try {
      setStatus('checking')
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermissions(false)
        setError('Seu navegador não suporta videochamadas')
        setErrorDetails('Use Chrome, Firefox, Safari ou Edge em versões recentes')
        setStatus('error')
        return
      }

      // Check existing permissions
      const permissions = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null)
      ])

      const camPerm = permissions[0]?.state
      const micPerm = permissions[1]?.state

      if (camPerm === 'denied' || micPerm === 'denied') {
        setHasPermissions(false)
        setError('Permissão negada para câmera ou microfone')
        setErrorDetails('Você precisa permitir o acesso nas configurações do navegador')
        setStatus('error')
        return
      }

      setHasPermissions(camPerm === 'granted' && micPerm === 'granted')
      setStatus('idle')
    } catch (e) {
      // non-fatal permission check failure
      logger.warn('Permission check failed', e)
      setStatus('idle')
    }
  }

  async function testDevices() {
    try {
      setShowPreview(true)
      setError(null)
      setErrorDetails(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      })
      
      setPreviewStream(stream)
      setHasPermissions(true)
      
      // Show preview in local video
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
        try { await previewVideoRef.current.play() } catch {}
      }
    } catch (err: unknown) {
      logger.error('Erro ao testar dispositivos:', err)
      setHasPermissions(false)

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Você precisa permitir o acesso à câmera e microfone')
          setErrorDetails('Clique no ícone de cadeado na barra de endereço do navegador e permita o acesso')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Câmera ou microfone não encontrados')
          setErrorDetails('Verifique se seus dispositivos estão conectados corretamente')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Não foi possível acessar a câmera')
          setErrorDetails('A câmera pode estar sendo usada por outro aplicativo')
        } else {
          setError('Erro ao acessar dispositivos')
          setErrorDetails(err.message)
        }
      } else {
        setError('Erro ao acessar dispositivos')
        setErrorDetails(String(err))
      }
    }
  }

  function closePreview() {
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop())
      setPreviewStream(null)
    }
    setShowPreview(false)
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null
  }

  async function join() {
    try {
      setError(null)
      setErrorDetails(null)
      setStatus('requesting')
      
      // Stop preview stream if exists
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop())
        setPreviewStream(null)
      }
      
      const pc = new RTCPeerConnection({ 
        iceServers,
        iceCandidatePoolSize: 10
      })
      pcRef.current = pc
      
      // Get media with better constraints
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      })
      
      ms.getTracks().forEach(t => pc.addTrack(t, ms))
      localStreamRef.current = ms
      void attachLocalPip()
      
      setStatus('connecting')
      
      pc.ontrack = (ev) => {
        if (remoteRef.current && ev.streams[0]) {
          remoteRef.current.srcObject = ev.streams[0]
        }
      }
      
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'connected') {
          setStatus('connected')
          setConnectionQuality('good')
        } else if (state === 'connecting') {
          setStatus('connecting')
        } else if (state === 'disconnected') {
          setStatus('disconnected')
          setConnectionQuality(null)
        } else if (state === 'failed') {
          setStatus('error')
          setError('Conexão perdida')
          setErrorDetails('Verifique sua conexão com a internet')
        }
      }

      // Monitor connection quality
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'checking') {
          setConnectionQuality('medium')
        } else if (state === 'connected' || state === 'completed') {
          setConnectionQuality('good')
        } else if (state === 'disconnected') {
          setConnectionQuality('poor')
        }
      }

      // Signaling
      const es = new EventSource(
        `/api/tele/rooms/${roomId}/events?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(joinToken)}`
      )
      esRef.current = es
      
      es.addEventListener('signal', async (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data)

          if (data.type === 'peer_joined') {
            // If staff joined after us, announce readiness again.
            if (data.kind === 'staff') {
              await sendSignal({ type: 'ready', from: clientId })
            }
            return
          }

          if (data.type === 'offer') {
            try {
              await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await sendSignal({ type: 'answer', sdp: answer.sdp, from: clientId })
            } catch (e: unknown) {
              logger.warn('Failed to handle offer (patient)', e)
              setStatus('error')
              setError('Erro ao negociar chamada')
              setErrorDetails(e instanceof Error ? e.message : String(e))
            }
          } else if (data.type === 'answer') {
            if (!pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
              } catch (e: unknown) {
                logger.warn('Failed to handle answer (patient)', e)
                setStatus('error')
                setError('Erro ao negociar chamada')
                setErrorDetails(e instanceof Error ? e.message : String(e))
              }
            }
          } else if (data.type === 'candidate' && data.candidate) {
            try {
              await pc.addIceCandidate(data.candidate)
            } catch (e) {
              logger.warn('Failed to add ICE candidate', e)
            }
          }
        } catch (err) {
          logger.error('Signaling error:', err)
        }
      })
      
      es.onerror = () => {
        logger.warn('EventSource error')
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void sendSignal({ type: 'candidate', candidate: ev.candidate, from: clientId })
        }
      }

      // Announce readiness so the doctor side can trigger the offer.
      await sendSignal({ type: 'ready', from: clientId })

      setJoined(true)
      setStatus('waiting')
    } catch (err: unknown) {
      logger.error('Erro ao entrar:', err)
      setStatus('error')

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permissão negada')
          setErrorDetails('Você precisa permitir o acesso à câmera e microfone para participar da chamada')
        } else if (err.name === 'NotFoundError') {
          setError('Dispositivos não encontrados')
          setErrorDetails('Verifique se sua câmera e microfone estão conectados')
        } else {
          setError('Erro ao iniciar chamada')
          setErrorDetails(err.message)
        }
      } else {
        setError('Erro ao iniciar chamada')
        setErrorDetails(String(err))
      }
    }
  }

  function toggleMute() {
    const stream = localStreamRef.current ?? (localPipRef.current?.srcObject as MediaStream | null)
    stream?.getAudioTracks().forEach(t => t.enabled = muted)
    setMuted(!muted)
  }

  function toggleVideo() {
    const stream = localStreamRef.current ?? (localPipRef.current?.srcObject as MediaStream | null)
    stream?.getVideoTracks().forEach(t => t.enabled = videoOff)
    setVideoOff(!videoOff)
  }

  function toggleSpeaker() {
    if (remoteRef.current) {
      remoteRef.current.muted = !speakerOff
      setSpeakerOff(!speakerOff)
    }
  }

  function toggleFullscreen() {
    const container = document.getElementById('tele-container')
    if (!container) return
    
    if (!document.fullscreenElement) {
      container.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  function endCall() {
    cleanup()
    setJoined(false)
    setStatus('idle')
    setCallDuration(0)
    setConnectionQuality(null)
  }

  function retryConnection() {
    cleanup()
    setJoined(false)
    setError(null)
    setErrorDetails(null)
    setStatus('idle')
    setCallDuration(0)
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const statusConfig = {
    idle: { label: 'Pronto para iniciar', color: 'bg-gray-400', icon: Video },
    checking: { label: 'Verificando...', color: 'bg-blue-400 animate-pulse', icon: Settings },
    requesting: { label: 'Solicitando permissões...', color: 'bg-blue-500 animate-pulse', icon: Camera },
    connecting: { label: 'Conectando...', color: 'bg-yellow-500 animate-pulse', icon: Wifi },
    connected: { label: 'Conectado', color: 'bg-green-500', icon: CheckCircle2 },
    waiting: { label: 'Aguardando médico...', color: 'bg-amber-500 animate-pulse', icon: Loader2 },
    error: { label: 'Erro', color: 'bg-red-500', icon: AlertCircle },
    disconnected: { label: 'Desconectado', color: 'bg-gray-500', icon: WifiOff }
  }

  const currentStatus = statusConfig[status]
  const StatusIcon = currentStatus.icon

  // Pre-join screen
  if (!joined && !showPreview) {
    return (
      <div className="space-y-6">
        {/* Permission Status Card */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          hasPermissions === true ? 'bg-green-50 border-green-200' :
          hasPermissions === false ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              hasPermissions === true ? 'bg-green-100' :
              hasPermissions === false ? 'bg-red-100' :
              'bg-blue-100'
            }`}>
              {hasPermissions === true ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : hasPermissions === false ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <Camera className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${
                hasPermissions === true ? 'text-green-800' :
                hasPermissions === false ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {hasPermissions === true ? 'Dispositivos prontos!' :
                 hasPermissions === false ? 'Permissão necessária' :
                 'Permitir câmera e microfone'}
              </h3>
              <p className={`mt-1 text-sm ${
                hasPermissions === true ? 'text-green-600' :
                hasPermissions === false ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {hasPermissions === true ? 'Sua câmera e microfone estão funcionando.' :
                 hasPermissions === false ? 'Siga as instruções abaixo para permitir o acesso.' :
                 'Clique no botão abaixo - o navegador vai pedir permissão.'}
              </p>
            </div>
          </div>

          {/* Error Details with detailed instructions */}
          {hasPermissions === false && (
            <div className="mt-4 p-4 bg-red-100 rounded-xl border border-red-200">
              <p className="font-medium text-red-800 mb-3">
                {error || 'Permissão bloqueada'}
              </p>

              {errorDetails && (
                <p className="text-sm text-red-700 mb-3">
                  Detalhes: {errorDetails}
                </p>
              )}
              
              <div className="space-y-3 text-sm text-red-700">
                <p className="font-medium">📱 No celular (Chrome/Samsung Internet):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Toque nos <strong>3 pontinhos</strong> (⋮) no canto superior</li>
                  <li>Toque em <strong>"Configurações do site"</strong> ou <strong>"Informações"</strong></li>
                  <li>Toque em <strong>"Permissões"</strong></li>
                  <li>Ative <strong>Câmera</strong> e <strong>Microfone</strong></li>
                  <li>Recarregue a página</li>
                </ol>
                
                <p className="font-medium mt-4">💻 No computador (Chrome/Brave/Edge):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Clique no <strong>cadeado 🔒</strong> na barra de endereço</li>
                  <li>Clique em <strong>"Configurações do site"</strong></li>
                  <li>Mude Câmera e Microfone para <strong>"Permitir"</strong></li>
                  <li>Recarregue a página (F5)</li>
                </ol>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 font-medium">⚡ Atalho rápido:</p>
                  <p className="text-amber-700 mt-1">
                    Recarregue a página e quando aparecer o popup pedindo permissão, clique em <strong>"Permitir"</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Request Permission Button */}
          <button
            onClick={testDevices}
            className={`mt-4 w-full py-4 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 ${
              hasPermissions === true 
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            <Camera className="w-5 h-5" />
            {hasPermissions === true 
              ? 'Testar novamente' 
              : hasPermissions === false 
                ? 'Tentar permitir novamente' 
                : 'Permitir câmera e microfone'}
          </button>
        </div>

        {/* Main Join Button - only show if permissions granted */}
        {hasPermissions === true && (
          <button
            onClick={join}
            disabled={status === 'checking'}
            className="w-full py-5 px-6 rounded-2xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            <Video className="w-6 h-6" />
            Entrar na Teleconsulta
          </button>
        )}

        {/* Alternative: Join anyway button (for when permissions seem blocked but might work) */}
        {hasPermissions === false && (
          <button
            onClick={join}
            className="w-full py-4 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
          >
            <Video className="w-5 h-5" />
            Tentar entrar mesmo assim
          </button>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Dicas para uma boa consulta
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              Escolha um ambiente bem iluminado e silencioso
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              Use fones de ouvido para melhor qualidade de áudio
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              Verifique sua conexão com a internet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              Tenha em mãos exames ou receitas que deseja mostrar
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // Preview screen
  if (showPreview && !joined) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden">
          <video
            ref={previewVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 rounded-lg text-white text-sm font-medium">
            Pré-visualização
          </div>
        </div>

        {hasPermissions === true ? (
          <div className="flex gap-3">
            <button
              onClick={closePreview}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => { closePreview(); join(); }}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              Iniciar chamada
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="font-medium text-red-800">{error}</p>
                {errorDetails && (
                  <p className="mt-1 text-sm text-red-600">{errorDetails}</p>
                )}
              </div>
            )}
            <button
              onClick={() => { closePreview(); }}
              className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    )
  }

  // In-call screen
  return (
    <div id="tele-container" className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-gray-100 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${currentStatus.color}`} />
          <StatusIcon className={`w-4 h-4 text-gray-600 ${status === 'waiting' ? 'animate-spin' : ''}`} />
          <span className="font-medium text-gray-700">{currentStatus.label}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Quality */}
          {connectionQuality && (
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                connectionQuality === 'good' ? 'bg-green-500' :
                connectionQuality === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-500">
                {connectionQuality === 'good' ? 'Boa' : connectionQuality === 'medium' ? 'Regular' : 'Fraca'}
              </span>
            </div>
          )}
          
          {/* Call Duration */}
          {status === 'connected' && (
            <div className="flex items-center gap-1.5 text-green-600">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm font-medium">{formatDuration(callDuration)}</span>
            </div>
          )}

          {/* Consultation Duration */}
          {consultationStartedAt && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <span className="text-xs text-gray-500">Consulta:</span>
              <span className="font-mono text-sm font-medium">{formatDuration(consultationElapsedSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">{error}</p>
              {errorDetails && (
                <p className="mt-1 text-sm text-red-600">{errorDetails}</p>
              )}
            </div>
            <button
              onClick={retryConnection}
              className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Videos */}
      <div className="relative">
        {/* Remote Video (Doctor) - Main */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl">
          <video
            ref={remoteRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          {/* Waiting overlay */}
          {status === 'waiting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <p className="text-white font-medium text-lg">Aguardando o médico entrar...</p>
              <p className="text-gray-400 text-sm mt-2">Você será conectado automaticamente</p>
            </div>
          )}
          
          {/* Doctor label */}
          {status === 'connected' && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 rounded-lg text-white text-sm font-medium backdrop-blur-sm">
              Dr(a). {doctorName || 'Médico'}
            </div>
          )}
        </div>

        {/* Local Video (Patient) - PIP */}
        <div className="absolute bottom-4 right-4 w-32 sm:w-40 md:w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
          <video
            ref={localPipRef}
            className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''}`}
            autoPlay
            muted
            playsInline
          />
          {videoOff && (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-white text-xs">
            Você
          </div>
          {muted && (
            <div className="absolute top-1 right-1 p-1 bg-red-500 rounded-full">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 bg-gray-100 rounded-2xl p-4">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            muted 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
          }`}
          title={muted ? 'Ativar microfone' : 'Desativar microfone'}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            videoOff 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
          }`}
          title={videoOff ? 'Ativar câmera' : 'Desativar câmera'}
        >
          {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105 shadow-lg"
          title="Encerrar chamada"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Speaker */}
        <button
          onClick={toggleSpeaker}
          className={`p-4 rounded-full transition-all transform hover:scale-105 ${
            speakerOff 
              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
          }`}
          title={speakerOff ? 'Ativar som' : 'Desativar som'}
        >
          {speakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-4 rounded-full bg-white hover:bg-gray-50 text-gray-700 shadow-md transition-all transform hover:scale-105"
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>
      </div>

      {/* Connection info */}
      {status === 'connected' && (
        <div className="text-center text-sm text-gray-500">
          <Shield className="w-4 h-4 inline-block mr-1" />
          Conexão segura e criptografada
        </div>
      )}
    </div>
  )
}
