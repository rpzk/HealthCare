"use client"
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  AlertCircle, Loader2, Maximize, Minimize, RefreshCw, Wifi,
  ScreenShare, ScreenShareOff, Volume2, VolumeX, Users
} from 'lucide-react'

type Props = {
  roomId: string
  userId: string
  patientName?: string
}

type ConnectionStatus = 'idle' | 'preparing' | 'connecting' | 'connected' | 'disconnected' | 'failed'

export default function TeleRoom({ roomId, userId, patientName }: Props) {
  const clientId = useMemo(() => `${userId}-${Math.random().toString(36).slice(2, 9)}`, [userId])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)
  
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor' | null>(null)

  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ])

  const offerInFlightRef = useRef(false)

  const sendSignal = useCallback(async (payload: any) => {
    await fetch(`/api/tele/rooms/${roomId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }, [roomId])

  const maybeSendOffer = useCallback(async () => {
    const pc = pcRef.current
    if (!pc) return
    if (offerInFlightRef.current) return
    // Only create a new offer when stable.
    if (pc.signalingState !== 'stable') return

    offerInFlightRef.current = true
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)
      await sendSignal({ type: 'offer', sdp: offer.sdp, from: clientId })
      setStatus('connecting')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError('Erro ao iniciar chamada')
      // surface more detail for debugging
      logger.warn('Failed to create/send offer', err)
      setStatus('failed')
      setRemoteConnected(false)
      setConnectionQuality(null)
      // best-effort show details
      setError(prev => prev || 'Erro ao iniciar chamada')
    } finally {
      offerInFlightRef.current = false
    }
  }, [clientId, sendSignal])

  // Load ICE config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tele/config')
        const json = await res.json().catch(() => null)
        if (json?.iceServers) setIceServers(json.iceServers)
      } catch (e) {
        // Non-fatal — keep default ICE servers
        logger.warn('Failed to load ICE config', e)
      }
    })()
  }, [])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'connected') {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [status])

  const cleanup = useCallback(() => {
    try {
      if (localRef.current?.srcObject) {
        const stream = localRef.current.srcObject as MediaStream
        stream.getTracks().forEach(t => t.stop())
      }
      pcRef.current?.close()
      esRef.current?.close()
    } catch (err: unknown) {
      logger.warn('Error during cleanup', err)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        cleanup()
      } catch (e) {
        logger.warn('Error during cleanup', e)
      }
    }
  }, [cleanup])

  async function join() {
    try {
      setError(null)
      setStatus('preparing')
      
      const pc = new RTCPeerConnection({ 
        iceServers,
        iceCandidatePoolSize: 10
      })
      pcRef.current = pc
      
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
      if (localRef.current) localRef.current.srcObject = ms
      
      pc.ontrack = (ev) => {
        if (remoteRef.current && ev.streams[0]) {
          remoteRef.current.srcObject = ev.streams[0]
          setRemoteConnected(true)
        }
      }
      
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState as ConnectionStatus
        if (state === 'connected') {
          setStatus('connected')
          setConnectionQuality('good')
        } else if (state === 'connecting') {
          setStatus('connecting')
        } else if (state === 'disconnected') {
          setStatus('disconnected')
          setRemoteConnected(false)
          setConnectionQuality(null)
        } else if (state === 'failed') {
          setStatus('failed')
          setError('Conexão perdida')
          setRemoteConnected(false)
        }
      }

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
      const es = new EventSource(`/api/tele/rooms/${roomId}/events?clientId=${encodeURIComponent(clientId)}`)
      esRef.current = es
      
      es.addEventListener('signal', async (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.type === 'peer_joined') {
            // If the patient joined, trigger negotiation
            if (data.kind === 'patient') {
              await maybeSendOffer()
            }
            return
          }

          if (data.type === 'ready') {
            // Peer explicitly requests negotiation
            await maybeSendOffer()
            return
          }

          if (data.type === 'offer') {
            try {
              await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await sendSignal({ type: 'answer', sdp: answer.sdp, from: clientId })
            } catch (e: unknown) {
              logger.warn('Failed handling remote offer', e)
              setError('Erro ao negociar chamada')
              setStatus('failed')
            }
          } else if (data.type === 'answer') {
            if (!pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
              } catch (e: unknown) {
                logger.warn('Failed handling remote answer', e)
                setError('Erro ao negociar chamada')
                setStatus('failed')
              }
            }
            } else if (data.type === 'candidate' && data.candidate) {
            try {
              await pc.addIceCandidate(data.candidate)
            } catch (e) {
              // ignore candidate insertion errors
              logger.warn('Failed to add ICE candidate', e)
            }
          }
        } catch (err: unknown) {
          logger.error('Signaling error:', err)
        }
      })
      
      es.onerror = () => {
        logger.warn('EventSource reconnecting...')
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void sendSignal({ type: 'candidate', candidate: ev.candidate, from: clientId })
        }
      }

      setJoined(true)
      // Wait for patient to join, then negotiate.
      setStatus('connecting')
    } catch (err: unknown) {
      logger.error('Erro ao entrar:', err)
      setStatus('idle')
      if (err instanceof Error) {
        if ((err as Error).name === 'NotAllowedError') {
          setError('Permita o acesso à câmera e microfone')
        } else if ((err as Error).name === 'NotFoundError') {
          setError('Câmera ou microfone não encontrado')
        } else {
          setError(err.message || 'Erro ao iniciar chamada')
        }
      } else {
        setError(String(err) || 'Erro ao iniciar chamada')
      }
    }
  }

  function toggleMute() {
    const stream = localRef.current?.srcObject as MediaStream | null
    stream?.getAudioTracks().forEach(t => t.enabled = muted)
    setMuted(!muted)
  }

  function toggleVideo() {
    const stream = localRef.current?.srcObject as MediaStream | null
    stream?.getVideoTracks().forEach(t => t.enabled = videoOff)
    setVideoOff(!videoOff)
  }

  function toggleSpeaker() {
    if (remoteRef.current) {
      remoteRef.current.muted = !speakerOff
      setSpeakerOff(!speakerOff)
    }
  }

  async function toggleScreenShare() {
    try {
      const pc = pcRef.current
      if (!pc) return

      if (isScreenSharing) {
        // Revert to camera
        const stream = localRef.current?.srcObject as MediaStream | null
        const camTrack = stream?.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender && camTrack) {
          await sender.replaceTrack(camTrack)
        }
        setIsScreenSharing(false)
      } else {
        // Start screen share
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const track = ds.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        
        if (sender && track) {
          await sender.replaceTrack(track)
          setIsScreenSharing(true)
          
          track.onended = () => {
            // Auto-revert when user stops sharing
            const stream = localRef.current?.srcObject as MediaStream | null
            const camTrack = stream?.getVideoTracks()[0]
            if (sender && camTrack) {
              sender.replaceTrack(camTrack)
            }
            setIsScreenSharing(false)
          }
        }
      }
    } catch (err) {
      logger.error('Screen share error:', err)
    }
  }

  function toggleFullscreen() {
    const container = document.getElementById('tele-doctor-container')
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
    setRemoteConnected(false)
    setConnectionQuality(null)
    setIsScreenSharing(false)
  }

  function retryConnection() {
    cleanup()
    setJoined(false)
    setError(null)
    setStatus('idle')
    setCallDuration(0)
    setRemoteConnected(false)
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const statusConfig = {
    idle: { label: 'Pronto', color: 'bg-gray-400', textColor: 'text-gray-600' },
    preparing: { label: 'Preparando...', color: 'bg-blue-500 animate-pulse', textColor: 'text-blue-600' },
    connecting: { label: 'Conectando...', color: 'bg-yellow-500 animate-pulse', textColor: 'text-yellow-600' },
    connected: { label: 'Conectado', color: 'bg-green-500', textColor: 'text-green-600' },
    disconnected: { label: 'Desconectado', color: 'bg-orange-500', textColor: 'text-orange-600' },
    failed: { label: 'Falha', color: 'bg-red-500', textColor: 'text-red-600' }
  }

  const currentStatus = statusConfig[status]

  return (
    <div id="tele-doctor-container" className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`} />
          <span className={`text-sm font-medium ${currentStatus.textColor}`}>{currentStatus.label}</span>
          
          {connectionQuality && status === 'connected' && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-slate-700 rounded-full">
              <Wifi className={`w-3.5 h-3.5 ${
                connectionQuality === 'good' ? 'text-green-400' :
                connectionQuality === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }`} />
              <span className="text-xs text-slate-300">
                {connectionQuality === 'good' ? 'Boa' : connectionQuality === 'medium' ? 'Regular' : 'Fraca'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'connected' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm text-white">{formatDuration(callDuration)}</span>
            </div>
          )}
          
          {remoteConnected && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 rounded-lg">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Paciente conectado</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Area - Stacked */}
      <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
        {/* Remote Video (Patient) - Larger */}
        <div className="relative flex-[2] min-h-0 bg-slate-800 rounded-xl overflow-hidden">
          <video
            ref={remoteRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          {/* Waiting overlay */}
          {joined && !remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              </div>
              <p className="text-white font-medium">Aguardando paciente...</p>
              <p className="text-slate-400 text-sm mt-1">Envie o convite clicando em "Chamar Paciente"</p>
            </div>
          )}
          
          {/* Not joined overlay */}
          {!joined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
              <Video className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-slate-400">Clique em "Entrar" para iniciar</p>
            </div>
          )}
          
          {/* Label */}
          {remoteConnected && (
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-white text-sm font-medium">
              {patientName || 'Paciente'}
            </div>
          )}
        </div>

        {/* Local Video (Doctor) - Smaller */}
        <div className="relative flex-1 min-h-[120px] max-h-[180px] bg-slate-800 rounded-xl overflow-hidden">
          <video
            ref={localRef}
            className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''}`}
            autoPlay
            muted
            playsInline
          />
          
          {videoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
              <VideoOff className="w-10 h-10 text-slate-500" />
            </div>
          )}
          
          {/* Label */}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-white text-xs">
            Você {isScreenSharing && '(Compartilhando tela)'}
          </div>
          
          {/* Muted indicator */}
          {muted && (
            <div className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-3 mb-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
            <button
              onClick={retryConnection}
              className="px-2 py-1 text-xs bg-red-500/30 hover:bg-red-500/50 text-red-300 rounded transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
        {!joined ? (
          <button
            onClick={join}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            Entrar na Chamada
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {/* Mute */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all ${
                muted 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
              title={muted ? 'Ativar microfone' : 'Desativar microfone'}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all ${
                videoOff 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
              title={videoOff ? 'Ativar câmera' : 'Desativar câmera'}
            >
              {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-all ${
                isScreenSharing 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
              title={isScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
            >
              {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              title="Encerrar chamada"
            >
              <PhoneOff className="w-5 h-5" />
            </button>

            {/* Speaker */}
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full transition-all ${
                speakerOff 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
              title={speakerOff ? 'Ativar som' : 'Desativar som'}
            >
              {speakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-all"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
