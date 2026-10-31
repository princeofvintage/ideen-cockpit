// Hält die App selbst auf dem Handy vor, damit sie auch ohne Netz aufgeht.
// Daten (Supabase) laufen nie über diesen Speicher.
const CACHE = 'ideen-cockpit-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  // Erst Netz (immer die neueste Version), bei Funkloch die gespeicherte
  // Die Startseite immer beim Server nachfragen, damit Updates sofort ankommen
  const anfrage = e.request.mode === 'navigate' ? new Request(e.request, { cache: 'no-cache' }) : e.request
  e.respondWith(
    fetch(anfrage)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone()
          caches.open(CACHE).then((c) => c.put(e.request, kopie))
        }
        return antwort
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  )
})
