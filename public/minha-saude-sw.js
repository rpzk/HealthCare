/// <reference lib="webworker" />

/**
 * Service Worker para Portal do Paciente (Minha Saúde)
 * 
 * Features:
 * - Cache de páginas para funcionamento offline
 * - Sincronização em background
 * - Notificações push
 * - Atualização automática
 */

const CACHE_VERSION = 'minha-saude-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const API_CACHE = `${CACHE_VERSION}-api`

// Recursos estáticos para cache imediato
const STATIC_ASSETS = [
  '/minha-saude',
  '/minha-saude/appointments',
  '/minha-saude/medications',
  '/minha-saude/exams',
  '/minha-saude/profile',
  '/minha-saude-manifest.json',
  '/icons/patient-icon.svg',
  '/offline.html'
]

// APIs que podem ser cacheadas
const CACHEABLE_APIS = [
  '/api/patients/me',
  '/api/appointments',
  '/api/medications/tracking',
  '/api/exams'
]

// Duração do cache de API (em segundos)
const API_CACHE_DURATION = 5 * 60 // 5 minutos

declare const self: ServiceWorkerGlobalScope

// ============ INSTALLATION ============

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('/api/')))
      })
      .then(() => {
        console.log('[SW] Static assets cached')
        return self.skipWaiting()
      })
      .catch(err => {
        console.error('[SW] Failed to cache static assets:', err)
      })
  )
})

// ============ ACTIVATION ============

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(keys => {
        return Promise.all(
          keys
            .filter(key => key.startsWith('minha-saude-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
            .map(key => {
              console.log('[SW] Deleting old cache:', key)
              return caches.delete(key)
            })
        )
      }),
      // Assumir controle imediato
      self.clients.claim()
    ])
  )
})

// ============ FETCH HANDLING ============

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Ignorar requests não-HTTP
  if (!url.protocol.startsWith('http')) return
  
  // Ignorar extensões de dev tools, etc
  if (url.pathname.includes('_next/webpack') || 
      url.pathname.includes('__nextjs_original-stack-frame')) {
    return
  }

  // Estratégia baseada no tipo de recurso
  if (event.request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // APIs: Network first, fallback to cache
      event.respondWith(networkFirstWithCache(event.request, API_CACHE))
    } else if (isStaticAsset(url.pathname)) {
      // Assets estáticos: Cache first
      event.respondWith(cacheFirst(event.request, STATIC_CACHE))
    } else if (url.pathname.startsWith('/minha-saude')) {
      // Páginas do portal: Network first para sempre ter versão atualizada
      event.respondWith(networkFirstWithCache(event.request, DYNAMIC_CACHE))
    }
  }
})

// ============ ESTRATÉGIAS DE CACHE ============

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithCache(request: Request, cacheName: string): Promise<Response> {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    
    // Se for página HTML, mostrar página offline
    if (request.headers.get('Accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html')
      if (offlinePage) return offlinePage
    }
    
    return new Response(JSON.stringify({ 
      error: 'Você está offline', 
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i.test(pathname)
}

// ============ PUSH NOTIFICATIONS ============

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  const options: NotificationOptions = {
    icon: '/icons/patient-icon.svg',
    badge: '/icons/badge.svg',
    vibrate: [100, 50, 100],
    data: { url: '/minha-saude' },
    actions: [],
    requireInteraction: false
  }
  
  if (event.data) {
    try {
      const data = event.data.json()
      
      options.body = data.body || 'Nova notificação'
      options.data = { url: data.url || '/minha-saude' }
      options.tag = data.tag || 'default'
      
      if (data.type === 'appointment_reminder') {
        options.actions = [
          { action: 'view', title: 'Ver Consulta' },
          { action: 'dismiss', title: 'Dispensar' }
        ]
        options.requireInteraction = true
      } else if (data.type === 'medication_reminder') {
        options.actions = [
          { action: 'taken', title: '✓ Tomei' },
          { action: 'snooze', title: 'Lembrar depois' }
        ]
        options.requireInteraction = true
        options.tag = 'medication'
      } else if (data.type === 'exam_result') {
        options.actions = [
          { action: 'view', title: 'Ver Resultado' }
        ]
      }
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Minha Saúde', options)
      )
    } catch (e) {
      console.error('[SW] Error parsing push data:', e)
      event.waitUntil(
        self.registration.showNotification('Nova Notificação', options)
      )
    }
  }
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  
  event.notification.close()
  
  const data = event.notification.data || {}
  let url = data.url || '/minha-saude'
  
  // Tratar ações específicas
  if (event.action === 'taken') {
    // Registrar medicamento tomado
    url = '/minha-saude/medications?action=mark-taken'
  } else if (event.action === 'snooze') {
    // Adiar lembrete (não abre URL, apenas reagenda)
    // TODO: Implementar reagendamento
    return
  } else if (event.action === 'view') {
    url = data.viewUrl || url
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Tentar focar em janela existente
        for (const client of clients) {
          if (client.url.includes('/minha-saude') && 'focus' in client) {
            return client.focus().then(c => c.navigate(url))
          }
        }
        // Abrir nova janela
        return self.clients.openWindow(url)
      })
  )
})

// ============ BACKGROUND SYNC ============

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-medications') {
    event.waitUntil(syncMedications())
  } else if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments())
  }
})

async function syncMedications(): Promise<void> {
  try {
    // Buscar dados pendentes de sincronização do IndexedDB
    // e enviar para o servidor
    console.log('[SW] Syncing medications...')
    
    // TODO: Implementar sincronização real com IndexedDB
    // const db = await openDB('minha-saude', 1)
    // const pending = await db.getAll('pending-medications')
    // for (const item of pending) {
    //   await fetch('/api/medications/tracking', {
    //     method: 'POST',
    //     body: JSON.stringify(item)
    //   })
    // }
  } catch (error) {
    console.error('[SW] Medication sync failed:', error)
  }
}

async function syncAppointments(): Promise<void> {
  try {
    console.log('[SW] Syncing appointments...')
    // TODO: Implementar sincronização de consultas
  } catch (error) {
    console.error('[SW] Appointment sync failed:', error)
  }
}

// ============ PERIODIC SYNC (for supported browsers) ============

self.addEventListener('periodicsync', (event: Event) => {
  const periodicEvent = event as unknown as { tag: string; waitUntil(p: Promise<unknown>): void }
  console.log('[SW] Periodic sync:', periodicEvent.tag)
  
  if (periodicEvent.tag === 'check-reminders') {
    periodicEvent.waitUntil(checkReminders())
  }
})

async function checkReminders(): Promise<void> {
  try {
    const response = await fetch('/api/patients/me/reminders')
    if (response.ok) {
      const reminders = await response.json()
      for (const reminder of reminders) {
        await self.registration.showNotification(reminder.title, {
          body: reminder.body,
          icon: '/icons/patient-icon.svg',
          data: { url: reminder.url }
        })
      }
    }
  } catch (error) {
    console.error('[SW] Failed to check reminders:', error)
  }
}

// ============ MESSAGE HANDLING ============

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || []
    caches.open(DYNAMIC_CACHE).then(cache => cache.addAll(urls))
  } else if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => {
      keys.forEach(key => {
        if (key.startsWith('minha-saude-')) {
          caches.delete(key)
        }
      })
    })
  }
})

console.log('[SW] Service Worker loaded')
