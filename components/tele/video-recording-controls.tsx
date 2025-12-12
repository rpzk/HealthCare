'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Video, Square, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface VideoRecordingControlsProps {
  consultationId: string
  onRecordingStateChange?: (isRecording: boolean) => void
}

export function VideoRecordingControls({
  consultationId,
  onRecordingStateChange
}: VideoRecordingControlsProps) {
  const [recording, setRecording] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [duration, setDuration] = useState(0)
  const [showConsent, setShowConsent] = useState(false)
  const [processing, setProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sequenceNumberRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (recording && startTime) {
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [recording, startTime])

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const requestConsent = () => {
    setShowConsent(true)
  }

  const startRecordingWithConsent = async () => {
    setShowConsent(false)
    
    try {
      // Iniciar gravação no servidor
      const response = await fetch(`/api/recordings/${consultationId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientConsent: true })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao iniciar gravação')
      }

      setRecordingId(data.recordingId)

      // Capturar stream de vídeo + áudio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Configurar MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9,opus' }
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus'
      }
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      sequenceNumberRef.current = 0

      // Enviar chunks periodicamente (a cada 10 segundos)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          
          // Enviar chunk para servidor
          const formData = new FormData()
          formData.append('chunk', event.data)
          formData.append('sequenceNumber', sequenceNumberRef.current.toString())
          
          try {
            await fetch(`/api/recordings/${data.recordingId}/chunk`, {
              method: 'POST',
              body: formData
            })
            
            sequenceNumberRef.current++
          } catch (error) {
            console.error('[Recording] Erro ao enviar chunk:', error)
          }
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      // Iniciar gravação com chunks de 10 segundos
      mediaRecorder.start(10000)
      
      setRecording(true)
      setStartTime(Date.now())
      onRecordingStateChange?.(true)

      toast({
        title: '🔴 Gravação Iniciada',
        description: 'A teleconsulta está sendo gravada com consentimento do paciente.',
      })

    } catch (error: unknown) {
      console.error('[Recording] Erro ao iniciar gravação:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível iniciar a gravação',
        variant: 'destructive'
      })
    }
  }

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current
    
    if (!mediaRecorder || !recordingId) return

    setProcessing(true)
    
    mediaRecorder.stop()
    
    // Aguardar último chunk
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Finalizar gravação no servidor
      const response = await fetch(`/api/recordings/${recordingId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao finalizar gravação')
      }

      toast({
        title: '✅ Gravação Concluída',
        description: `Teleconsulta gravada com sucesso (${formatDuration(duration)})`,
      })

    } catch (error: unknown) {
      console.error('[Recording] Erro ao finalizar gravação:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar gravação',
        variant: 'destructive'
      })
    } finally {
      setRecording(false)
      setRecordingId(null)
      setStartTime(null)
      setDuration(0)
      setProcessing(false)
      onRecordingStateChange?.(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {recording ? (
          <>
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <Clock className="w-4 h-4" />
              <span>{formatDuration(duration)}</span>
            </div>
            
            <Button
              onClick={stopRecording}
              disabled={processing}
              variant="destructive"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              {processing ? 'Finalizando...' : 'Parar Gravação'}
            </Button>
          </>
        ) : (
          <Button
            onClick={requestConsent}
            variant="outline"
            size="sm"
          >
            <Video className="w-4 h-4 mr-2" />
            Gravar Consulta
          </Button>
        )}
      </div>

      {/* Dialog de Consentimento */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Consentimento para Gravação
            </DialogTitle>
            <DialogDescription className="space-y-4 text-left">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-2">⚠️ Informação Importante</p>
                <p>
                  A gravação de teleconsultas requer <strong>consentimento expresso do paciente</strong> 
                  conforme Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-semibold">Ao iniciar a gravação:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>O paciente foi informado sobre a gravação</li>
                  <li>O paciente autorizou expressamente a gravação</li>
                  <li>A gravação será usada apenas para fins médicos</li>
                  <li>O paciente pode solicitar exclusão a qualquer momento</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                A gravação ficará disponível apenas para o médico e o paciente.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 justify-end mt-4">
            <Button
              onClick={() => setShowConsent(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={startRecordingWithConsent}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Confirmar e Gravar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
