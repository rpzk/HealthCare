'use client';

/**
 * Formulário de Pesquisa NPS
 * 
 * Features:
 * - Escala 0-10 visual
 * - Campo de feedback opcional
 * - Recomendação (sim/não)
 * - Validação
 * - Feedback visual após envio
 */

import { useState } from 'react';
import { Star, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logger } from '@/lib/logger'

interface NpsSurveyFormProps {
  consultationId: string;
  doctorName: string;
  onSubmit?: () => void;
}

export function NpsSurveyForm({ consultationId, doctorName, onSubmit }: NpsSurveyFormProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async () => {
    if (score === null) {
      toast.error('Por favor, selecione uma nota de 0 a 10');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          score,
          feedback: feedback.trim() || undefined,
          wouldRecommend,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar pesquisa');
      }
      
      setSubmitted(true);
      toast.success('Obrigado pelo seu feedback!');
      
      if (onSubmit) {
        onSubmit();
      }
      
    } catch (error) {
      logger.error('Erro ao enviar NPS:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pesquisa');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getScoreColor = (value: number) => {
    if (value <= 6) return 'bg-red-500 hover:bg-red-600';
    if (value <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };
  
  const getScoreLabel = (value: number) => {
    if (value <= 6) return 'Precisa melhorar';
    if (value <= 8) return 'Satisfeito';
    return 'Excelente!';
  };
  
  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Star className="w-8 h-8 text-green-600 fill-green-600" />
        </div>
        
        <h3 className="text-2xl font-bold mb-2">Obrigado!</h3>
        <p className="text-slate-600">
          Seu feedback é muito importante para continuarmos melhorando nosso atendimento.
        </p>
        
        {score !== null && score >= 9 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💙 Que bom que você teve uma ótima experiência! Considere indicar nossos serviços para amigos e familiares.
            </p>
          </div>
        )}
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Como foi sua consulta?</h3>
          <p className="text-slate-600">
            Conte-nos sobre sua experiência com Dr(a). {doctorName}
          </p>
        </div>
        
        {/* Score Selection (0-10) */}
        <div>
          <Label className="mb-3 block text-center">
            Em uma escala de 0 a 10, quanto você recomendaria nossos serviços?
          </Label>
          
          <div className="flex justify-center gap-2 mb-2">
            {[...Array(11)].map((_, i) => {
              const isSelected = score === i;
              const isHovered = hoveredScore === i;
              const shouldHighlight = isSelected || isHovered;
              
              return (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  onMouseEnter={() => setHoveredScore(i)}
                  onMouseLeave={() => setHoveredScore(null)}
                  className={`
                    w-12 h-12 rounded-lg font-bold transition-all
                    ${shouldHighlight ? getScoreColor(i) + ' text-white scale-110' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}
                    ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                  `}
                >
                  {i}
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-between text-sm text-slate-500">
            <span>Nada provável</span>
            <span>Muito provável</span>
          </div>
          
          {score !== null && (
            <div className="text-center mt-3">
              <span className="inline-block px-4 py-2 rounded-full bg-slate-100 text-sm font-medium">
                {getScoreLabel(score)}
              </span>
            </div>
          )}
        </div>
        
        {/* Recomendação */}
        <div>
          <Label className="mb-3 block">
            Você recomendaria este profissional para amigos e familiares?
          </Label>
          
          <div className="flex gap-3">
            <button
              onClick={() => setWouldRecommend(true)}
              className={`
                flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                ${wouldRecommend === true 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-slate-200 hover:border-green-300'}
              `}
            >
              <ThumbsUp className="w-5 h-5" />
              Sim
            </button>
            
            <button
              onClick={() => setWouldRecommend(false)}
              className={`
                flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                ${wouldRecommend === false 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-slate-200 hover:border-red-300'}
              `}
            >
              <ThumbsDown className="w-5 h-5" />
              Não
            </button>
          </div>
        </div>
        
        {/* Feedback */}
        <div>
          <Label htmlFor="feedback" className="mb-2 block">
            Conte-nos mais sobre sua experiência (opcional)
          </Label>
          
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="O que você mais gostou? O que podemos melhorar?"
            rows={4}
            maxLength={500}
            className="resize-none"
          />
          
          <div className="text-right text-sm text-slate-500 mt-1">
            {feedback.length}/500
          </div>
        </div>
        
        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={score === null || submitting}
          className="w-full"
          size="lg"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Enviando...' : 'Enviar Avaliação'}
        </Button>
      </div>
    </Card>
  );
}
