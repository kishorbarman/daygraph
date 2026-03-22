const CACHE_NAME = 'daygraph-shell-v2'
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]
const STATIC_ASSET_CACHE = 'daygraph-static-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(async () => {
          const offlinePage = await caches.match('/offline.html')
          return offlinePage || caches.match('/')
        }),
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
        return fetch(event.request).then((response) => {
          const copy = response.clone()
          caches.open(STATIC_ASSET_CACHE).then((cache) => cache.put(event.request, copy))
          return response
        })
      }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(event.request).catch(() => {
        return new Response('', { status: 504, statusText: 'Offline' })
      })
    }),
  )
})
