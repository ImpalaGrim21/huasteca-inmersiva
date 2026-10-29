import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const rawBasePath = process.env.VITE_BASE_PATH || '/'
const basePath = `/${rawBasePath.split('/').filter(Boolean).join('/')}${rawBasePath === '/' ? '' : '/'}`
const suppliedBase = process.env.E2E_BASE_URL || `http://127.0.0.1:4178${basePath}`
const baseUrl = suppliedBase.endsWith('/') ? suppliedBase : `${suppliedBase}/`
const mobilityUrl = new URL(baseUrl).pathname.endsWith('/movilidad/') ? baseUrl : new URL('movilidad/', baseUrl).href
const artifacts = new URL('../../.work/metrored-prototype/qa/', import.meta.url)
const results = []
let browser, server

before(async () => {
  if (!process.env.E2E_BASE_URL) {
    assert.ok(existsSync('dist/movilidad/index.html'), 'Run npm run build before the mobility E2E suite.')
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], { stdio: 'pipe', env: process.env })
    let output = ''
    server.stdout.on('data', data => { output = (output + data).slice(-4000) })
    server.stderr.on('data', data => { output = (output + data).slice(-4000) })
    let ready = false
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`Mobility preview exited: ${output}`)
      try { if ((await fetch(mobilityUrl)).ok) { ready = true; break } } catch { /* Startup only. */ }
      await delay(250)
    }
    assert.ok(ready, `Mobility preview did not become available: ${output}`)
  }
  const candidates = [process.env.E2E_BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
  const executablePath = candidates.find(path => existsSync(path))
  assert.ok(executablePath, 'Use an installed Chrome/Chromium or set E2E_BROWSER_PATH; do not download another browser.')
  browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] })
}, { timeout: 40000 })

after(async () => {
  await browser?.close()
  server?.kill()
  await mkdir(artifacts, { recursive: true })
  await writeFile(new URL('mobility-e2e-report.json', artifacts), JSON.stringify({ date: new Date().toISOString(), basePath, mobilityUrl, scope: 'Production preview, independent browser contexts, real OpenFreeMap except the explicit failure test. Test geolocation belongs to the passenger; no vehicle fixture is served.', results }, null, 2))
})

const remoteMap = url => { try { return new URL(url).hostname === 'tiles.openfreemap.org' } catch { return false } }
const mapModule = url => { try { return /\/assets\/TransitMap-[^/?]+\.js$/.test(new URL(url).pathname) } catch { return false } }
const sctRequest = url => {
  const parsed = new URL(url)
  return /(^|\.)(sctslp\.com|sct\.slp\.gob\.mx)$/.test(parsed.hostname) || /\/(?:api\/)?(?:sct|gtfs|vehicle-positions)(?:\/|\.|$)/i.test(parsed.pathname)
}

