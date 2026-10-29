import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const prefix = process.env.VITE_BASE_PATH || '/'
const origin = process.env.MOBILITY_TOOLS_BASE_URL || `http://127.0.0.1:4182${prefix}`
const url = new URL('movilidad/?vista=red', origin.endsWith('/') ? origin : `${origin}/`).href
const artifacts = new URL('../../.work/metrored-prototype/qa/', import.meta.url)
const results = []
let browser, server

before(async () => {
  if (!process.env.MOBILITY_TOOLS_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4182', '--strictPort'], { stdio: 'pipe' })
    let ready = false
    for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) { ready = true; break } } catch {} await delay(250) }
    assert.ok(ready, 'Production preview must start before testing')
  }
  const executablePath = [process.env.E2E_BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(value => value && existsSync(value))
  assert.ok(executablePath, 'Reuse an installed browser')
  browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] })
}, { timeout: 30000 })
after(async () => { await browser?.close(); server?.kill(); await mkdir(artifacts, { recursive: true }); await writeFile(new URL('creative-tools-e2e-report.json', artifacts), JSON.stringify({ url, date: new Date().toISOString(), results }, null, 2)) })

async function check(name, settings, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/Mexico_City', ...settings })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await page.goto(url)
    await page.getByRole('heading', { name: 'Universitaria', exact: true }).waitFor()
    await run(page, context)
    assert.deepEqual(errors, [], 'New journey tools must not produce browser errors')
    results.push({ name, status: 'passed' })
  } catch (error) {
    await mkdir(artifacts, { recursive: true })
    const screenshot = `${name}.jpg`
    await page.screenshot({ path: fileURLToPath(new URL(screenshot, artifacts)), type: 'jpeg', quality: 78 }).catch(() => {})
    results.push({ name, status: 'failed', error: error.message, errors, screenshot })
    throw error
  } finally { await context.close() }
}
async function selectPoint(page, text = 'Tecnologico') {
  await page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true }).fill(text)
  await page.locator('.stop-select').first().click()
  await page.locator('.selected-card').waitFor()
}

