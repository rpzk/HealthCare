'use client';

/**
 * Componente de Compartilhamento de Tela para Teleconsulta
 * 
 * Features:
 * - Captura de tela do usuário
 * - Toggle on/off
 * - Indicador visual quando compartilhando
 * - Suporte a múltiplos monitores
 * - Preview da tela compartilhada
 */

import { useState, useRef, useEffect } from 'react';
import { Monitor, MonitorOff, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ScreenShareProps {
  onStreamChange?: (stream: MediaStream | null) => void;
  showPreview?: boolean;
}

export function ScreenShare({ onStreamChange, showPreview = true }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showLocalPreview, setShowLocalPreview] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const startScreenShare = async () => {
    try {
      // Solicitar permissão para capturar tela
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      } as DisplayMediaStreamOptions);
      
      setStream(screenStream);
      setIsSharing(true);
      
      // Notificar componente pai
      if (onStreamChange) {
        onStreamChange(screenStream);
      }
      
      // Exibir preview local
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }
      
      // Detectar quando usuário para o compartilhamento pelo navegador
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
      
      toast.success('Compartilhamento de tela iniciado');
      
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Permissão para compartilhar tela negada');
        } else if (error.name === 'NotFoundError') {
          toast.error('Nenhuma tela disponível para compartilhar');
        } else {
          toast.error('Erro ao iniciar compartilhamento de tela');
        }
      }
    }
  };
  
  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsSharing(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Notificar componente pai
    if (onStreamChange) {
      onStreamChange(null);
    }
    
    toast.info('Compartilhamento de tela encerrado');
  };
  
  const toggleShare = () => {
    if (isSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };
  
  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleShare}
          variant={isSharing ? 'destructive' : 'outline'}
          size="sm"
        >
          {isSharing ? (
            <>
              <MonitorOff className="w-4 h-4 mr-2" />
              Parar Compartilhamento
            </>
          ) : (
            <>
              <Monitor className="w-4 h-4 mr-2" />
              Compartilhar Tela
            </>
          )}
        </Button>
        
        {isSharing && (
          <Badge variant="outline" className="animate-pulse border-blue-500 text-blue-600">
            Compartilhando
          </Badge>
        )}
        
        {isSharing && showPreview && (
          <Button
            onClick={() => setShowLocalPreview(!showLocalPreview)}
            variant="ghost"
            size="sm"
          >
            {showLocalPreview ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar Preview
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Preview local */}
      {isSharing && showPreview && showLocalPreview && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg border-2 border-blue-500 bg-black"
          />
          
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-600">
              Você está compartilhando esta tela
            </Badge>
          </div>
        </div>
      )}
      
      {/* Dica quando não está compartilhando */}
      {!isSharing && (
        <div className="text-sm text-slate-500">
          <p>💡 Dica: Use o compartilhamento de tela para mostrar exames, resultados ou documentos durante a consulta.</p>
        </div>
      )}
    </div>
  );
}
