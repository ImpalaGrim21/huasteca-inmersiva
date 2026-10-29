/* Build injects one complete release. No dynamic URL discovery or runtime writes. */
const BUILD = /*__MOBILITY_PRECACHE__*/ null
if (!BUILD || BUILD.schemaVersion !== 1) throw new Error('Offline release manifest is missing. Build the app before registering its worker.')
const CACHE = BUILD.cacheName
const origin = new URL(self.registration.scope).origin
const shellUrl = new URL(BUILD.shellPath, origin).href
const releaseUrls = BUILD.files.map(file => new URL(file.path, origin).href)
const releaseSet = new Set(releaseUrls)

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      if (BUILD.totalBytes > BUILD.budgetBytes || BUILD.budgetBytes > 6_000_000) throw new Error('Offline budget exceeded.')
      const cache = await caches.open(CACHE)
      // addAll is one batch: any network/HTTP/integrity failure rejects install.
      // SRI prevents mixing a new HTML/public file with an older chunk graph
      // while a static deployment is changing under us.
      await cache.addAll(BUILD.files.map(file => new Request(new URL(file.path, origin), {
        cache: 'reload', credentials: 'omit', redirect: 'error', integrity: file.integrity,
      })))
      if (!(await complete(cache))) throw new Error('Offline release is incomplete.')
      // Do not skipWaiting on upgrades. Open tabs retain their complete previous
      // release until they close, rather than losing lazy chunks mid-session.
    } catch (error) {
      await caches.delete(CACHE)
      throw error
    }
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    if (!(await complete(cache))) throw new Error('Cannot activate an incomplete offline release.')
    const names = await caches.keys()
    await Promise.all(names.filter(name => name !== CACHE && (name.startsWith(BUILD.cachePrefix) || BUILD.legacyCacheNames.includes(name))).map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

async function complete(cache) {
  return (await Promise.all(releaseUrls.map(url => cache.match(url, { ignoreVary: true })))).every(Boolean)
}

function isGuideClient(client) {
  if (!client || client.type !== 'window' || typeof client.id !== 'string') return false
  try {
    const url = new URL(client.url)
    return url.origin === origin && url.pathname.startsWith(BUILD.scopePath)
  } catch { return false }
}

async function singleGuideClient(sourceId) {
  const clients = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(isGuideClient)
  if (clients.length > 1) return 'other-tabs-open'
  return clients.length === 1 && clients[0].id === sourceId ? 'updated' : 'unavailable'
}

// Recheck the installed bytes, rather than trusting cache-key presence or a
// caller's assertion. This reads only the bounded public build manifest.
async function integrityComplete(cache) {
  if (BUILD.totalBytes > BUILD.budgetBytes || BUILD.budgetBytes > 6_000_000 || BUILD.totalBytes !== BUILD.files.reduce((bytes, file) => bytes + file.bytes, 0)) return false
  for (const file of BUILD.files) {
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(file.integrity)) return false
    const response = await cache.match(new URL(file.path, origin).href, { ignoreVary: true })
    if (!response?.ok || response.redirected || response.type === 'opaque') return false
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength !== file.bytes) return false
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const integrity = `sha256-${btoa(String.fromCharCode(...digest))}`
    if (integrity !== file.integrity) return false
  }
  return true
}

self.addEventListener('message', event => {
  if (!event.ports[0]) return
  if (event.data?.type === 'ACTIVATE_OFFLINE_UPDATE') {
    event.waitUntil((async () => {
      const reply = result => event.ports[0].postMessage({ type: 'OFFLINE_UPDATE_RESULT', result, version: BUILD.version })
      try {
        // event.source is supplied by the browser; no origin, ID or permission
        // claimed inside the JSON payload grants update authority.
        const source = event.source
        if (!isGuideClient(source) || !isGuideClient(await self.clients.get(source.id)) || !self.registration.waiting) { reply('unavailable'); return }
        const firstCheck = await singleGuideClient(source.id)
        if (firstCheck !== 'updated') { reply(firstCheck); return }
        if (!(await integrityComplete(await caches.open(CACHE)))) { reply('unavailable'); return }
        // Include uncontrolled windows and recheck after hashing: a second
        // passenger tab opened during validation must keep the old release.
        const finalCheck = await singleGuideClient(source.id)
        if (finalCheck !== 'updated') { reply(finalCheck); return }
        reply('updated')
        await self.skipWaiting()
      } catch { reply('unavailable') }
    })())
    return
  }
  if (event.data?.type !== 'GET_OFFLINE_STATUS') return
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    event.ports[0].postMessage({
      type: 'OFFLINE_STATUS', version: BUILD.version, complete: await complete(cache),
      files: releaseUrls.length, bytes: BUILD.totalBytes, budgetBytes: BUILD.budgetBytes,
    })
  })())
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== origin) return // No tiles, geocoding, telemetry or SCT cache.
  const isGuideNavigation = event.request.mode === 'navigate' && (url.pathname === BUILD.scopePath || url.pathname === BUILD.shellPath)
  if (isGuideNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request)
        if (response.ok) return response
      } catch { /* Offline: use this worker's coherent shell, never overwrite it. */ }
      const cached = await (await caches.open(CACHE)).match(shellUrl, { ignoreVary: true })
      return cached || new Response('La guía no está disponible sin conexión. Intenta de nuevo con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    })())
  } else if (releaseSet.has(url.href)) {
    // Public build files have fixed bytes (SRI checked during install). Some
    // static hosts use Vary: Origin; anonymous module reads must match as well.
    event.respondWith((async () => (await (await caches.open(CACHE)).match(event.request, { ignoreVary: true })) || fetch(event.request))())
  }
})
