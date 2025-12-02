'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight,
  Play,
  Home,
  Users,
  Video,
  Shield,
  Smartphone,
  Heart,
  Stethoscope,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

interface Slide {
  id: number
  title: string
  subtitle?: string
  content: React.ReactNode
  background?: string
}

const slides: Slide[] = [
  {
    id: 1,
    title: 'HealthCare',
    subtitle: 'Sistema de Prontuário Eletrônico com IA',
    background: 'bg-gradient-to-br from-blue-600 to-cyan-500',
    content: (
      <div className="text-center text-white space-y-6">
        <div className="text-6xl mb-8">🏥</div>
        <h1 className="text-5xl font-bold">HealthCare</h1>
        <p className="text-2xl opacity-90">Sistema de Prontuário Eletrônico com IA</p>
        <div className="flex justify-center gap-4 mt-8">
          <Badge className="bg-white/20 text-white text-lg px-4 py-2">Teleconsulta</Badge>
          <Badge className="bg-white/20 text-white text-lg px-4 py-2">LGPD</Badge>
          <Badge className="bg-white/20 text-white text-lg px-4 py-2">IA Embarcada</Badge>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'O Problema',
    background: 'bg-gradient-to-br from-red-500 to-orange-500',
    content: (
      <div className="text-white space-y-8 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center">O Problema</h2>
        <div className="grid gap-6">
          {[
            { icon: '📋', text: 'Prontuários em papel desorganizados' },
            { icon: '🔒', text: 'Dados sensíveis sem proteção adequada' },
            { icon: '🚗', text: 'Pacientes precisam se deslocar para consultas simples' },
            { icon: '⏰', text: 'Médicos perdem tempo com burocracia' },
            { icon: '📊', text: 'Falta de dados para tomada de decisão' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 text-xl bg-white/10 p-4 rounded-lg">
              <span className="text-3xl">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: 'A Solução',
    background: 'bg-gradient-to-br from-green-500 to-emerald-500',
    content: (
      <div className="text-white space-y-8 max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center">A Solução</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Stethoscope className="h-12 w-12" />, title: 'Prontuário Digital', desc: 'Tudo em um só lugar, acessível de qualquer dispositivo' },
            { icon: <Video className="h-12 w-12" />, title: 'Teleconsulta', desc: 'Videochamada integrada com qualidade profissional' },
            { icon: <Shield className="h-12 w-12" />, title: 'LGPD Compliant', desc: 'Paciente no controle dos seus dados' },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 p-6 rounded-xl text-center space-y-4">
              <div className="flex justify-center">{item.icon}</div>
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="opacity-90">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: 'Funcionalidades',
    background: 'bg-gradient-to-br from-purple-600 to-pink-500',
    content: (
      <div className="text-white space-y-6 max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center">Funcionalidades Principais</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '📋', title: 'Prontuário Eletrônico', features: ['Histórico completo', 'Anexos e exames', 'Busca inteligente'] },
            { icon: '📹', title: 'Teleconsulta', features: ['Videochamada HD', 'Compartilhar tela', 'Gravação opcional'] },
            { icon: '💊', title: 'Prescrição Digital', features: ['Assinatura digital', 'Envio por WhatsApp', 'Histórico de medicamentos'] },
            { icon: '📊', title: 'Relatórios e BI', features: ['Dashboard em tempo real', 'Indicadores de saúde', 'Exportação de dados'] },
            { icon: '⌚', title: 'Dispositivos Wearables', features: ['Apple Watch / Fitbit', 'Medidores de pressão', 'Glicosímetros'] },
            { icon: '🤖', title: 'IA Embarcada', features: ['Transcrição de consultas', 'Sugestões de diagnóstico', 'Alertas inteligentes'] },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="font-bold text-lg">{item.title}</h3>
              </div>
              <ul className="space-y-1 text-sm opacity-90">
                {item.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: 'Experiência do Paciente',
    background: 'bg-gradient-to-br from-cyan-500 to-blue-500',
    content: (
      <div className="text-white space-y-8 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center">Experiência do Paciente</h2>
        <div className="space-y-4">
          {[
            { step: 1, title: 'Recebe convite', desc: 'Link ou QR Code pelo WhatsApp' },
            { step: 2, title: 'Aceita termos LGPD', desc: 'Escolhe quais dados compartilhar' },
            { step: 3, title: 'Cria sua conta', desc: 'Cadastro simples e rápido' },
            { step: 4, title: 'Acessa de qualquer lugar', desc: 'Web ou app mobile' },
            { step: 5, title: 'Controla sua privacidade', desc: 'Revoga permissões a qualquer momento' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-white/10 p-4 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg">
                {item.step}
              </div>
              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm opacity-90">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: 'LGPD e Segurança',
    background: 'bg-gradient-to-br from-slate-700 to-slate-900',
    content: (
      <div className="text-white space-y-8 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center flex items-center justify-center gap-3">
          <Shield className="h-10 w-10" /> LGPD e Segurança
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 p-6 rounded-xl space-y-4">
            <h3 className="text-xl font-bold">Conformidade LGPD</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Consentimento explícito</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Direito ao esquecimento</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Portabilidade de dados</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Auditoria completa</li>
            </ul>
          </div>
          <div className="bg-white/10 p-6 rounded-xl space-y-4">
            <h3 className="text-xl font-bold">Segurança</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Criptografia ponta-a-ponta</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> 2FA obrigatório</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Logs de acesso</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" /> Backup automático</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: 'Demonstração',
    background: 'bg-gradient-to-br from-amber-500 to-orange-500',
    content: (
      <div className="text-white space-y-8 max-w-3xl mx-auto text-center">
        <h2 className="text-4xl font-bold">Demonstração ao Vivo</h2>
        <div className="text-6xl">🎬</div>
        <p className="text-xl opacity-90">
          Vamos fazer uma demonstração prática do sistema,<br />
          onde você será o paciente e depois invertemos os papéis!
        </p>
        <div className="flex justify-center gap-4 mt-8">
          <div className="bg-white/20 p-6 rounded-xl">
            <Smartphone className="h-12 w-12 mx-auto mb-2" />
            <p className="font-medium">Você como Paciente</p>
          </div>
          <div className="flex items-center">
            <ArrowRight className="h-8 w-8" />
          </div>
          <div className="bg-white/20 p-6 rounded-xl">
            <Stethoscope className="h-12 w-12 mx-auto mb-2" />
            <p className="font-medium">Você como Médico</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 8,
    title: 'Próximos Passos',
    background: 'bg-gradient-to-br from-blue-600 to-purple-600',
    content: (
      <div className="text-white space-y-8 max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center">Próximos Passos</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 p-6 rounded-xl text-center space-y-4">
            <div className="text-5xl">🆓</div>
            <h3 className="text-xl font-bold">Teste Grátis</h3>
            <p className="opacity-90">30 dias para avaliar todas as funcionalidades</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center space-y-4">
            <div className="text-5xl">🤝</div>
            <h3 className="text-xl font-bold">Implantação</h3>
            <p className="opacity-90">Suporte completo na migração e treinamento</p>
          </div>
        </div>
        <div className="text-center pt-8">
          <p className="text-2xl font-bold mb-4">Obrigado!</p>
          <p className="opacity-90">Alguma pergunta?</p>
        </div>
      </div>
    )
  }
]

export default function SlidesPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
    } else if (e.key === 'ArrowLeft') {
      setCurrentSlide(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Escape') {
      setIsFullscreen(false)
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const slide = slides[currentSlide]

  return (
    <div className={`min-h-screen ${slide.background || 'bg-gray-900'} transition-colors duration-500`}>
      {/* Navigation */}
      {!isFullscreen && (
        <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-50">
          <Button variant="ghost" className="text-white" onClick={() => window.history.back()}>
            <Home className="h-5 w-5 mr-2" /> Sair
          </Button>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white">
              {currentSlide + 1} / {slides.length}
            </Badge>
            <Button variant="ghost" className="text-white" onClick={toggleFullscreen}>
              <Play className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Slide Content */}
      <div 
        className="min-h-screen flex items-center justify-center p-8 cursor-pointer"
        onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
      >
        <div className="w-full max-w-5xl">
          {slide.content}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-4 right-4 flex justify-between items-center">
        <Button
          variant="ghost"
          className="text-white"
          onClick={(e) => {
            e.stopPropagation()
            setCurrentSlide(prev => Math.max(prev - 1, 0))
          }}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === currentSlide ? 'bg-white' : 'bg-white/30'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentSlide(i)
              }}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          className="text-white"
          onClick={(e) => {
            e.stopPropagation()
            setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
          }}
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Keyboard hints */}
      {!isFullscreen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
          ← → para navegar • F para tela cheia • Clique para avançar
        </div>
      )}
    </div>
  )
}