async function check(name, options, run) {
  const { allowMapFailure = false, allowModuleFailure = false, allowOffline = false, ...contextOptions } = options
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...contextOptions })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = [], expectedNetworkFailures = [], requests = [], mapResponses = []
  const failureFile = `${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.jpg`
  page.on('pageerror', error => errors.push(`Page: ${error.message}`))
  context.on('request', request => requests.push({ url: request.url(), method: request.method(), type: request.resourceType(), origin: request.headers().origin ?? null }))
  context.on('response', response => {
    if (remoteMap(response.url())) mapResponses.push({ url: response.url(), status: response.status() })
    if (response.status() >= 400) {
      if (allowMapFailure && remoteMap(response.url()) || allowModuleFailure && mapModule(response.url())) expectedNetworkFailures.push(`HTTP ${response.status()}: ${response.url()}`)
      else errors.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })
  context.on('requestfailed', request => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    const error = `Request: ${request.url()}: ${request.failure()?.errorText}`
    if ((allowMapFailure && remoteMap(request.url())) || (allowModuleFailure && mapModule(request.url())) || (allowOffline && request.failure()?.errorText === 'net::ERR_INTERNET_DISCONNECTED')) expectedNetworkFailures.push(error)
    else errors.push(error)
  })
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text(), location = message.location().url
    const expectedMapError = allowMapFailure && (location && remoteMap(location) || /openfreemap|AJAXError|Failed to fetch/.test(text))
    const expectedModuleError = allowModuleFailure && (location && mapModule(location) || /Failed to fetch dynamically imported module:.*\/assets\/TransitMap-[^/]+\.js/.test(text))
    const expectedOfflineError = allowOffline && /ERR_INTERNET_DISCONNECTED|Failed to fetch|AJAXError/.test(text)
    if (expectedMapError || expectedModuleError || expectedOfflineError) expectedNetworkFailures.push(`Console: ${text}`)
    else errors.push(`Console: ${text}`)
  })
  const started = performance.now()
  const evidence = { requests, mapResponses, expectedNetworkFailures }
  try {
    await run(page, context, evidence)
    assert.deepEqual(requests.filter(request => sctRequest(request.url)), [], 'The disconnected prototype must not fetch an SCT/vehicle feed')
    assert.deepEqual(errors, [], 'Unexpected browser/network errors')
    await rm(new URL(failureFile, artifacts), { force: true })
    results.push({ name, status: 'passed', durationMs: Math.round(performance.now() - started), sctRequests: 0, remoteMapResponses: mapResponses.length, expectedNetworkFailures, ...evidence.metrics })
  } catch (error) {
    await mkdir(artifacts, { recursive: true })
    await page.screenshot({ path: fileURLToPath(new URL(failureFile, artifacts)), type: 'jpeg', quality: 78, scale: 'css' }).catch(() => {})
    const cacheSnapshot = allowOffline ? await readCacheSnapshot(page).catch(() => []) : undefined
    results.push({ name, status: 'failed', error: error.message, browserErrors: errors, durationMs: Math.round(performance.now() - started), screenshot: failureFile, sctRequests: requests.filter(request => sctRequest(request.url)), expectedNetworkFailures, ...evidence.metrics, ...(cacheSnapshot ? { cacheSnapshot } : {}) })
    throw error
  } finally { await context.close() }
}

async function openGuide(page, suffix = '') {
  const target = new URL(suffix || '', mobilityUrl)
  target.searchParams.set('vista', 'red')
  await page.goto(target.href, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Universitaria', exact: true }).waitFor()
  await page.locator('.stop-card').first().waitFor()
}

async function selectTecnologico(page) {
  await page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true }).fill('Tecnologico')
  await page.locator('.stop-select').filter({ hasText: 'Tecnológico' }).first().click()
  await page.getByRole('region', { name: 'Detalle del punto seleccionado', exact: true }).waitFor()
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  assert.ok(dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport, `Horizontal overflow: ${JSON.stringify(dimensions)}`)
}

async function readCacheSnapshot(page) {
  return page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith('valles-mobility-'))
    const items = []
    for (const name of names) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        const response = await cache.match(request)
        items.push({ cache: name, url: request.url, requestOrigin: request.headers.get('origin'), vary: response?.headers.get('vary'), contentType: response?.headers.get('content-type') })
      }
    }
    return items
  })
}

