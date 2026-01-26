"use client"
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SignatureButton } from '@/components/tele/digital-signature-pad'
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  Loader2, Maximize2, Minimize2, Wifi, Move,
  ScreenShare, ScreenShareOff, Volume2, VolumeX, Users, X, PenTool
} from 'lucide-react'

type Props = {
  roomId: string
  userId: string
  patientName?: string
  consultationStartedAt?: string
}

type ConnectionStatus = 'idle' | 'preparing' | 'connecting' | 'connected' | 'disconnected' | 'failed'

export default function TeleRoomCompact({ roomId, userId, patientName, consultationStartedAt }: Props) {
  const clientId = useMemo(() => `${userId}-${Math.random().toString(36).slice(2, 9)}`, [userId])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [consultationElapsedSeconds, setConsultationElapsedSeconds] = useState(0)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor' | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true) // Inicia minimizado
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  // Assinaturas (desenho)
  type TeleSignature = {
    id: string
    signerRole: string
    createdAt: string
    sha256?: string | null
  }
  const [showSignatures, setShowSignatures] = useState(false)
  const [signaturesLoading, setSignaturesLoading] = useState(false)
  const [signaturesError, setSignaturesError] = useState<string | null>(null)
  const [signatures, setSignatures] = useState<TeleSignature[]>([])

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
    if (pc.signalingState !== 'stable') return

    offerInFlightRef.current = true
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)
      await sendSignal({ type: 'offer', sdp: offer.sdp, from: clientId })
      setStatus('connecting')
    } catch (e: unknown) {
      logger.warn('Failed to create/send offer (compact)', e)
      setError('Erro ao iniciar chamada')
      setStatus('failed')
      setRemoteConnected(false)
      setConnectionQuality(null)
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
        logger.warn('Failed to load ICE config', e)
      }
    })()
  }, [])

  const loadSignatures = useCallback(async () => {
    try {
      setSignaturesLoading(true)
      setSignaturesError(null)

      const res = await fetch(`/api/tele/signature?consultationId=${encodeURIComponent(roomId)}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao carregar assinaturas')
      }

      const items = Array.isArray(data?.data) ? data.data : []
      setSignatures(items)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setSignaturesError(message)
    } finally {
      setSignaturesLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!showSignatures) return
    void loadSignatures()
  }, [showSignatures, loadSignatures])

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
      const stream = localStreamRef.current ?? (localRef.current?.srcObject as MediaStream | null)
      stream?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      if (localRef.current) localRef.current.srcObject = null
      pcRef.current?.close()
      esRef.current?.close()
    } catch (e) {
      logger.warn('Cleanup error', e)
    }
  }, [])

  const attachLocalPreview = useCallback(async () => {
    const stream = localStreamRef.current
    const el = localRef.current
    if (!stream || !el) return
    if (el.srcObject !== stream) el.srcObject = stream
    try {
      await el.play()
    } catch {
      // ignore autoplay/play errors; user gesture already happened on join
    }
  }, [])

  useEffect(() => {
    if (!joined) return
    void attachLocalPreview()
  }, [joined, attachLocalPreview])

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
      
      const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 })
      pcRef.current = pc
      
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      })
      
      ms.getTracks().forEach(t => pc.addTrack(t, ms))
      localStreamRef.current = ms
      // PIP video mounts only after `joined` becomes true.
      // Keep a ref to the stream and attach it once the element exists.
      void attachLocalPreview()
      
      pc.ontrack = (ev) => {
        if (remoteRef.current && ev.streams[0]) {
          remoteRef.current.srcObject = ev.streams[0]
          setRemoteConnected(true)
        }
      }
      
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState as ConnectionStatus
        if (state === 'connected') { setStatus('connected'); setConnectionQuality('good') }
        else if (state === 'connecting') { setStatus('connecting') }
        else if (state === 'disconnected') { setStatus('disconnected'); setRemoteConnected(false); setConnectionQuality(null) }
        else if (state === 'failed') { setStatus('failed'); setError('Conexão perdida'); setRemoteConnected(false) }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'checking') setConnectionQuality('medium')
        else if (state === 'connected' || state === 'completed') setConnectionQuality('good')
        else if (state === 'disconnected') setConnectionQuality('poor')
      }

      // Signaling
      const es = new EventSource(`/api/tele/rooms/${roomId}/events?clientId=${encodeURIComponent(clientId)}`)
      esRef.current = es
      
      es.addEventListener('signal', async (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.type === 'peer_joined') {
            if (data.kind === 'patient') {
              await maybeSendOffer()
            }
            return
          }
          if (data.type === 'ready') {
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
              logger.warn('Failed handling remote offer (compact)', e)
              setError('Erro ao negociar chamada')
              setStatus('failed')
            }
          } else if (data.type === 'answer' && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
            } catch (e: unknown) {
              logger.warn('Failed handling remote answer (compact)', e)
              setError('Erro ao negociar chamada')
              setStatus('failed')
            }
          } else if (data.type === 'candidate' && data.candidate) {
            try {
              await pc.addIceCandidate(data.candidate)
            } catch (e) {
              logger.warn('Failed to add ICE candidate', e)
            }
          }
        } catch (e) {
          logger.error('Signaling error:', e)
        }
      })

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void sendSignal({ type: 'candidate', candidate: ev.candidate, from: clientId })
        }
      }

      setJoined(true)
      setStatus('connecting')
    } catch (err: unknown) {
      setStatus('idle')
      if (err instanceof Error) {
        setError(err.name === 'NotAllowedError' ? 'Permita câmera e microfone' : err.message || 'Erro')
      } else {
        setError(String(err) || 'Erro')
      }
    }
  }

  function toggleMute() {
    const stream = localStreamRef.current ?? (localRef.current?.srcObject as MediaStream | null)
    stream?.getAudioTracks().forEach(t => t.enabled = muted)
    setMuted(!muted)
  }

  function toggleVideo() {
    const stream = localStreamRef.current ?? (localRef.current?.srcObject as MediaStream | null)
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
        const stream = localRef.current?.srcObject as MediaStream | null
        const camTrack = stream?.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender && camTrack) await sender.replaceTrack(camTrack)
        setIsScreenSharing(false)
      } else {
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const track = ds.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender && track) {
          await sender.replaceTrack(track)
          setIsScreenSharing(true)
          track.onended = () => {
            const stream = localStreamRef.current ?? (localRef.current?.srcObject as MediaStream | null)
            const camTrack = stream?.getVideoTracks()[0]
            if (sender && camTrack) sender.replaceTrack(camTrack)
            setIsScreenSharing(false)
          }
        }
      }
    } catch (e) {
      logger.warn('toggleScreenShare failed', e)
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

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Dragging functionality - Fixed
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      
      // Calculate new position relative to viewport
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Constrain to viewport
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 320)
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 200)
      
      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragOffset])

  // Minimized view - Pill style, draggable
  if (isMinimized) {
    return (
      <div 
        ref={containerRef}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full shadow-2xl border border-teal-400/50 px-4 py-2 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:from-teal-500 hover:to-emerald-500 transition-all select-none"
        onMouseDown={handleMouseDown}
        style={position ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 } : { zIndex: 9999 }}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : joined ? 'bg-yellow-400 animate-pulse' : 'bg-white/60'}`} />
        <Video className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-medium">
          {consultationStartedAt
            ? formatDuration(consultationElapsedSeconds)
            : status === 'connected'
              ? formatDuration(callDuration)
              : joined
                ? 'Conectando...'
                : 'Teleconsulta'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setIsMinimized(false) }}
          className="ml-1 p-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          title="Expandir"
        >
          <Maximize2 className="w-4 h-4 text-white" />
        </button>
      </div>
    )
  }

  // Size based on expansion
  const containerWidth = isExpanded ? 'w-[500px]' : 'w-[320px]'
  const videoHeight = isExpanded ? 'h-[280px]' : 'h-[180px]'

  return (
    <div 
      ref={containerRef}
      className={`${containerWidth} bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transition-all duration-300 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={position ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 } : { zIndex: 9999 }}
    >
      {/* Header - Draggable */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-slate-800 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
          }`} />
          {connectionQuality && status === 'connected' && (
            <Wifi className={`w-3.5 h-3.5 ${
              connectionQuality === 'good' ? 'text-green-400' :
              connectionQuality === 'medium' ? 'text-yellow-400' : 'text-red-400'
            }`} />
          )}
          {status === 'connected' && (
            <span className="text-xs text-red-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(callDuration)}
            </span>
          )}
          {consultationStartedAt && (
            <span className="text-xs text-teal-300 font-mono">
              {formatDuration(consultationElapsedSeconds)}
            </span>
          )}
          {remoteConnected && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Online
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setShowSignatures(true) }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Assinaturas (desenho)"
          >
            <PenTool className="w-4 h-4" />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Videos */}
      <div className={`relative ${videoHeight} bg-slate-800`}>
        {/* Remote Video (Patient) */}
        <video
          ref={remoteRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
        
        {/* Overlays */}
        {joined && !remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90">
            <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-2" />
            <p className="text-white text-sm">Aguardando paciente...</p>
          </div>
        )}
        
        {!joined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
            <Video className="w-10 h-10 text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">Clique para iniciar</p>
            <button
              onClick={join}
              className="mt-3 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Entrar na Chamada
            </button>
          </div>
        )}
        
        {/* Patient Label */}
        {remoteConnected && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
            {patientName}
          </div>
        )}

        {/* Local Video (PIP) - Always visible when joined */}
        {joined && (
          <div className="absolute bottom-2 right-2 w-24 h-16 bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600 shadow-lg">
            <video
              ref={localRef}
              className={`w-full h-full object-cover ${videoOff ? 'hidden' : ''}`}
              autoPlay
              muted
              playsInline
            />
            {videoOff && (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <VideoOff className="w-5 h-5 text-slate-500" />
              </div>
            )}
            {muted && (
              <div className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full">
                <MicOff className="w-2 h-2 text-white" />
              </div>
            )}
            <div className="absolute bottom-0.5 left-0.5 px-1 bg-black/60 rounded text-white text-[10px]">
              Você
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-500/20 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Controls - Only when joined */}
      {joined && (
        <div className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-all ${muted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={muted ? 'Ativar microfone' : 'Desativar microfone'}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition-all ${videoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={videoOff ? 'Ativar câmera' : 'Desativar câmera'}
          >
            {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-full transition-all ${isScreenSharing ? 'bg-blue-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={isScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
          >
            {isScreenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
          </button>

          <button
            onClick={endCall}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
            title="Encerrar chamada"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-all ${speakerOff ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={speakerOff ? 'Ativar som' : 'Desativar som'}
          >
            {speakerOff ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      <Dialog open={showSignatures} onOpenChange={setShowSignatures}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assinaturas (desenho)</DialogTitle>
            <DialogDescription>
              Registros de assinatura anexados à teleconsulta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <SignatureButton
              consultationId={roomId}
              onSignatureSaved={() => {
                void loadSignatures()
              }}
            />
            <button
              type="button"
              onClick={() => void loadSignatures()}
              disabled={signaturesLoading}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {signaturesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </button>
          </div>

          {signaturesError ? (
            <div className="text-sm text-destructive">{signaturesError}</div>
          ) : null}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Registros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {signaturesLoading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : signatures.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</div>
              ) : (
                signatures.map((sig) => {
                  const downloadUrl = `/api/tele/signature?consultationId=${encodeURIComponent(roomId)}&id=${encodeURIComponent(sig.id)}&download=1`
                  return (
                    <div key={sig.id} className="flex items-center justify-between gap-2 border rounded p-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {sig.signerRole === 'PATIENT' ? 'Paciente' : sig.signerRole === 'DOCTOR' ? 'Médico(a)' : sig.signerRole}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {new Date(sig.createdAt).toLocaleString('pt-BR')}
                          {sig.sha256 ? ` • sha256: ${sig.sha256}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
                          className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          Abrir
                        </button>
                        <a
                          className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground"
                          href={downloadUrl}
                          download
                        >
                          Baixar
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  )
}
