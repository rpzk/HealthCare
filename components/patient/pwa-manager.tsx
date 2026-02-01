'use client'

/**
 * PWA Manager Component para Portal do Paciente
 * 
 * Funcionalidades:
 * - Registro do Service Worker
 * - Detecção de instalação
 * - Notificações push
 * - Sincronização offline
 */

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAManagerProps {
  onInstallReady?: () => void
  onInstalled?: () => void
  onOffline?: () => void
  onOnline?: () => void
  onUpdateAvailable?: () => void
}

export function PWAManager({
  onInstallReady,
  onInstalled,
  onOffline,
  onOnline,
  onUpdateAvailable
}: PWAManagerProps) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  // Registrar Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    async function registerSW() {
      try {
        const reg = await navigator.serviceWorker.register('/minha-saude-sw.js', {
          scope: '/minha-saude'
        })
        
        setRegistration(reg)
        console.log('[PWA] Service Worker registered:', reg.scope)

        // Verificar atualizações
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
                onUpdateAvailable?.()
              }
            })
          }
        })

        // Verificar se já há atualização disponível
        if (reg.waiting) {
          setUpdateAvailable(true)
          onUpdateAvailable?.()
        }
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
      }
    }

    registerSW()
  }, [onUpdateAvailable])

  // Detectar prompt de instalação
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      onInstallReady?.()
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      onInstalled?.()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Verificar se já está instalado (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstallReady, onInstalled])

  // Monitorar status de conexão
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      onOnline?.()
    }

    const handleOffline = () => {
      setIsOnline(false)
      onOffline?.()
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onOnline, onOffline])

  // Solicitar permissão de notificações
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    const permission = await Notification.requestPermission()
    return permission
  }, [])

  // Inscrever para push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registration) {
      console.error('[PWA] No service worker registration')
      return null
    }

    try {
      // VAPID public key (deve ser configurado no .env)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidPublicKey) {
        console.error('[PWA] VAPID public key not configured')
        return null
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Enviar subscription para o servidor
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })

      console.log('[PWA] Push subscription successful')
      return subscription
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error)
      return null
    }
  }, [registration])

  // Disparar prompt de instalação
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available')
      return false
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
      return true
    }
    
    return false
  }, [deferredPrompt])

  // Aplicar atualização
  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }, [registration])

  // Registrar sync para quando voltar online
  const registerSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!registration || !('sync' in registration)) {
      console.warn('[PWA] Background sync not supported')
      return false
    }

    try {
      await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(tag)
      console.log('[PWA] Sync registered:', tag)
      return true
    } catch (error) {
      console.error('[PWA] Sync registration failed:', error)
      return false
    }
  }, [registration])

  // Este componente não renderiza nada visualmente
  // Mas expõe funcionalidades via contexto ou props
  return null
}

// Hook para usar funcionalidades PWA
export function usePWA() {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setCanInstall(false)
      setDeferredPrompt(null)
      return true
    }
    return false
  }, [deferredPrompt])

  return {
    isOnline,
    isInstalled,
    canInstall,
    promptInstall
  }
}

// Utilitário para converter VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray as BufferSource
}

export default PWAManager