async function waitForOfflineRelease(page, evidence) {
  const response = await page.request.get(new URL('offline-manifest.json', mobilityUrl).href)
  assert.equal(response.ok(), true, 'The build must publish an offline release manifest')
  const manifest = await response.json()
  assert.equal(manifest.schemaVersion, 1)
  assert.match(manifest.version, /^[a-f0-9]{20}$/)
  assert.ok(manifest.totalBytes > 0 && manifest.totalBytes <= 6_000_000, 'Only the mobility release may occupy its 6 MB cache budget')
  assert.ok(manifest.files.some(file => /maplibre-gl-worker[^/]*\.(?:js|mjs)$/.test(file.path)), 'The worker must be included at build time')
  assert.equal(manifest.files.filter(file => /\.woff2$/.test(file.path)).length, 2)
  assert.equal(manifest.files.some(file => /\/three-|\/guide\/|\/models\//.test(file.path)), false)
  assert.ok(manifest.files.every(file => file.path.startsWith(basePath) && /^sha256-[A-Za-z0-9+/]+=*$/.test(file.integrity)))
  evidence.metrics = { ...evidence.metrics, offlinePreparation: 'Atomic build precache; no CACHE_APP or performance discovery in the test', releaseVersion: manifest.version, cacheName: manifest.cacheName, cacheBytes: manifest.totalBytes, manifestFiles: manifest.files.length }
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await page.waitForFunction(async release => {
    const cache = await caches.open(release.cacheName)
    return (await Promise.all(release.files.map(file => cache.match(new URL(file.path, location.origin).href, { ignoreVary: true })))).every(Boolean)
  }, manifest, { timeout: 25000 })
  const status = await page.evaluate(() => new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The controlling worker did not report offline status')) }, 5000)
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data) }
    navigator.serviceWorker.controller.postMessage({ type: 'GET_OFFLINE_STATUS' }, [channel.port2])
  }))
  assert.equal(status.type, 'OFFLINE_STATUS')
  assert.equal(status.complete, true)
  assert.equal(status.version, manifest.version)
  assert.equal(status.files, manifest.files.length)
  const cacheSnapshot = await readCacheSnapshot(page)
  assert.equal(cacheSnapshot.some(item => new URL(item.url).origin !== new URL(mobilityUrl).origin), false, 'Remote map tiles must not be cached')
  evidence.metrics = { ...evidence.metrics, cacheSnapshot, cachedWorker: true, remoteTilesCached: false, controllingWorkerComplete: true }
  return manifest
}

test('real OpenFreeMap renders and 27 community points never claim GPS or ETA', { timeout: 60000 }, () => check('real-map-honest-baseline', {}, async (page, _context, evidence) => {
  await openGuide(page)
  await page.locator('.transit-map[data-map-status="ready"][data-map-settled="true"]').waitFor({ timeout: 30000 })
  assert.equal(await page.locator('.stop-card').count(), 27)
  assert.equal(await page.getByText('Llegadas aún no disponibles', { exact: true }).isVisible(), true)
  assert.equal(await page.getByText('Operación y sentido por confirmar.', { exact: true }).isVisible(), true)
  assert.equal(await page.locator('.received-vehicles').count(), 0)
  assert.ok(evidence.mapResponses.some(item => item.url.includes('/styles/positron') && item.status === 200), 'The real OpenFreeMap style must load')
  const canvas = await page.locator('.maplibregl-canvas').boundingBox()
  assert.ok(canvas && canvas.width > 300 && canvas.height > 300)
  await page.getByRole('button', { name: 'Ver todos los paraderos en el mapa', exact: true }).click()
  await assertNoOverflow(page)
  evidence.metrics = { points: 27, mapStatus: 'ready', vehicleRows: 0, arrivals: 'unavailable', mapInterception: false }
}))

test('search ignores accents, handles no result and restores the full list', { timeout: 45000 }, () => check('accent-search-empty-reset', {}, async page => {
  await openGuide(page)
  const search = page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true })
  await search.fill('Tecnologico')
  assert.equal(await page.locator('.stop-card').count(), 2)
  assert.match(await page.locator('.stop-list').innerText(), /Tecnológico/)
  await search.fill('Punto Novel')
  assert.equal(await page.locator('.stop-card').count(), 2)
  assert.match(await page.locator('.stop-list').innerText(), /Plaza Nobel/)
  await search.fill('Sin coincidencia de QA')
  await page.getByRole('heading', { name: 'No encontramos ese punto', exact: true }).waitFor()
  assert.equal(await page.locator('.stop-card').count(), 0)
  await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click()
  assert.equal(await page.locator('.stop-card').count(), 27)
  assert.equal(await search.evaluate(input => input === document.activeElement), true)
}))

