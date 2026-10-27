import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { PerspectiveCamera, Vector3 } from 'three'

const basePath = process.env.VITE_BASE_PATH || '/'
const baseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:4177${basePath}`
const artifacts = new URL('../../.work/qa/latest/', import.meta.url)
const results = []
let browser, server

before(async () => {
  if (!process.env.E2E_BASE_URL) {
    assert.ok(existsSync('dist/index.html'), 'Run npm run build before the E2E suite.')
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4177', '--strictPort'], { stdio: 'pipe', env: process.env })
    let output = ''
    server.stdout.on('data', data => { output = (output + data).slice(-4000) })
    server.stderr.on('data', data => { output = (output + data).slice(-4000) })
    let ready = false
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`Preview exited: ${output}`)
      try { if ((await fetch(baseUrl)).ok) { ready = true; break } } catch { /* Startup only. */ }
      await delay(250)
    }
    assert.ok(ready, `Preview did not become available: ${output}`)
  }
  const candidates = [process.env.E2E_BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
  const executablePath = candidates.find(path => existsSync(path))
  browser = await chromium.launch({ executablePath, headless: true })
}, { timeout: 40000 })

after(async () => {
  await browser?.close()
  server?.kill()
  await mkdir(artifacts, { recursive: true })
  await writeFile(new URL('report.json', artifacts), JSON.stringify({ date: new Date().toISOString(), basePath, results }, null, 2))
})

async function check(name, options, run) {
  const { allowedResponses = [], allowedConsole = [], ...contextOptions } = options
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...contextOptions })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  const errors = []
  const failureFile = `${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.jpg`
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.status() >= 400 && !allowedResponses.some(rule => response.status() === rule.status && new URL(response.url()).pathname.endsWith(rule.path))) errors.push(`HTTP ${response.status()}: ${response.url()}`)
  })
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`Request failed: ${request.url()}: ${request.failure()?.errorText}`)
  })
  page.on('console', message => {
    if (message.type() === 'error' && !allowedConsole.some(rule => rule.test(message.text())) && !allowedResponses.some(rule => message.location().url?.endsWith(rule.path) && message.text().includes(String(rule.status)))) errors.push(`Console: ${message.text()}`)
  })
  const started = performance.now()
  try {
    await run(page, context)
    assert.deepEqual(errors, [], 'Unexpected application errors')
    await rm(new URL(failureFile, artifacts), { force: true })
    results.push({ name, status: 'passed', durationMs: Math.round(performance.now() - started) })
  } catch (error) {
    const file = failureFile
    await mkdir(artifacts, { recursive: true })
    await page.screenshot({ path: fileURLToPath(new URL(file, artifacts)), type: 'jpeg', quality: 78, scale: 'css' }).catch(() => {})
    results.push({ name, status: 'failed', error: error.message, durationMs: Math.round(performance.now() - started), screenshot: file })
    throw error
  } finally { await context.close() }
}

async function openGuide(page, suffix = '') {
  await page.goto(`${baseUrl}${suffix}`)
  await page.locator('.city-scene.is-ready canvas').waitFor()
  if (page.viewportSize().width > 760) await page.locator('.sg-place-preview img').waitFor()
}

async function enterPov(page) {
  const expand = page.getByRole('button', { name: 'Expandir ficha del lugar', exact: true })
  if (await expand.isVisible()) await expand.click()
  await page.getByRole('button', { name: 'Explorar desde aquí', exact: true }).click()
  await page.locator('.sg-place-panel.compact').waitFor()
  assert.equal(await page.locator('.sg-in-pov').count(), 1)
}

const cameraPoint = async page => {
  const value = await page.locator('.guide-mini-map .guide-mini-camera').getAttribute('transform')
  const point = /translate\(([-\d.e+]+),([\-\d.e+]+)\)/i.exec(value || '')?.slice(1).map(Number)
  assert.ok(point?.length === 2 && point.every(Number.isFinite), 'Camera position must be present and finite')
  return point
}
async function waitForMovement(page, previous) {
  await page.waitForFunction(previousPoint => {
    const value = document.querySelector('.guide-mini-map .guide-mini-camera')?.getAttribute('transform')
    const point = /translate\(([-\d.e+]+),([\-\d.e+]+)\)/i.exec(value || '')?.slice(1).map(Number)
    return point?.length === 2 && point.every(Number.isFinite) && Math.hypot(point[0] - previousPoint[0], point[1] - previousPoint[1]) > .01
  }, previous)
}

async function assertFrustum(page) {
  const canvas = await page.locator('.city-scene canvas').boundingBox()
  const camera = new PerspectiveCamera(70, canvas.width / canvas.height, .1, 1000)
  camera.updateProjectionMatrix(); camera.updateMatrixWorld()
  const left = new Vector3(-1, 0, .5).unproject(camera).normalize()
  const right = new Vector3(1, 0, .5).unproject(camera).normalize()
  const expectedAngle = left.angleTo(right)
  await page.waitForFunction(expected => {
    const path = document.querySelector('.guide-mini-map .guide-mini-frustum')?.getAttribute('d')
    const n = path?.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number)
    if (!n || n.length !== 6) return false
    const a = [n[2] - n[0], n[3] - n[1]], b = [n[4] - n[0], n[5] - n[1]]
    const angle = Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b)))
    return Math.abs(angle - expected) < .01
  }, expectedAngle)
}

test('shared guide validates identities, persists edits and exports real text', () => check('shared-guide', {}, async page => {
  await openGuide(page, '?guide=jardin-hidalgo,hostal-del-cafe,jardin-hidalgo,__proto__,unknown')
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.locator('.sg-saved-list li').count(), 2)
  await page.getByRole('button', { name: 'Quitar Plaza Principal · Jardín Hidalgo de mi guía', exact: true }).click()
  assert.equal(new URL(page.url()).searchParams.get('guide'), 'hostal-del-cafe')
  await page.goto(baseUrl) // Omit the shared URL: this must come from persisted storage.
  await page.getByRole('button', { name: /Mi guía/ }).click()
  await page.locator('.sg-saved-list li').waitFor()
  assert.equal(await page.locator('.sg-saved-list li').count(), 1)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar guía', exact: true }).click()
  const download = await downloading
  const text = await readFile(await download.path(), 'utf8')
  assert.match(text, /Hotel Hostal Del Café\nHospedaje/)
  assert.match(text, /Fuente: https:\/\//)
  assert.doesNotMatch(text, /__proto__|unknown/)
  await page.getByRole('button', { name: 'Quitar Hotel Hostal Del Café de mi guía', exact: true }).click()
  assert.equal(new URL(page.url()).searchParams.has('guide'), false)
  assert.equal(await page.getByRole('button', { name: 'Descargar guía', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Cerrar guía', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: /Mi guía/ }).click()
  assert.equal(await page.locator('.sg-plan-empty').isVisible(), true)
}))

test('POV keyboard navigation never enters the closed directory', () => check('pov-focus', {}, async page => {
  await openGuide(page)
  await page.getByRole('textbox', { name: 'Buscar en la guía', exact: true }).fill('plaza')
  await page.locator('.sg-place-list').getByRole('button', { name: /Plaza Principal/ }).press('Enter')
  await page.locator('.sg-place-panel.compact').waitFor()
  await page.waitForFunction(() => document.activeElement?.matches('.sg-pov-bar button'))
  assert.equal(await page.getByRole('button', { name: 'Volver a Xilitla', exact: true }).evaluate(button => button === document.activeElement && button.matches(':focus-visible')), true)
  for (let step = 0; step < 35; step++) {
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('.sg-directory'))), false)
  }
  await page.keyboard.press('Escape')
  await page.locator('.sg-place-panel.expanded').waitFor()
  assert.equal(await page.locator('.sg-in-pov').count(), 0)
}))

test('mobile keyboard walking stops and the minimap matches horizontal camera rays', () => check('mobile-walking-frustum', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
  await openGuide(page)
  await enterPov(page)
  await assertFrustum(page)
  const forward = page.getByRole('button', { name: 'Caminar hacia adelante', exact: true })
  await forward.focus()
  const previous = await cameraPoint(page)
  await page.keyboard.down('Space')
  await waitForMovement(page, previous)
  await page.keyboard.up('Space')
  await delay(200) // Allow the last throttled camera notification, then check a stopped interval.
  const stopped = await cameraPoint(page)
  await delay(300)
  assert.deepEqual(await cameraPoint(page), stopped, 'Releasing Space must stop walking')
  const beforeEnter = await cameraPoint(page)
  await page.keyboard.down('Enter')
  await waitForMovement(page, beforeEnter)
  await page.getByRole('button', { name: 'Ampliar mapa local', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await delay(200)
  const modalPosition = await cameraPoint(page)
  await delay(300)
  assert.deepEqual(await cameraPoint(page), modalPosition, 'A modal must suspend walking while the key remains held')
  await page.keyboard.up('Enter')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.sg-in-pov').count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Ampliar mapa local', exact: true }).evaluate(button => button === document.activeElement), true)
  await page.setViewportSize({ width: 1440, height: 900 })
  await assertFrustum(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await assertFrustum(page)
  await page.getByRole('button', { name: 'Despejar vista', exact: true }).click()
  assert.equal(await page.locator('.sg-header').isVisible(), false)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  await page.getByRole('button', { name: 'Ver ficha', exact: true }).click()
  assert.equal(await page.locator('.sg-header').isVisible(), true)
}))

test('the studio still creates, reopens and removes a local package', () => check('studio-package', {}, async page => {
  await openGuide(page)
  await page.getByRole('button', { name: 'Estudio', exact: true }).click()
  await page.getByRole('button', { name: 'Crear paquete', exact: true }).click()
  await page.getByLabel('Nombre de la experiencia', { exact: true }).fill('QA · Ruta de prueba')
  await page.getByLabel('Descripción', { exact: true }).fill('Experiencia desechable de la prueba de regresión.')
  await page.locator('.destination-picker').getByRole('button', { name: /Tamul/ }).click()
  await page.locator('.destination-picker').getByRole('button', { name: /Xilitla/ }).click()
  await page.getByRole('button', { name: 'Guardar paquete', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Estudio', exact: true }).click()
  await page.getByRole('button', { name: 'Editar QA · Ruta de prueba', exact: true }).click()
  assert.equal(await page.locator('.editor-stop-list li').count(), 2)
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await page.getByRole('button', { name: 'Sí, eliminar', exact: true }).click()
  assert.equal(await page.getByText('QA · Ruta de prueba', { exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Guía inmersiva', exact: true }).click()
  await page.locator('.sg-place-preview img').waitFor()
}))

test('without WebGL the urban plan remains selectable', () => check('no-webgl', { allowedConsole: [/THREE\.WebGLRenderer: Error creating WebGL context/] }, async (page, context) => {
  await context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/i.test(type) ? null : getContext.call(this, type, ...args) }
  })
  await page.goto(baseUrl)
  await page.locator('.city-fallback').waitFor()
  await page.locator('.city-fallback [role=button]').filter({ hasText: 'Templo' }).click()
  assert.match(await page.locator('.sg-place-title h2').innerText(), /San Agustín/)
  assert.equal(await page.getByRole('button', { name: 'Explorar desde aquí', exact: true }).count(), 0)
  assert.match(await page.getByRole('link', { name: 'Abrir ubicación', exact: true }).getAttribute('href'), /^https:\/\/www\.openstreetmap\.org\//)
}))

test('a missing geometry file offers a working regional directory', () => check('missing-geometry', { allowedResponses: [{ path: '/guide/xilitla-center.json', status: 503 }] }, async page => {
  await page.route('**/guide/xilitla-center.json', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'Explorar la región', exact: true }).click()
  assert.equal(await page.locator('.sg-place-row').count(), 19)
  await page.getByRole('button', { name: 'Servicios', exact: true }).click()
  assert.match(await page.locator('.sg-place-list').innerText(), /Información local de Xilitla/)
}))
