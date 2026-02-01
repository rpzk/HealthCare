'use client'

/**
 * PWA Install Prompt Component
 * 
 * Banner/modal para incentivar instalação do app
 */

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Zap, Wifi, Bell } from 'lucide-react'
import { usePWA } from './pwa-manager'

interface InstallPromptProps {
  variant?: 'banner' | 'modal' | 'inline'
  onDismiss?: () => void
}

export function PWAInstallPrompt({ variant = 'banner', onDismiss }: InstallPromptProps) {
  const { canInstall, isInstalled, promptInstall } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Verificar se foi dismissado anteriormente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedAt = localStorage.getItem('pwa-install-dismissed')
      if (dismissedAt) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000
        if (parseInt(dismissedAt) > dayAgo) {
          setDismissed(true)
        }
      }
    }
  }, [])

  if (isInstalled || !canInstall || dismissed) {
    return null
  }

  const handleInstall = async () => {
    setInstalling(true)
    const success = await promptInstall()
    setInstalling(false)
    if (success) {
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    onDismiss?.()
  }

  if (variant === 'banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg animate-slide-up">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Instale o app Minha Saúde</p>
                <p className="text-xs text-white/80">Acesse offline e receba lembretes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-white text-sky-600 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-sky-50 transition-colors disabled:opacity-50"
              >
                {installing ? 'Instalando...' : 'Instalar'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/70 hover:text-white p-1"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="bg-white/20 rounded-xl p-3">
                <Download className="h-8 w-8" />
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/70 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <h2 className="text-xl font-bold mt-4">Instale o Minha Saúde</h2>
            <p className="text-white/80 mt-1 text-sm">
              Tenha acesso rápido à sua saúde na palma da mão
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <Feature 
                icon={<Zap className="h-5 w-5" />} 
                title="Acesso rápido" 
                description="Abra direto da tela inicial do celular"
              />
              <Feature 
                icon={<Wifi className="h-5 w-5" />} 
                title="Funciona offline" 
                description="Consulte seus dados mesmo sem internet"
              />
              <Feature 
                icon={<Bell className="h-5 w-5" />} 
                title="Lembretes" 
                description="Receba notificações de consultas e remédios"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {installing ? 'Instalando...' : 'Instalar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Inline variant
  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="bg-sky-500 text-white rounded-xl p-2.5 shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Instale o app Minha Saúde
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Acesse offline, receba lembretes de medicamentos e consultas.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {installing ? 'Instalando...' : 'Instalar agora'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200"
            >
              Dispensar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-sky-500 shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-slate-900 dark:text-white text-sm">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
