'use client';

/**
 * Página de Diagnóstico WebRTC
 * 
 * Testa:
 * - Câmera e microfone
 * - Conectividade STUN/TURN
 * - Latência de rede
 * - Qualidade de conexão
 * - Compatibilidade do navegador
 */

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Wifi, Monitor, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function WebRTCDiagnostics() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Câmera', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Microfone', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Servidor STUN', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Servidor TURN', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Latência de Rede', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Compatibilidade do Navegador', status: 'pending', message: 'Aguardando teste...' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };
  
  // Teste de câmera
  const testCamera = async (): Promise<void> => {
    updateTest(0, { status: 'running', message: 'Testando câmera...' });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const videoTracks = stream.getVideoTracks();
      const settings = videoTracks[0].getSettings();
      
      updateTest(0, {
        status: 'success',
        message: 'Câmera funcionando',
        details: `${settings.width}x${settings.height} @ ${settings.frameRate}fps`,
      });
      
      // Parar stream após 2 segundos
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
      
    } catch (error) {
      updateTest(0, {
        status: 'error',
        message: 'Falha ao acessar câmera',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
  
  // Teste de microfone
  const testMicrophone = async (): Promise<void> => {
    updateTest(1, { status: 'running', message: 'Testando microfone...' });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Criar contexto de áudio para análise
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Analisar volume por 2 segundos
      let maxVolume = 0;
      const checkVolume = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        maxVolume = Math.max(maxVolume, average);
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkVolume);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
        if (maxVolume > 10) {
          updateTest(1, {
            status: 'success',
            message: 'Microfone funcionando',
            details: `Nível detectado: ${Math.round(maxVolume)}/255`,
          });
        } else {
          updateTest(1, {
            status: 'error',
            message: 'Microfone sem sinal',
            details: 'Fale algo para testar o microfone',
          });
        }
      }, 2000);
      
    } catch (error) {
      updateTest(1, {
        status: 'error',
        message: 'Falha ao acessar microfone',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
  
  // Teste de STUN
  const testSTUN = async (): Promise<void> => {
    updateTest(2, { status: 'running', message: 'Testando servidor STUN...' });
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      
      pc.createDataChannel('test');
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Esperar candidates
      const candidates: RTCIceCandidate[] = [];
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate);
        }
      };
      
      setTimeout(() => {
        pc.close();
        
        const srflxCandidates = candidates.filter(c => c.type === 'srflx');
        
        if (srflxCandidates.length > 0) {
          updateTest(2, {
            status: 'success',
            message: 'Servidor STUN acessível',
            details: `${srflxCandidates.length} candidates encontrados`,
          });
        } else {
          updateTest(2, {
            status: 'error',
            message: 'Servidor STUN inacessível',
            details: 'Verifique configuração de firewall',
          });
        }
      }, 3000);
      
    } catch (error) {
      updateTest(2, {
        status: 'error',
        message: 'Erro ao testar STUN',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
  
  // Teste de TURN
  const testTURN = async (): Promise<void> => {
    updateTest(3, { status: 'running', message: 'Testando servidor TURN...' });
    
    try {
      const iceConfig = process.env.NEXT_PUBLIC_ICE || '';
      const turnServers = iceConfig.split(';').filter(s => s.startsWith('turn:'));
      
      if (turnServers.length === 0) {
        updateTest(3, {
          status: 'error',
          message: 'Servidor TURN não configurado',
          details: 'Configure NEXT_PUBLIC_ICE no .env',
        });
        return;
      }
      
      // Parse primeiro servidor TURN
      const [url, username, password] = turnServers[0].split(',');
      
      const pc = new RTCPeerConnection({
        iceServers: [{
          urls: url,
          username: username?.trim(),
          credential: password?.trim(),
        }],
      });
      
      pc.createDataChannel('test');
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const candidates: RTCIceCandidate[] = [];
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate);
        }
      };
      
      setTimeout(() => {
        pc.close();
        
        const relayCandidates = candidates.filter(c => c.type === 'relay');
        
        if (relayCandidates.length > 0) {
          updateTest(3, {
            status: 'success',
            message: 'Servidor TURN acessível',
            details: `${relayCandidates.length} relay candidates`,
          });
        } else {
          updateTest(3, {
            status: 'error',
            message: 'Servidor TURN inacessível',
            details: 'Verifique credenciais e firewall',
          });
        }
      }, 5000);
      
    } catch (error) {
      updateTest(3, {
        status: 'error',
        message: 'Erro ao testar TURN',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
  
  // Teste de latência
  const testLatency = async (): Promise<void> => {
    updateTest(4, { status: 'running', message: 'Medindo latência...' });
    
    try {
      const start = performance.now();
      await fetch('/api/health');
      const latency = performance.now() - start;
      
      let status: 'success' | 'error' = 'success';
      let message = '';
      
      if (latency < 50) {
        message = 'Excelente';
      } else if (latency < 150) {
        message = 'Boa';
      } else if (latency < 300) {
        message = 'Aceitável';
      } else {
        message = 'Alta - pode afetar qualidade';
        status = 'error';
      }
      
      updateTest(4, {
        status,
        message: `Latência: ${Math.round(latency)}ms`,
        details: message,
      });
      
    } catch (error) {
      updateTest(4, {
        status: 'error',
        message: 'Erro ao medir latência',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };
  
  // Teste de compatibilidade
  const testBrowserCompatibility = async (): Promise<void> => {
    updateTest(5, { status: 'running', message: 'Verificando navegador...' });
    
    const features = {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      RTCPeerConnection: !!window.RTCPeerConnection,
      getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
      mediaRecorder: !!window.MediaRecorder,
    };
    
    const allSupported = Object.values(features).every(v => v);
    
    updateTest(5, {
      status: allSupported ? 'success' : 'error',
      message: allSupported ? 'Navegador compatível' : 'Navegador incompatível',
      details: Object.entries(features)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature)
        .join(', ') || 'Todas as features suportadas',
    });
  };
  
  // Executar todos os testes
  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    const testsToRun = [
      testCamera,
      testMicrophone,
      testSTUN,
      testTURN,
      testLatency,
      testBrowserCompatibility,
    ];
    
    for (let i = 0; i < testsToRun.length; i++) {
      setCurrentTest(i);
      setProgress(((i + 1) / testsToRun.length) * 100);
      await testsToRun[i]();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">FALHA</Badge>;
      case 'running':
        return <Badge className="bg-blue-600">TESTANDO...</Badge>;
      default:
        return <Badge variant="outline">PENDENTE</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Telemedicina</h1>
        <p className="text-slate-600">
          Verifique se seu dispositivo está pronto para teleconsultas
        </p>
      </div>
      
      {/* Vídeo preview */}
      <Card className="p-4 mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-lg bg-black"
        />
      </Card>
      
      {/* Progresso */}
      {isRunning && (
        <div className="mb-6">
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-slate-600 text-center">
            Executando testes... {Math.round(progress)}%
          </p>
        </div>
      )}
      
      {/* Resultados dos testes */}
      <div className="space-y-3 mb-6">
        {tests.map((test, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              {getStatusIcon(test.status)}
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{test.name}</h3>
                  {getStatusBadge(test.status)}
                </div>
                
                <p className="text-sm text-slate-600">{test.message}</p>
                
                {test.details && (
                  <p className="text-xs text-slate-500 mt-1">{test.details}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Botão de executar */}
      <Button
        onClick={runAllTests}
        disabled={isRunning}
        className="w-full"
        size="lg"
      >
        <Monitor className="w-5 h-5 mr-2" />
        {isRunning ? 'Executando Testes...' : 'Executar Diagnóstico'}
      </Button>
    </div>
  );
}