test('operator card asks the passenger intention and native dialog restores focus without closing the point', () => check('operator-intention-dialog', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
  await selectPoint(page)
  const trigger = page.getByRole('button', { name: 'Preguntar al operador', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('heading', { name: '¿Cómo usarás este punto?', exact: true }).waitFor()
  await dialog.getByRole('button', { name: /Quiero llegar aquí/ }).click()
  await dialog.getByRole('heading', { name: 'Quiero llegar a Tecnológico. ¿Esta unidad pasa por ahí y dónde debo bajar?', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(), 0)
  assert.equal(await page.locator('.selected-card').count(), 1)
  assert.equal(await trigger.evaluate(element => element === document.activeElement), true)
  await trigger.click()
  await page.getByRole('dialog').getByRole('button', { name: /Necesito regresar desde aquí/ }).click()
  assert.match(await page.getByRole('dialog').innerText(), /cuál es la última salida de hoy/)
  assert.equal(/sale a las \d|llega en \d/.test(await page.getByRole('dialog').innerText()), false)
  await page.getByRole('button', { name: 'Cerrar consulta al operador', exact: true }).click()
}))

test('private note persists but is excluded from both copied and downloaded public cards', () => check('private-note-portable-card', { permissions: ['clipboard-read', 'clipboard-write'] }, async page => {
  await selectPoint(page)
  await page.getByRole('button', { name: 'Guardar punto seleccionado', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Mi referencia personal' }).click()
  const privateNote = 'Mi referencia privada QA <img src=x onerror=alert(1)>'
  await page.getByLabel('Una pista para reconocer este punto', { exact: true }).fill(privateNote)
  await page.getByRole('button', { name: 'Guardar nota', exact: true }).click()
  await page.reload()
  await page.locator('.selected-card').waitFor()
  await page.locator('summary').filter({ hasText: 'Mi referencia personal' }).click()
  assert.equal(await page.getByLabel('Una pista para reconocer este punto', { exact: true }).inputValue(), privateNote)
  assert.equal(await page.locator('.private-note-preview img').count(), 0)
  await page.locator('summary').filter({ hasText: 'Llevar esta referencia conmigo' }).click()
  await page.getByRole('button', { name: 'Copiar ficha', exact: true }).click()
  await page.getByText('Ficha copiada con fuente y enlace. Tu nota privada no se compartió.', { exact: true }).waitFor()
  const card = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(card, /Tecnológico/)
  assert.match(card, /por confirmar/)
  assert.match(card, /openstreetmap.org/)
  assert.equal(card.includes(privateNote), false)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar TXT', exact: true }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const downloaded = Buffer.concat(chunks).toString('utf8')
  // Windows clipboard text uses CRLF; TXT keeps LF. Compare the content, not OS separators.
  assert.equal(downloaded.replaceAll('\r\n', '\n'), card.replaceAll('\r\n', '\n'))
  assert.ok(Buffer.byteLength(downloaded) < 2000)
  await download.delete()
}))

test('refresh after moving updates proximity and old passenger samples expire visibly', () => check('passenger-location-refresh-expiry', { permissions: ['geolocation'], geolocation: { longitude: -99.0112, latitude: 21.9963, accuracy: 20 } }, async (page, context) => {
  await page.getByRole('button', { name: 'Usar mi ubicación', exact: true }).click()
  await page.getByRole('button', { name: 'Actualizar mi ubicación', exact: true }).waitFor()
  assert.match(await page.locator('.stop-select').first().innerText(), /Hospital General IMSS/)
  await context.setGeolocation({ longitude: -99.0353392, latitude: 22.0216506, accuracy: 20 })
  await page.getByRole('button', { name: 'Actualizar mi ubicación', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.stop-select')?.textContent?.includes('Tecnológico'))
  assert.match(await page.locator('.location-freshness').innerText(), /hace unos segundos/)
  await page.clock.install()
  await page.clock.fastForward(130000)
  await page.getByText('Tu ubicación tiene más de dos minutos. Actualízala para consultar cercanía.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Actualizar mi ubicación', exact: true }).count(), 0)
  assert.equal(await page.locator('.stop-copy').filter({ hasText: 'en línea recta' }).count(), 0)
}))

test('landscape 844 by 390 reaches a real stop through ordinary panel scrolling', () => check('landscape-reachable-stop', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, async page => {
  const search = page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true })
  await search.scrollIntoViewIfNeeded()
  await search.fill('IMSS 6')
  assert.equal(await page.locator('.stop-card').count(), 2)
  const stop = page.locator('.stop-select').first()
  await stop.scrollIntoViewIfNeeded()
  const box = await stop.boundingBox()
  assert.ok(box && box.y >= 0 && box.y + box.height <= 390, 'A real result must be fully visible, not clipped outside the panel')
  await stop.click()
  await page.getByRole('button', { name: 'Preguntar al operador', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
}))

test('UASLP is a discoverable destination reference without becoming an invented stop', () => check('reference-is-not-stop', {}, async page => {
  await page.getByRole('textbox', { name: 'Buscar paradero por nombre', exact: true }).fill('UASLP')
  assert.equal(await page.locator('.stop-card').count(), 0)
  const reference = page.getByRole('region', { name: 'Lugares de referencia, no paraderos', exact: true })
  await reference.getByRole('heading', { name: 'UASLP · Campus Huasteca', exact: true }).waitFor()
  assert.match(await reference.innerText(), /no es un paradero ni una entrada accesible/)
  assert.equal(await reference.getByRole('link', { name: 'Ver lugar en OpenStreetMap', exact: true }).getAttribute('href'), 'https://www.openstreetmap.org/way/300701643')
  assert.equal(await page.locator('.received-vehicles').count(), 0)
}))