test('select, save, reload and share preserve a real point identity without claiming direction', { timeout: 45000 }, () => check('saved-persist-query-share', { permissions: ['clipboard-read', 'clipboard-write'] }, async (page, context) => {
  await openGuide(page)
  await selectTecnologico(page)
  const selectedId = new URL(page.url()).searchParams.get('punto')
  assert.match(selectedId, /^osm-node-\d+$/)
  const detail = page.getByRole('region', { name: 'Detalle del punto seleccionado', exact: true })
  assert.equal(await detail.getByText('Sin estimación de llegada', { exact: true }).isVisible(), true)
  assert.equal(await detail.getByText('Sentido por confirmar', { exact: true }).isVisible(), true)
  assert.match(await detail.getByRole('link', { name: 'Ver punto en OSM', exact: true }).getAttribute('href'), /^https:\/\/www\.openstreetmap\.org\/node\/\d+$/)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  await page.getByRole('button', { name: 'Copiar enlace del punto', exact: true }).click()
  await page.getByText('Enlace del punto copiado.', { exact: true }).waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(new URL(copied).searchParams.get('punto'), selectedId)
  await page.goto(new URL('?vista=red', mobilityUrl).href)
  await page.getByRole('button', { name: /Guardados/ }).click()
  await page.locator('.stop-card').waitFor()
  assert.equal(await page.locator('.stop-card').count(), 1)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Guardados/ }).click()
  await page.locator('.stop-card').waitFor()
  assert.equal(await page.locator('.stop-card').count(), 1)
  const sharedPage = await context.newPage()
  await sharedPage.goto(copied, { waitUntil: 'domcontentloaded' })
  await sharedPage.getByRole('region', { name: 'Detalle del punto seleccionado', exact: true }).waitFor()
  assert.match(await sharedPage.locator('.selected-title').innerText(), /Tecnológico/)
  assert.equal(new URL(sharedPage.url()).searchParams.get('punto'), selectedId)
  await sharedPage.close()
}))

test('denied passenger geolocation leaves a working manual search', { timeout: 45000 }, () => check('location-denied-manual-search', {}, async (page, context) => {
  await context.grantPermissions([], { origin: new URL(mobilityUrl).origin })
  await openGuide(page)
  await page.getByRole('button', { name: 'Usar mi ubicación', exact: true }).click()
  await page.getByText('Ubicación no autorizada. Puedes seguir buscando por nombre.', { exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true }).fill('IMSS')
  assert.equal(await page.locator('.stop-card').count(), 2)
  assert.equal(await page.locator('.stop-copy').filter({ hasText: 'en línea recta' }).count(), 0)
}))

test('allowed passenger geolocation sorts points and labels distances as straight-line only', { timeout: 45000 }, () => check('location-allowed-distance-scope', { permissions: ['geolocation'], geolocation: { longitude: -99.0112, latitude: 21.9963, accuracy: 30 } }, async page => {
  await openGuide(page)
  await page.getByRole('button', { name: 'Usar mi ubicación', exact: true }).click()
  await page.getByText('Ubicación aproximada (±30 m). Las distancias son en línea recta, no a pie.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Cerca de mí', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.match(await page.locator('.stop-select').first().innerText(), /Hospital General IMSS/)
  assert.match(await page.locator('.stop-select').first().innerText(), /en línea recta/)
  assert.equal(await page.locator('.stop-card').count(), 27)
}))

test('out-of-area geolocation does not invent proximity in Valles', { timeout: 45000 }, () => check('location-outside-valles', { permissions: ['geolocation'], geolocation: { longitude: -100.98, latitude: 22.15, accuracy: 20 } }, async page => {
  await openGuide(page)
  await page.getByRole('button', { name: 'Usar mi ubicación', exact: true }).click()
  await page.getByText('Tu ubicación está fuera de la zona urbana de Valles. Puedes explorar por nombre.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Usar mi ubicación', exact: true }).getAttribute('aria-pressed'), 'false')
  assert.equal(await page.locator('.stop-copy').filter({ hasText: 'en línea recta' }).count(), 0)
  assert.equal(await page.locator('.stop-card').count(), 27)
}))

