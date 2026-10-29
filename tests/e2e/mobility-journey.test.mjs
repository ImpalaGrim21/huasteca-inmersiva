import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// Uses a supplied preview, or serves the existing production build on its own
// port for verify/CI. It never builds, installs browsers or simulates buses.
const rawBasePath = process.env.VITE_BASE_PATH || '/'
const basePath = `/${rawBasePath.split('/').filter(Boolean).join('/')}${rawBasePath === '/' ? '' : '/'}`
const suppliedBase = process.env.E2E_BASE_URL || `http://127.0.0.1:4183${basePath}`
const baseUrl = suppliedBase.endsWith('/') ? suppliedBase : `${suppliedBase}/`
const mobilityUrl = new URL(baseUrl).pathname.endsWith('/movilidad/') ? baseUrl : new URL('movilidad/', baseUrl).href
const artifacts = new URL('../../.work/metrored-next/journey-e2e/', import.meta.url)
const results = []
let browser, server

before(async () => {
  if (!process.env.E2E_BASE_URL) {
    assert.ok(existsSync('dist/movilidad/index.html'), 'Run the production build before the journey E2E suite.')
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4183', '--strictPort'], { stdio: 'pipe', windowsHide: true, env: process.env })
    let output = ''
    server.stdout.on('data', data => { output = (output + data).slice(-4000) })
    server.stderr.on('data', data => { output = (output + data).slice(-4000) })
    let ready = false
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`Journey preview exited: ${output}`)
      try { if ((await fetch(mobilityUrl)).ok) { ready = true; break } } catch { /* Preview startup only. */ }
      await delay(250)
    }
    assert.ok(ready, `Journey preview did not become available: ${output}`)
  }
  const response = await fetch(mobilityUrl)
  assert.equal(response.status, 200, `Existing production preview must serve ${mobilityUrl}`)
  const candidates = [process.env.E2E_BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
  const executablePath = candidates.find(path => existsSync(path))
  assert.ok(executablePath, 'Use the existing Chrome/Chromium; do not download another browser.')
  browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] })
  await mkdir(artifacts, { recursive: true })
}, { timeout: 30000 })

after(async () => {
  await browser?.close()
  server?.kill()
  await mkdir(artifacts, { recursive: true })
  await writeFile(new URL('report.json', artifacts), JSON.stringify({ date: new Date().toISOString(), mobilityUrl, basePath, managedPreview: !process.env.E2E_BASE_URL, scope: 'Production preview; isolated Chrome contexts; manual journey phases; real OpenFreeMap; no bus fixtures or external messages.', results }, null, 2))
})

