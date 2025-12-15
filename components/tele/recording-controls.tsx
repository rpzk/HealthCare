'use client';

/**
 * Controles de Gravação de Teleconsulta
 * 
 * Features:
 * - Gravação automática de áudio + vídeo
 * - Controles manuais (iniciar/pausar/parar)
 * - Indicador visual de gravação
 * - Upload automático ao finalizar
 * - Suporte a múltiplos formatos (WebM, MP4)
 */

import { useState, useRef, useEffect } from 'react';
import { Video, Square, Pause, Play, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RecordingControlsProps {
  consultationId: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  autoStart?: boolean;
  onRecordingComplete?: (recordingId: string) => void;
}

export function RecordingControls({
  consultationId,
  localStream,
  remoteStream,
  autoStart = false,
  onRecordingComplete,
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Formatar duração (HH:MM:SS)
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  // Combinar streams local e remoto
  const getCombinedStream = () => {
    // Criar canvas para combinar vídeos
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    
    // Criar elementos de vídeo
    const localVideo = document.createElement('video');
    const remoteVideo = document.createElement('video');
    
    if (localStream) {
      localVideo.srcObject = localStream;
      localVideo.play();
    }
    
    if (remoteStream) {
      remoteVideo.srcObject = remoteStream;
      remoteVideo.play();
    }
    
    // Desenhar frames combinados
    const drawFrame = () => {
      // Vídeo remoto (principal) - tela cheia
      if (remoteStream) {
        ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
      }
      
      // Vídeo local (PiP) - canto inferior direito
      if (localStream) {
        const pipWidth = 320;
        const pipHeight = 180;
        const pipX = canvas.width - pipWidth - 20;
        const pipY = canvas.height - pipHeight - 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(pipX - 5, pipY - 5, pipWidth + 10, pipHeight + 10);
        ctx.drawImage(localVideo, pipX, pipY, pipWidth, pipHeight);
      }
      
      if (isRecording && !isPaused) {
        requestAnimationFrame(drawFrame);
      }
    };
    
    drawFrame();
    
    // Capturar stream do canvas
    const canvasStream = canvas.captureStream(30); // 30 FPS
    
    // Adicionar áudio dos dois streams
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    
    if (localStream) {
      const localAudio = audioContext.createMediaStreamSource(localStream);
      localAudio.connect(destination);
    }
    
    if (remoteStream) {
      const remoteAudio = audioContext.createMediaStreamSource(remoteStream);
      remoteAudio.connect(destination);
    }
    
    // Combinar vídeo do canvas com áudio mixado
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);
    
    return combinedStream;
  };
  
  // Iniciar gravação
  const startRecording = () => {
    try {
      recordedChunksRef.current = [];
      startTimeRef.current = new Date();
      
      // Obter stream combinado
      const stream = getCombinedStream();
      
      // Criar MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.start(1000); // Chunk a cada 1 segundo
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Timer para atualizar duração
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast.success('Gravação iniciada');
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Erro ao iniciar gravação');
    }
  };
  
  // Pausar/retomar gravação
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      toast.info('Gravação retomada');
    } else {
      mediaRecorderRef.current.pause();
      toast.info('Gravação pausada');
    }
    
    setIsPaused(!isPaused);
  };
  
  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setIsRecording(false);
      setIsPaused(false);
    }
  };
  
  // Processar gravação finalizada
  const handleRecordingStop = async () => {
    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    
    // Upload automático
    await uploadRecording(blob);
  };
  
  // Upload da gravação
  const uploadRecording = async (blob: Blob) => {
    if (!startTimeRef.current) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('video', blob, `recording-${consultationId}.webm`);
      formData.append('consultationId', consultationId);
      formData.append('duration', recordingDuration.toString());
      formData.append('startedAt', startTimeRef.current.toISOString());
      formData.append('endedAt', new Date().toISOString());
      formData.append('resolution', '1280x720');
      
      const response = await fetch('/api/tele/recording', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao fazer upload da gravação');
      }
      
      const data = await response.json();
      
      toast.success('Gravação salva com sucesso');
      
      if (onRecordingComplete) {
        onRecordingComplete(data.recording.id);
      }
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao salvar gravação');
      
      // Download local como fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consulta-${consultationId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.info('Gravação salva localmente');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Auto-start se configurado
  useEffect(() => {
    if (autoStart && localStream && remoteStream && !isRecording) {
      // Aguardar 2 segundos antes de iniciar
      setTimeout(() => {
        startRecording();
      }, 2000);
    }
  }, [autoStart, localStream, remoteStream]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
      {/* Indicador de gravação */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm font-mono text-white">
              {formatDuration(recordingDuration)}
            </span>
          </div>
          {isPaused && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              PAUSADO
            </Badge>
          )}
        </div>
      )}
      
      {/* Controles */}
      <div className="flex gap-2">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={!localStream || !remoteStream || isUploading}
            variant="destructive"
            size="sm"
          >
            <Video className="w-4 h-4 mr-2" />
            Iniciar Gravação
          </Button>
        ) : (
          <>
            <Button
              onClick={togglePause}
              variant="outline"
              size="sm"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Retomar
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </>
              )}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Parar
            </Button>
          </>
        )}
      </div>
      
      {/* Status de upload */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <Upload className="w-4 h-4 animate-pulse" />
          Enviando gravação...
        </div>
      )}
      
      {/* Aviso se streams não disponíveis */}
      {(!localStream || !remoteStream) && !isRecording && (
        <div className="flex items-center gap-2 text-sm text-yellow-400">
          <AlertCircle className="w-4 h-4" />
          Aguardando conexão de vídeo
        </div>
      )}
    </div>
  );
}