test('QR guidance uses the official portal and reporting copies a draft without sending it', { timeout: 45000 }, () => check('help-qr-report-draft-only', { permissions: ['clipboard-read', 'clipboard-write'] }, async (page, _context, evidence) => {
  await openGuide(page)
  await selectTecnologico(page)
  await page.getByRole('button', { name: 'Antes de salir', exact: true }).click()
  const qr = page.getByRole('link', { name: 'Abrir registro oficial de SCT', exact: true })
  assert.equal(await qr.getAttribute('href'), 'https://redmetrovalles.sctslp.com/')
  assert.equal(await qr.getAttribute('target'), '_blank')
  await page.locator('summary').filter({ hasText: 'Horarios, regreso y llegadas' }).click()
  assert.equal(await page.getByText('La guía no simula posiciones ni minutos de llegada.', { exact: true }).isVisible(), true)
  await page.locator('summary').filter({ hasText: 'Preparar una consulta o reporte' }).click()
  assert.match(await page.locator('.report-form').innerText(), /Referencia: Tecnológico, Punto A/)
  await page.getByLabel('Motivo', { exact: true }).selectOption('Dificultad de acceso al paradero')
  await page.locator('#report-detail').fill('Cruce peatonal por revisar. Borrador de prueba, no enviar.')
  await page.getByRole('button', { name: 'Copiar borrador', exact: true }).click()
  await page.getByText('Borrador copiado. Revísalo y envíalo tú por un canal oficial.', { exact: true }).waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(copied, /Línea: L1 Universitaria/)
  assert.match(copied, /Dificultad de acceso al paradero/)
  assert.match(copied, /Cruce peatonal por revisar/)
  assert.match(copied, /Punto de referencia: Tecnológico, Punto A \(OSM; sentido por confirmar\)/)
  assert.deepEqual(evidence.requests.filter(request => !['GET', 'HEAD'].includes(request.method)), [], 'A report must not submit anything')
}))

test('mobile selection has reachable save, share, back and navigation without horizontal overflow', { timeout: 45000 }, () => check('mobile-detail-navigation', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
  await openGuide(page)
  await assertNoOverflow(page)
  await selectTecnologico(page)
  await page.waitForFunction(() => document.activeElement?.matches('.selected-title h2'))
  assert.equal(await page.getByRole('heading', { name: 'Tecnológico', exact: true }).evaluate(heading => heading === document.activeElement), true)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('.app-workspace.has-selected') && document.activeElement?.matches('.stop-select'))
  assert.match(await page.evaluate(() => document.activeElement?.textContent), /Tecnológico/)
  assert.equal(new URL(page.url()).searchParams.has('punto'), false)
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.matches('.selected-title h2'))
  assert.equal(await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).isVisible(), true)
  assert.equal(await page.getByRole('button', { name: 'Copiar enlace del punto', exact: true }).isVisible(), true)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  const back = page.getByRole('button', { name: 'Volver a la lista', exact: true })
  await back.scrollIntoViewIfNeeded()
  const backBox = await back.boundingBox(), navBox = await page.getByRole('navigation', { name: 'Secciones de MiRedMetro', exact: true }).boundingBox()
  assert.ok(backBox && navBox && backBox.y + backBox.height <= navBox.y + 1, 'The back action must not be covered by bottom navigation')
  await assertNoOverflow(page)
  await back.click()
  assert.equal(new URL(page.url()).searchParams.has('punto'), false)
  assert.equal(await page.locator('.trip-panel').isVisible(), true)
  await page.getByRole('button', { name: /Guardados/ }).click()
  assert.equal(await page.locator('.stop-card').count(), 1)
  await page.getByRole('button', { name: 'Antes de salir', exact: true }).click()
  assert.equal(await page.getByRole('heading', { name: 'Viaja con información clara', exact: true }).isVisible(), true)
  await assertNoOverflow(page)
}))

test('a deliberate OpenFreeMap failure preserves the searchable and saveable list', { timeout: 45000 }, () => check('map-network-failure-list-fallback', { allowMapFailure: true }, async page => {
  await page.route('https://tiles.openfreemap.org/**', route => route.abort('failed'))
  await openGuide(page)
  await page.getByText('El mapa no pudo cargar', { exact: true }).waitFor({ timeout: 25000 })
  assert.equal(await page.locator('.stop-card').count(), 27)
  await selectTecnologico(page)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  await page.getByRole('button', { name: /Guardados/ }).click()
  assert.equal(await page.locator('.stop-card').count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Reintentar mapa', exact: true }).isVisible(), true)
}))

test('a failed map module has an error boundary with usable list, saves and recovery', { timeout: 60000 }, () => check('map-module-failure-boundary', { allowModuleFailure: true }, async page => {
  const modulePattern = /\/assets\/TransitMap-[^/?]+\.js(?:\?.*)?$/
  await page.route(modulePattern, route => route.abort('failed'))
  await openGuide(page)
  await page.getByText('El mapa no está disponible', { exact: true }).waitFor()
  assert.equal(await page.locator('.stop-card').count(), 27)
  await selectTecnologico(page)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  await page.getByRole('button', { name: /Guardados/ }).click()
  assert.equal(await page.locator('.stop-card').count(), 1)
  await page.unroute(modulePattern)
  await Promise.all([page.waitForEvent('domcontentloaded'), page.getByRole('button', { name: 'Volver a cargar el mapa', exact: true }).click()])
  await page.locator('.transit-map[data-map-status="ready"][data-map-settled="true"]').waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: /Guardados/ }).click()
  assert.equal(await page.locator('.stop-card').count(), 1)
}))

