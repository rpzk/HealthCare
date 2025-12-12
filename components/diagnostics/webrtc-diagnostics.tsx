'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Loader2, Video, Mic, Wifi, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TestStatus = 'idle' | 'running' | 'success' | 'warning' | 'error'

interface TestResult {
  name: string
  status: TestStatus
  message: string
  details?: string
}

export function WebRTCDiagnostics() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [overallStatus, setOverallStatus] = useState<'good' | 'warning' | 'error' | null>(null)

  const updateResult = (name: string, status: TestStatus, message: string, details?: string) => {
    setResults(prev => {
      const filtered = prev.filter(r => r.name !== name)
      return [...filtered, { name, status, message, details }]
    })
  }

  const runDiagnostics = async () => {
    setRunning(true)
    setResults([])
    setOverallStatus(null)

    // Test 1: Browser compatibility
    updateResult('browser', 'running', 'Verificando compatibilidade do navegador...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const hasRTCPeerConnection = !!(window as any).RTCPeerConnection
    
    if (hasWebRTC && hasRTCPeerConnection) {
      updateResult('browser', 'success', '✓ Navegador compatível', 
        `${navigator.userAgent.split(' ').slice(-2).join(' ')}`)
    } else {
      updateResult('browser', 'error', '✗ Navegador não suporta WebRTC',
        'Use Chrome, Firefox, Safari ou Edge atualizados')
      setRunning(false)
      setOverallStatus('error')
      return
    }

    // Test 2: Camera access
    updateResult('camera', 'running', 'Testando acesso à câmera...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTracks = stream.getVideoTracks()
      
      updateResult('camera', 'success', '✓ Câmera detectada',
        `${videoTracks[0]?.label || 'Câmera disponível'}`)
      
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        updateResult('camera', 'error', '✗ Permissão negada',
          'Você precisa permitir acesso à câmera')
      } else if (error.name === 'NotFoundError') {
        updateResult('camera', 'warning', '⚠ Câmera não encontrada',
          'Nenhuma câmera detectada no dispositivo')
      } else {
        updateResult('camera', 'error', '✗ Erro ao acessar câmera',
          error.message)
      }
    }

    // Test 3: Microphone access
    updateResult('microphone', 'running', 'Testando acesso ao microfone...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioTracks = stream.getAudioTracks()
      
      updateResult('microphone', 'success', '✓ Microfone detectado',
        `${audioTracks[0]?.label || 'Microfone disponível'}`)
      
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        updateResult('microphone', 'error', '✗ Permissão negada',
          'Você precisa permitir acesso ao microfone')
      } else if (error.name === 'NotFoundError') {
        updateResult('microphone', 'warning', '⚠ Microfone não encontrado',
          'Nenhum microfone detectado no dispositivo')
      } else {
        updateResult('microphone', 'error', '✗ Erro ao acessar microfone',
          error.message)
      }
    }

    // Test 4: Network connectivity
    updateResult('network', 'running', 'Testando conectividade de rede...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const online = navigator.onLine
      if (!online) {
        updateResult('network', 'error', '✗ Sem conexão com internet',
          'Verifique sua conexão')
      } else {
        // Test actual connectivity
        const response = await fetch('/api/health', { method: 'HEAD' })
        if (response.ok) {
          updateResult('network', 'success', '✓ Conexão estável',
            'Internet funcionando normalmente')
        } else {
          updateResult('network', 'warning', '⚠ Conexão instável',
            `Status: ${response.status}`)
        }
      }
    } catch (error: any) {
      updateResult('network', 'error', '✗ Erro de conectividade',
        error.message)
    }

    // Test 5: STUN/TURN servers
    updateResult('ice', 'running', 'Testando servidores STUN/TURN...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      // Get ICE config
      const configRes = await fetch('/api/tele/config')
      const config = await configRes.json()
      
      const pc = new RTCPeerConnection({ 
        iceServers: config.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      let hasRelay = false
      let hasSrflx = false
      let hasHost = false

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const type = event.candidate.type
          if (type === 'relay') hasRelay = true
          if (type === 'srflx') hasSrflx = true
          if (type === 'host') hasHost = true
        }
      }

      // Create offer to trigger ICE gathering
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 3000)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve()
          }
        }
      })

      pc.close()

      let message = ''
      let details = ''
      let status: TestStatus = 'success'

      if (hasRelay) {
        message = '✓ TURN server funcionando'
        details = 'Relay candidates detectados - Funciona atrás de firewall'
        status = 'success'
      } else if (hasSrflx) {
        message = '⚠ Apenas STUN disponível'
        details = 'Funciona na maioria das redes, mas pode falhar em firewalls corporativos'
        status = 'warning'
      } else if (hasHost) {
        message = '⚠ Apenas host candidates'
        details = 'Funciona apenas na mesma rede local'
        status = 'warning'
      } else {
        message = '✗ Falha ao obter ICE candidates'
        details = 'Pode haver problema de firewall ou configuração'
        status = 'error'
      }

      updateResult('ice', status, message, details)
    } catch (error: any) {
      updateResult('ice', 'error', '✗ Erro ao testar ICE',
        error.message)
    }

    // Test 6: SSL/TLS (required for getUserMedia)
    updateResult('ssl', 'running', 'Verificando conexão segura...', '')
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (isSecure) {
      updateResult('ssl', 'success', '✓ Conexão segura (HTTPS)',
        'Protocolo seguro habilitado')
    } else {
      updateResult('ssl', 'warning', '⚠ Conexão não segura (HTTP)',
        'getUserMedia pode não funcionar em alguns navegadores')
    }

    setRunning(false)

    // Calculate overall status
    setTimeout(() => {
      const hasError = results.some(r => r.status === 'error')
      const hasWarning = results.some(r => r.status === 'warning')
      
      if (hasError) {
        setOverallStatus('error')
      } else if (hasWarning) {
        setOverallStatus('warning')
      } else {
        setOverallStatus('good')
      }
    }, 100)
  }

  const StatusIcon = ({ status }: { status: TestStatus }) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'camera': return <Video className="w-5 h-5" />
      case 'microphone': return <Mic className="w-5 h-5" />
      case 'network': return <Wifi className="w-5 h-5" />
      case 'ice': return <Globe className="w-5 h-5" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button
          onClick={runDiagnostics}
          disabled={running}
          size="lg"
          className="px-8"
        >
          {running ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Executando testes...
            </>
          ) : (
            'Iniciar Diagnóstico'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map(result => (
            <Card key={result.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={result.status} />
                  {getIcon(result.name)}
                  <div className="flex-1">
                    <CardTitle className="text-base">{result.message}</CardTitle>
                    {result.details && (
                      <CardDescription className="text-sm mt-1">
                        {result.details}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {overallStatus && (
        <Card className={`border-2 ${
          overallStatus === 'good' ? 'border-green-500 bg-green-50' :
          overallStatus === 'warning' ? 'border-amber-500 bg-amber-50' :
          'border-red-500 bg-red-50'
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${
              overallStatus === 'good' ? 'text-green-700' :
              overallStatus === 'warning' ? 'text-amber-700' :
              'text-red-700'
            }`}>
              {overallStatus === 'good' && <CheckCircle2 className="w-6 h-6" />}
              {overallStatus === 'warning' && <AlertCircle className="w-6 h-6" />}
              {overallStatus === 'error' && <XCircle className="w-6 h-6" />}
              
              {overallStatus === 'good' && 'Tudo Pronto para Teleconsultas!'}
              {overallStatus === 'warning' && 'Teleconsultas Possíveis com Limitações'}
              {overallStatus === 'error' && 'Problemas Detectados'}
            </CardTitle>
            <CardDescription className="text-sm mt-2">
              {overallStatus === 'good' && (
                'Seu dispositivo está totalmente configurado. Você pode iniciar videochamadas sem problemas.'
              )}
              {overallStatus === 'warning' && (
                'Seu dispositivo funciona, mas pode ter problemas em algumas redes (ex: firewall corporativo). Se tiver dificuldades, tente outra rede.'
              )}
              {overallStatus === 'error' && (
                'Corrija os problemas identificados acima antes de tentar uma teleconsulta.'
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">💡 Dicas:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use Chrome ou Firefox para melhor compatibilidade</li>
          <li>Certifique-se de estar em rede WiFi estável ou 4G/5G</li>
          <li>Feche outros aplicativos que usam câmera/microfone</li>
          <li>Se estiver em rede corporativa, pode ser necessário VPN ou rede doméstica</li>
        </ul>
      </div>
    </div>
  )
}
