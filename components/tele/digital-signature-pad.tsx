'use client';

/**
 * Componente de assinatura manuscrita (desenho) para Teleconsulta
 * 
 * Features:
 * - Canvas para desenhar assinatura
 * - Controles de limpar e confirmar
 * - Export como imagem (blob)
 * - Salvar anexado ao registro médico
 * - Validação de assinatura vazia
 */

import { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { logger } from '@/lib/logger'

interface DigitalSignaturePadProps {
  consultationId: string;
  onSave?: (signatureBlob: Blob) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalSignaturePad({
  consultationId,
  onSave,
  isOpen,
  onClose,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Inicializar canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Configurar tamanho do canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2x para alta resolução
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // Configurar estilo de desenho
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
  }, [isOpen]);
  
  // Funções de desenho
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setHasSignature(true);
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  // Limpar canvas
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
  };
  
  // Salvar assinatura
  const saveSignature = async () => {
    if (!hasSignature) {
      toast.error('Por favor, assine antes de confirmar');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSaving(true);
    
    try {
      // Converter canvas para blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter assinatura'));
          }
        }, 'image/png');
      });
      
      // Upload da assinatura
      const formData = new FormData();
      formData.append('signature', blob, `signature-${consultationId}.png`);
      formData.append('consultationId', consultationId);
      
      const response = await fetch('/api/tele/signature', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao salvar assinatura');
      }
      
      const data = await response.json();
      
      toast.success('Assinatura salva com sucesso');
      
      if (onSave) {
        onSave(blob);
      }
      
      onClose();
      
    } catch (error) {
      logger.error('Erro ao salvar assinatura:', error);
      toast.error('Erro ao salvar assinatura');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assinatura (desenho)</DialogTitle>
          <DialogDescription>
            Por favor, assine no espaço abaixo utilizando o mouse ou touchscreen
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Canvas */}
          <Card className="p-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border-2 border-dashed border-slate-300 rounded cursor-crosshair w-full"
              style={{ touchAction: 'none' }}
            />
            
            <div className="text-center mt-3 text-sm text-slate-500">
              <Pencil className="w-4 h-4 inline mr-1" />
              Desenhe sua assinatura acima
            </div>
          </Card>
          
          {/* Controles */}
          <div className="flex gap-3">
            <Button
              onClick={clearSignature}
              variant="outline"
              className="flex-1"
              disabled={!hasSignature || saving}
            >
              <Eraser className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              onClick={saveSignature}
              className="flex-1"
              disabled={!hasSignature || saving}
            >
              <Check className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Botão para abrir modal de assinatura
 */
interface SignatureButtonProps {
  consultationId: string;
  onSignatureSaved?: (blob: Blob) => void;
}

export function SignatureButton({ consultationId, onSignatureSaved }: SignatureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
      >
        <Pencil className="w-4 h-4 mr-2" />
        Assinar (desenho)
      </Button>
      
      <DigitalSignaturePad
        consultationId={consultationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={onSignatureSaved}
      />
    </>
  );
}