test('the production service worker preserves cached list and favorites during an offline reload', { timeout: 60000 }, () => check('offline-cached-guide-and-favorites', { allowOffline: true }, async (page, context, evidence) => {
  await openGuide(page)
  await page.locator('.transit-map[data-map-status="ready"][data-map-settled="true"]').waitFor({ timeout: 30000 })
  await selectTecnologico(page)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  await page.getByRole('button', { name: 'Cerrar detalle del punto', exact: true }).click()
  await waitForOfflineRelease(page, evidence)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Universitaria', exact: true }).waitFor()
  await page.getByText('Sin conexión. Puedes consultar esta página; el mapa base y los datos de unidades necesitan internet.', { exact: true }).waitFor()
  assert.equal(await page.locator('.stop-card').count(), 27)
  await page.getByRole('button', { name: /Guardados/ }).click()
  assert.equal(await page.locator('.stop-card').count(), 1)
  assert.match(await page.locator('.stop-card').innerText(), /Tecnológico/)
  assert.equal(await page.getByText('Sin conexión', { exact: true }).isVisible(), true)
  assert.equal(await page.locator('.received-vehicles').count(), 0)
}))

test('a complete release replaces an owned 5.9 MB legacy cache before offline use', { timeout: 60000 }, () => check('offline-atomic-upgrade-legacy-cache', { allowOffline: true }, async (page, context, evidence) => {
  // Only a deliberately generated browser fixture, never data or app resources.
  const bootstrap = new URL('__offline-upgrade-test-bootstrap__', mobilityUrl).href
  await page.route(bootstrap, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="icon" href="data:,"><title>Offline upgrade test bootstrap</title></head><body>Browser test fixture only.</body></html>' }))
  await page.goto(bootstrap)
  const seed = await page.evaluate(async () => {
    const cache = await caches.open('valles-mobility-v1')
    const oldAsset = new URL('old-release-fixture.js', location.href).href
    await cache.put(oldAsset, new Response('x'.repeat(5_900_000), { headers: { 'content-type': 'text/javascript' } }))
    await cache.put(new URL('./', location.href).href, new Response('<!doctype html><title>Owned old test fixture</title><script src="old-release-fixture.js"></script>', { headers: { 'content-type': 'text/html' } }))
    return { name: 'valles-mobility-v1', bytes: (await (await cache.match(oldAsset)).arrayBuffer()).byteLength }
  })
  await page.unroute(bootstrap)
  assert.equal(seed.bytes, 5_900_000)
  await openGuide(page)
  const manifest = await waitForOfflineRelease(page, evidence)
  assert.equal(await page.evaluate(name => caches.has(name), seed.name), false, 'Remove the old owned cache only once the complete release activates')
  const remaining = await page.evaluate(() => caches.keys())
  assert.deepEqual(remaining.filter(name => name.startsWith('valles-mobility-')), [manifest.cacheName])
  evidence.metrics = { ...evidence.metrics, upgradeSeed: { ...seed, syntheticTestOnly: true }, legacyRemovedAfterActivation: true }
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Universitaria', exact: true }).waitFor()
  assert.equal(await page.locator('.stop-card').count(), 27)
  assert.equal(await page.getByText('Sin conexión', { exact: true }).isVisible(), true)
  assert.equal(await page.locator('.received-vehicles').count(), 0)
}))
