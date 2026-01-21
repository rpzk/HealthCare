'use client';

/**
 * Componente de Sala de Espera Virtual
 * 
 * Features:
 * - Lista de pacientes esperando
 * - Indicador de posição na fila
 * - Estimativa de tempo de espera
 * - Notificação automática de pacientes
 * - Indicadores visuais de prioridade
 */

import { useCallback, useEffect, useState } from 'react';
import { Clock, Users, Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger'

interface WaitingPatient {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  joinedAt: Date;
  priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  estimatedWaitMinutes?: number;
}

interface WaitingRoomProps {
  doctorId: string;
  viewMode: 'doctor' | 'patient';
  patientAppointmentId?: string;
  onPatientCalled?: () => void;
}

export function WaitingRoom({
  doctorId,
  viewMode,
  patientAppointmentId,
  onPatientCalled,
}: WaitingRoomProps) {
  const [patients, setPatients] = useState<WaitingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<string | null>(null);
  
  // Buscar pacientes na fila
  const fetchWaitingPatients = useCallback(async () => {
    try {
      const response = await fetch(`/api/tele/waiting-room?doctorId=${doctorId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar fila de espera');
      }
      
      const data = await response.json();
      setPatients(data.patients.map((p: any) => ({
        ...p,
        joinedAt: new Date(p.joinedAt),
      })));
      
    } catch (error) {
      logger.error('Erro ao buscar fila:', error);
      toast.error('Erro ao carregar fila de espera');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);
  
  // Notificar próximo paciente
  const notifyPatient = async (appointmentId: string) => {
    setNotifying(appointmentId);
    
    try {
      const response = await fetch('/api/tele/waiting-room/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, doctorId }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao notificar paciente');
      }
      
      toast.success('Paciente notificado com sucesso!');
      
      // Atualizar lista
      await fetchWaitingPatients();
      
    } catch (error) {
      logger.error('Erro ao notificar:', error);
      toast.error('Erro ao notificar paciente');
    } finally {
      setNotifying(null);
    }
  };
  
  // Atualizar a cada 10 segundos
  useEffect(() => {
    void fetchWaitingPatients();
    
    const interval = setInterval(() => {
      void fetchWaitingPatients();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchWaitingPatients]);
  
  // Formatar tempo de espera
  const formatWaitTime = (minutes?: number) => {
    if (!minutes) return 'Calculando...';
    
    if (minutes < 1) return 'Agora';
    if (minutes === 1) return '1 minuto';
    if (minutes < 60) return `${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h ${mins}min`;
  };
  
  // Badge de prioridade
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return <Badge variant="destructive">EMERGÊNCIA</Badge>;
      case 'URGENT':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">URGENTE</Badge>;
      default:
        return <Badge variant="secondary">NORMAL</Badge>;
    }
  };
  
  // Calcular tempo desde que entrou
  const getWaitingTime = (joinedAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - joinedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    return formatWaitTime(diffMins);
  };
  
  // Visão do paciente
  if (viewMode === 'patient') {
    const myPosition = patients.findIndex(
      p => p.appointmentId === patientAppointmentId
    );
    
    const myData = patients[myPosition];
    
    if (myPosition === -1) {
      return (
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Você não está na fila de espera</p>
        </Card>
      );
    }
    
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold mb-2">
              {myPosition === 0 ? 'Você é o próximo!' : `Posição na fila: ${myPosition + 1}`}
            </h3>
            
            {myData.estimatedWaitMinutes !== undefined && (
              <p className="text-slate-600">
                Tempo estimado: <strong>{formatWaitTime(myData.estimatedWaitMinutes)}</strong>
              </p>
            )}
            
            <p className="text-sm text-slate-500 mt-2">
              Na fila há: {getWaitingTime(myData.joinedAt)}
            </p>
          </div>
          
          {myData.priority !== 'NORMAL' && (
            <div className="flex justify-center">
              {getPriorityBadge(myData.priority)}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <p className="text-sm text-slate-600">
              <Users className="w-4 h-4 inline mr-1" />
              {patients.length} {patients.length === 1 ? 'pessoa' : 'pessoas'} na fila
            </p>
          </div>
          
          {myPosition === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 text-sm">
                O médico irá chamá-lo em breve. Mantenha-se conectado!
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  // Visão do médico
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Sala de Espera</h3>
          <p className="text-sm text-slate-600">
            {patients.length} {patients.length === 1 ? 'paciente aguardando' : 'pacientes aguardando'}
          </p>
        </div>
        
        <Button
          onClick={fetchWaitingPatients}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          Atualizar
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          Carregando...
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Nenhum paciente na fila</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient, index) => (
            <div
              key={patient.appointmentId}
              className={`p-4 rounded-lg border transition-colors ${
                index === 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-900">
                      {index + 1}. {patient.patientName}
                    </span>
                    {getPriorityBadge(patient.priority)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Esperando: {getWaitingTime(patient.joinedAt)}
                    </span>
                    
                    {patient.estimatedWaitMinutes !== undefined && index > 0 && (
                      <span>
                        Estimativa: {formatWaitTime(patient.estimatedWaitMinutes)}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={() => notifyPatient(patient.appointmentId)}
                  disabled={notifying === patient.appointmentId}
                  variant={index === 0 ? 'default' : 'outline'}
                  size="sm"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {notifying === patient.appointmentId ? 'Notificando...' : 'Chamar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
