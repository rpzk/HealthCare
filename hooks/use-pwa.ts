'use client'

import { useState, useEffect, useCallback } from 'react'

// ============ TIPOS ============

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isUpdateAvailable: boolean
  pendingActionsCount: number
}

interface UsePWAReturn extends PWAState {
  installApp: () => Promise<boolean>
  updateApp: () => void
  clearCache: () => Promise<void>
  syncPendingActions: () => Promise<void>
}

// ============ HOOK usePWA ============

export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    pendingActionsCount: 0
  })
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Detectar se já está instalado
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true

    setState(prev => ({ ...prev, isInstalled: isStandalone }))
  }, [])

  // Capturar evento de instalação
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState(prev => ({ ...prev, isInstallable: true }))
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Monitorar status online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Registrar e monitorar service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg)

      // Verificar atualizações periodicamente
      const checkForUpdates = () => {
        reg.update().catch(console.error)
      }

      const interval = setInterval(checkForUpdates, 60 * 60 * 1000) // 1 hora
      
      return () => clearInterval(interval)
    })

    // Detectar nova versão disponível
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setState(prev => ({ ...prev, isUpdateAvailable: true }))
    })

    // Escutar mensagens do SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('[PWA] Sync complete:', event.data.results)
        getPendingCount()
      }
    })
  }, [])

  // Obter contagem de ações pendentes
  const getPendingCount = useCallback(async () => {
    if (!registration?.active) return

    const messageChannel = new MessageChannel()
    
    return new Promise<number>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        const count = event.data.count || 0
        setState(prev => ({ ...prev, pendingActionsCount: count }))
        resolve(count)
      }

      registration.active!.postMessage(
        { type: 'GET_PENDING_COUNT' },
        [messageChannel.port2]
      )
    })
  }, [registration])

  // Instalar app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setState(prev => ({ ...prev, isInstallable: false }))
      return true
    }

    return false
  }, [deferredPrompt])

  // Atualizar app
  const updateApp = useCallback(() => {
    if (!registration?.waiting) {
      window.location.reload()
      return
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [registration])

  // Limpar cache
  const clearCache = useCallback(async () => {
    if (!registration?.active) return

    const messageChannel = new MessageChannel()
    
    return new Promise<void>((resolve) => {
      messageChannel.port1.onmessage = () => resolve()
      registration.active!.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    })
  }, [registration])

  // Forçar sincronização
  const syncPendingActions = useCallback(async () => {
    if (!registration) return

    if ('sync' in registration) {
      await (registration as any).sync.register('sync-actions')
    }
  }, [registration])

  // Verificar contagem inicial
  useEffect(() => {
    if (registration) {
      getPendingCount()
    }
  }, [registration, getPendingCount])

  return {
    ...state,
    installApp,
    updateApp,
    clearCache,
    syncPendingActions
  }
}

// ============ HOOK useOfflineStorage ============

interface OfflineData<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isStale: boolean
}

export function useOfflineStorage<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    staleTime?: number // ms antes de considerar stale
    cacheTime?: number // ms antes de invalidar cache
    refreshOnMount?: boolean
  } = {}
): OfflineData<T> & { refresh: () => Promise<void> } {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutos
    cacheTime = 24 * 60 * 60 * 1000, // 24 horas
    refreshOnMount = true
  } = options

  const [state, setState] = useState<OfflineData<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isStale: false
  })

  // Carregar do cache local
  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const cached = localStorage.getItem(`offline_${key}`)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          const age = Date.now() - timestamp

          if (age < cacheTime) {
            setState({
              data,
              loading: false,
              error: null,
              lastUpdated: new Date(timestamp),
              isStale: age > staleTime
            })
            return true
          }
        }
      } catch (e) {
        console.error('[OfflineStorage] Error loading cache:', e)
      }
      return false
    }

    loadFromCache().then((hasCache) => {
      if (!hasCache || refreshOnMount) {
        refresh()
      }
    })
  }, [key])

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const data = await fetchFn()
      const timestamp = Date.now()

      // Salvar no cache
      localStorage.setItem(`offline_${key}`, JSON.stringify({ data, timestamp }))

      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(timestamp),
        isStale: false
      })
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [key, fetchFn])

  return { ...state, refresh }
}

// ============ HOOK usePushNotifications ============

interface PushState {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission
}

export function usePushNotifications(): PushState & {
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  requestPermission: () => Promise<NotificationPermission>
} {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied'
    }))

    if (isSupported) {
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setState(prev => ({ ...prev, isSubscribed: !!sub }))
    } catch (e) {
      console.error('[Push] Error checking subscription:', e)
    }
  }

  const requestPermission = async (): Promise<NotificationPermission> => {
    const permission = await Notification.requestPermission()
    setState(prev => ({ ...prev, permission }))
    return permission
  }

  const subscribe = async (): Promise<boolean> => {
    try {
      if (Notification.permission !== 'granted') {
        const permission = await requestPermission()
        if (permission !== 'granted') return false
      }

      const reg = await navigator.serviceWorker.ready
      
      // Obter VAPID key do servidor
      const response = await fetch('/api/push/vapid-key')
      const { publicKey } = await response.json()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      // Enviar subscription para o servidor
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      setState(prev => ({ ...prev, isSubscribed: true }))
      return true
    } catch (e) {
      console.error('[Push] Subscribe error:', e)
      return false
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        await sub.unsubscribe()
        
        // Notificar servidor
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })
      }

      setState(prev => ({ ...prev, isSubscribed: false }))
      return true
    } catch (e) {
      console.error('[Push] Unsubscribe error:', e)
      return false
    }
  }

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission
  }
}

// Helper para converter VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
