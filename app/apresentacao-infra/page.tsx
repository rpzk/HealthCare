'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import {
  Slide1Capa,
  Slide2Compliance,
  Slide3Arquitetura,
  Slide4Custos,
  Slide5Resumo,
} from '@/components/presentation'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

const SLIDES = [
  Slide1Capa,
  Slide2Compliance,
  Slide3Arquitetura,
  Slide4Custos,
  Slide5Resumo,
]

export default function ApresentacaoInfraPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/apresentacao-infra')}`)
      return
    }
    const role = (session.user as any)?.role
    const availableRoles = (session.user as any)?.availableRoles || []
    const isAllowed = role === 'ADMIN' || role === 'OWNER' || availableRoles.includes('ADMIN') || availableRoles.includes('OWNER')
    if (!isAllowed) {
      router.push('/admin')
    }
  }, [session, status, router])

  const goNext = useCallback(() => {
    setCurrent((c) => (c < SLIDES.length - 1 ? c + 1 : c))
  }, [])

  const goPrev = useCallback(() => {
    setCurrent((c) => (c > 0 ? c - 1 : c))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPrinting) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, isPrinting])

  // Durante impressão, renderiza todos os slides em sequência
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true)
    const handleAfterPrint = () => setIsPrinting(false)
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }

  const SlideComponent = SLIDES[current]

  return (
    <div className="relative min-h-screen">
      {/* Versão normal: apenas o slide atual */}
      {!isPrinting && <SlideComponent />}

      {/* Versão de impressão: todos os slides empilhados, uma página por slide */}
      {isPrinting && (
        <div className="print-container">
          {SLIDES.map((Slide, index) => (
            <div key={index} className="print-slide">
              <Slide />
            </div>
          ))}
        </div>
      )}

      {/* Navegação */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 print:hidden">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-sm text-slate-400 min-w-[4rem] text-center">
          {current + 1} / {SLIDES.length}
        </span>
        <button
          onClick={goNext}
          disabled={current === SLIDES.length - 1}
          className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition"
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition ml-2"
          aria-label="Tela cheia"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* Indicadores */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50 print:hidden">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition ${
              i === current ? 'bg-blue-500 scale-125' : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Ir para slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Link voltar */}
      <a
        href="/admin"
        className="fixed top-4 left-4 text-sm text-slate-500 hover:text-slate-300 transition z-50 print:hidden"
      >
        ← Voltar ao Admin
      </a>

      <style jsx global>{`
        @media print {
          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-container {
            background: #ffffff !important;
          }

          .print-slide {
            page-break-after: always;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .print-slide:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  )
}
