/// <reference lib="webworker" />

const CACHE_VERSION = 'v4'
const CACHE_NAME = `healthcare-${CACHE_VERSION}`
const OFFLINE_CACHE = `healthcare-offline-${CACHE_VERSION}`
const DATA_CACHE = `healthcare-data-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/offline.html',
]

// Rotas que podem ser cacheadas para acesso offline
const OFFLINE_CACHEABLE_ROUTES = [
  '/patients',
  '/appointments',
  '/consultations',
  '/prescriptions',
  '/medical-records',
  '/profile',
]

// Tempo de expiração do cache de dados (5 minutos)
const DATA_CACHE_MAX_AGE = 5 * 60 * 1000

// IndexedDB para ações offline
const DB_NAME = 'healthcare-offline'
const DB_VERSION = 1
const PENDING_ACTIONS_STORE = 'pending-actions'

// Abrir IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(PENDING_ACTIONS_STORE)) {
        db.createObjectStore(PENDING_ACTIONS_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Salvar ação pendente
async function savePendingAction(action) {
  const db = await openDB()
  const tx = db.transaction(PENDING_ACTIONS_STORE, 'readwrite')
  const store = tx.objectStore(PENDING_ACTIONS_STORE)
  store.add({
    ...action,
    timestamp: Date.now()
  })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Obter ações pendentes
async function getPendingActions() {
  const db = await openDB()
  const tx = db.transaction(PENDING_ACTIONS_STORE, 'readonly')
  const store = tx.objectStore(PENDING_ACTIONS_STORE)
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Remover ação pendente
async function removePendingAction(id) {
  const db = await openDB()
  const tx = db.transaction(PENDING_ACTIONS_STORE, 'readwrite')
  const store = tx.objectStore(PENDING_ACTIONS_STORE)
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(OFFLINE_CACHE),
      caches.open(DATA_CACHE)
    ])
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name.startsWith('healthcare-') && 
            ![CACHE_NAME, OFFLINE_CACHE, DATA_CACHE].includes(name)
          )
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control immediately
  self.clients.claim()
})

// Verificar se uma resposta de cache de dados ainda é válida
function isDataCacheValid(response) {
  const dateHeader = response.headers.get('sw-cache-time')
  if (!dateHeader) return false
  const cacheTime = parseInt(dateHeader, 10)
  return (Date.now() - cacheTime) < DATA_CACHE_MAX_AGE
}

// Criar resposta com timestamp de cache
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('sw-cache-time', Date.now().toString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// Fetch event - estratégias de cache por tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignore unsupported schemes (e.g., chrome-extension:// injected requests)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // Skip non-GET requests - salvar para sync posterior se offline
  if (request.method !== 'GET') {
    // Interceptar POST/PUT/DELETE quando offline
    if (!navigator.onLine && (
      request.method === 'POST' || 
      request.method === 'PUT' || 
      request.method === 'DELETE'
    )) {
      event.respondWith(handleOfflineMutation(request))
    }
    return
  }

  // Skip auth-related requests
  if (url.pathname.startsWith('/auth/')) return
  if (url.pathname.startsWith('/api/auth/')) return

  // API requests - Stale-While-Revalidate para dados
  if (url.pathname.startsWith('/api/')) {
    // Algumas APIs não devem ser cacheadas
    const noCacheApis = ['/api/auth', '/api/upload', '/api/stream']
    if (noCacheApis.some(api => url.pathname.startsWith(api))) return
    
    event.respondWith(handleApiRequest(request))
    return
  }

  // For page navigation, use network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request, url))
    return
  }

  // For Next.js static chunks and critical assets, prefer network to avoid stale JS after deploy.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // For other static assets (images/fonts), use cache-first.
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2|webp|avif)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
    return
  }
})

// Handler para requisições de navegação (páginas)
async function handleNavigationRequest(request, url) {
  try {
    const response = await fetch(request)
    
    // Clone and cache successful responses
    if (response.ok) {
      const responseClone = response.clone()
      const cache = await caches.open(OFFLINE_CACHE)
      
      // Cache páginas que podem ser acessadas offline
      if (OFFLINE_CACHEABLE_ROUTES.some(route => url.pathname.startsWith(route))) {
        cache.put(request, responseClone)
      }
    }
    return response
  } catch (error) {
    // Fallback to cache if offline
    const cached = await caches.match(request)
    if (cached) return cached
    
    // Try offline page
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) return offlinePage
    
    // Fallback to root
    const root = await caches.match('/')
    if (root) return root
    
    return new Response('Offline - Página não disponível', { 
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

// Handler para requisições de API - Stale-While-Revalidate
async function handleApiRequest(request) {
  const cache = await caches.open(DATA_CACHE)
  const cachedResponse = await cache.match(request)
  
  // Se temos cache válido, retornar imediatamente e atualizar em background
  if (cachedResponse && isDataCacheValid(cachedResponse)) {
    // Atualizar cache em background
    fetch(request)
      .then(response => {
        if (response.ok) {
          cache.put(request, addCacheTimestamp(response.clone()))
        }
      })
      .catch(() => {})
    
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      // Cachear resposta com timestamp
      cache.put(request, addCacheTimestamp(response.clone()))
    }
    
    return response
  } catch (error) {
    // Se offline e temos cache (mesmo expirado), retornar
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Você está offline e não há dados em cache.' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handler para mutações quando offline
async function handleOfflineMutation(request) {
  try {
    // Tentar executar normalmente primeiro
    return await fetch(request)
  } catch (error) {
    // Se falhar (offline), salvar para sincronização posterior
    const body = await request.clone().text()
    
    await savePendingAction({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    })
    
    // Registrar para Background Sync se disponível
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-pending-actions')
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        offline: true,
        message: 'Ação salva para sincronização quando online.' 
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background Sync - sincronizar ações pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions())
  }
})

// Função para sincronizar ações pendentes
async function syncPendingActions() {
  const actions = await getPendingActions()
  
  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      })
      
      if (response.ok) {
        await removePendingAction(action.id)
        
        // Notificar clientes sobre sincronização bem-sucedida
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            action: action
          })
        })
      }
    } catch (error) {
      console.error('Falha ao sincronizar ação:', action.id, error)
    }
  }
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_PENDING_COUNT':
      getPendingActions().then(actions => {
        event.ports[0]?.postMessage({ count: actions.length })
      })
      break
      
    case 'SYNC_NOW':
      syncPendingActions().then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      break
      
    case 'CLEAR_CACHE':
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(OFFLINE_CACHE),
        caches.delete(DATA_CACHE)
      ]).then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      break
  }
})

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'HealthCare'
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'default',
    data: data.url || '/',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