async function check(name, run, { viewport = { width: 390, height: 844 }, allowOffline = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'es-MX' })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  const errors = [], expectedNetworkFailures = []
  const row = { name, viewport, release: null, result: 'RUNNING', errors, expectedNetworkFailures }
  const started = performance.now()
  const offlineError = text => allowOffline && /ERR_INTERNET_DISCONNECTED|Failed to fetch|AJAXError/i.test(text)
  page.on('pageerror', error => errors.push(`Page: ${error.message}`))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    ;(offlineError(text) ? expectedNetworkFailures : errors).push(`Console: ${text}`)
  })
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`) })
  page.on('requestfailed', request => {
    const text = request.failure()?.errorText || 'Unknown request failure'
    if (text === 'net::ERR_ABORTED') return
    ;(offlineError(text) ? expectedNetworkFailures : errors).push(`Request: ${text}: ${request.url()}`)
  })
  try {
    const response = await page.goto(mobilityUrl, { waitUntil: 'domcontentloaded' })
    assert.equal(response.status(), 200)
    await page.getByRole('heading', { level: 1, name: '¿A dónde vamos?' }).waitFor()
    row.release = await page.locator('meta[name="valles-offline-version"]').getAttribute('content')
    await run(page, context, row)
    assert.deepEqual(errors, [], 'Unexpected browser or network errors')
    row.result = 'PASS'
  } catch (error) {
    row.result = 'FAIL'
    row.message = error.message
    const file = `${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.jpg`
    await page.screenshot({ path: fileURLToPath(new URL(file, artifacts)), type: 'jpeg', quality: 65 }).catch(() => {})
    row.screenshot = file
    throw error
  } finally {
    row.durationMs = Math.round(performance.now() - started)
    results.push(row)
    await context.close()
  }
}

async function choosePlace(page, role, place) {
  await page.getByRole('button', { name: role === 'origin' ? /^SALES DESDE / : /^QUIERES LLEGAR A / }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('searchbox').fill(place)
  const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await dialog.getByRole('button', { name: new RegExp(`^${escaped}(?:\\s|$)`) }).first().click()
  await dialog.waitFor({ state: 'hidden' })
}

async function prepareCentroImss(page) {
  await choosePlace(page, 'destination', 'IMSS 6')
  await choosePlace(page, 'origin', 'Centro')
  await page.getByRole('button', { name: 'Preparar mi viaje', exact: true }).click()
  await page.getByRole('heading', { level: 1, name: /Vamos a.*IMSS 6/ }).waitFor()
}

async function carryTrip(page) {
  await page.getByRole('button', { name: 'Llevar este viaje conmigo', exact: true }).click()
  await page.getByRole('heading', { level: 1, name: /Antes de subir/ }).waitFor()
}

async function confirmBoarding(page) {
  const board = page.getByRole('button', { name: 'Ya subí · acompañar mi viaje', exact: true })
  assert.equal(await board.isEnabled(), false, 'No boarding before confirmation')
  await page.getByRole('checkbox', { name: 'Estoy en el punto de abordaje que acordé.', exact: true }).check()
  assert.equal(await board.isEnabled(), false, 'One confirmation must not unlock boarding')
  await page.getByRole('checkbox', { name: 'Confirmé con el operador el destino y dónde bajar.', exact: true }).check()
  assert.equal(await board.isEnabled(), true)
  await board.click()
  await page.getByRole('heading', { level: 1, name: /Durante el viaje/ }).waitFor()
}

async function headingInViewport(page) {
  const heading = page.getByRole('main').getByRole('heading', { level: 1 }).first()
  await page.waitForFunction(() => {
    const main = document.querySelector('main'), heading = main?.querySelector('h1')
    if (!main || !heading) return false
    const a = main.getBoundingClientRect(), b = heading.getBoundingClientRect()
    return b.top >= a.top - 2 && b.bottom <= a.bottom + 2
  })
  assert.ok(await heading.isVisible(), 'The new phase heading must remain visible')
}

async function finishManualTrip(page) {
  await page.getByRole('button', { name: 'Estoy cerca · preparar mi bajada', exact: true }).click()
  await page.getByRole('heading', { level: 1, name: /Prepara tu bajada/ }).waitFor()
  await page.getByRole('button', { name: /^Ya bajé/ }).click()
  const arrived = page.getByRole('button', { name: /^Ya llegué/ })
  await arrived.waitFor()
  assert.equal(await page.getByRole('heading', { level: 1, name: /^Ya llegaste/ }).count(), 0, 'Alighting must not declare arrival at the place')
  await arrived.click()
  await page.getByRole('button', { name: 'Preparar mi regreso', exact: true }).waitFor()
}

test('Centro → IMSS: confirmaciones, tramo final y regreso con nueva confirmación', { timeout: 60000 }, async () => {
  await check('centro-imss-round-trip', async page => {
    await prepareCentroImss(page)
    await carryTrip(page)
    await confirmBoarding(page)
    await finishManualTrip(page)
    await page.getByRole('button', { name: 'Preparar mi regreso', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: /Vamos a.*Centro/ }).waitFor()
    assert.match(await page.getByRole('main').innerText(), /IMSS 6/)
    await carryTrip(page)
    assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 0, 'Return must not inherit outbound boarding confirmations')
    await confirmBoarding(page)
    assert.match(await page.getByRole('heading', { level: 1 }).innerText(), /Centro/)
  })
})

test('ayuda conserva el viaje y recargar exige retomar explícitamente', { timeout: 45000 }, async () => {
  await check('help-and-explicit-resume', async page => {
    await prepareCentroImss(page)
    await carryTrip(page)
    await confirmBoarding(page)
    await page.getByRole('button', { name: 'Ayuda', exact: true }).click()
    await page.getByRole('button', { name: 'Mi viaje', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: /Durante el viaje/ }).waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    const recovery = page.getByRole('region', { name: 'Recuperar viaje', exact: true })
    await recovery.waitFor()
    assert.match(await recovery.innerText(), /IMSS 6/)
    assert.equal(await page.getByRole('heading', { level: 1, name: /Durante el viaje/ }).count(), 0, 'Reload cannot silently assert the passenger is still onboard')
    await recovery.getByRole('button', { name: 'Retomar viaje', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: /Durante el viaje/ }).waitFor()
    assert.equal(await recovery.count(), 0)
  })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`cambio de pantalla/fase conserva contexto visible ${viewport.width}x${viewport.height}`, { timeout: 45000 }, async () => {
    await check(`phase-scroll-${viewport.width}x${viewport.height}`, async page => {
      await prepareCentroImss(page)
      const alternatives = page.getByRole('button', { name: /^Opción \d/ })
      const labels = await alternatives.allTextContents()
      assert.ok(labels.length >= 2, 'This trip must expose its alternative cartographic points')
      assert.equal(new Set(labels.map(text => text.replace(/\s+/g, ' ').trim())).size, labels.length, 'Alternative labels must distinguish the chosen points')
      await page.getByRole('main').hover()
      await page.mouse.wheel(0, 600)
      await carryTrip(page)
      await headingInViewport(page)
      await confirmBoarding(page)
      await headingInViewport(page)
      await page.getByRole('button', { name: 'Estoy cerca · preparar mi bajada', exact: true }).click()
      await headingInViewport(page)
      const overflow = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, main: document.querySelector('main').scrollWidth, mainWidth: document.querySelector('main').clientWidth }))
      assert.ok(overflow.page <= overflow.viewport + 1, 'No page horizontal overflow')
      assert.ok(overflow.main <= overflow.mainWidth + 1, 'No main horizontal overflow')
    }, { viewport })
  })
}

test('sin internet: el viaje guardado se recupera con confirmación, sin flota inventada', { timeout: 60000 }, async () => {
  await check('offline-journey-resume', async (page, context) => {
    await prepareCentroImss(page)
    await carryTrip(page)
    await confirmBoarding(page)
    await page.getByRole('button', { name: 'Guía lista sin internet', exact: true }).waitFor({ timeout: 25000 })
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('region', { name: 'Recuperar viaje', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Retomar viaje', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: /Durante el viaje/ }).waitFor()
    assert.match(await page.getByRole('main').innerText(), /IMSS 6/)
    assert.equal(await page.getByRole('button', { name: 'Estoy cerca · preparar mi bajada', exact: true }).isEnabled(), true)
    await context.setOffline(false)
  }, { allowOffline: true })
})

test('GPS denegado deja elegir origen manual y no mantiene el botón cargando', { timeout: 45000 }, async () => {
  await check('gps-denied-manual-origin', async (page, context) => {
    const cdp = await context.newCDPSession(page)
    const { targetInfo } = await cdp.send('Target.getTargetInfo')
    assert.ok(targetInfo.browserContextId, 'The permission test must target its isolated context')
    await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(mobilityUrl).origin, browserContextId: targetInfo.browserContextId })
    assert.equal(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state), 'denied')
    await page.getByRole('button', { name: 'Usar mi ubicación como salida', exact: true }).click()
    await page.getByText('Ubicación no autorizada. Puedes elegir tu salida por nombre.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Usar mi ubicación como salida', exact: true }).isEnabled(), true)
    await prepareCentroImss(page)
    await carryTrip(page)
    await cdp.detach()
  })
})

test('entrada vacía y búsqueda inexistente se recuperan sin perder el destino', { timeout: 45000 }, async () => {
  await check('empty-input-and-unknown-place', async page => {
    await page.getByRole('button', { name: 'Preparar mi viaje', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('heading', { name: '¿Desde dónde sales?', exact: true }).waitFor()
    await dialog.getByRole('searchbox').fill('zzzz-lugar-inexistente-qa')
    await dialog.getByText('No encontramos ese lugar en el catálogo.', { exact: true }).waitFor()
    await dialog.getByRole('searchbox').fill('Centro')
    await dialog.getByRole('button', { name: /^Centro\s/ }).first().click()
    await dialog.getByRole('heading', { name: '¿A dónde quieres llegar?', exact: true }).waitFor()
    await dialog.getByRole('searchbox').fill('IMSS 6')
    await dialog.getByRole('button', { name: /^IMSS 6\s/ }).first().click()
    await page.getByRole('heading', { level: 1, name: /Vamos a.*IMSS 6/ }).waitFor()
  })
})
