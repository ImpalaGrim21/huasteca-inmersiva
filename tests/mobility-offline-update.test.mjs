import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash, webcrypto } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const template = await readFile(new URL('../public/movilidad/sw.js', import.meta.url), 'utf8')
const clientSource = await readFile(new URL('../src/mobility/offline.ts', import.meta.url), 'utf8')
const scope = 'https://example.test/huasteca-inmersiva/movilidad/'
const version = 'b'.repeat(20)
const passenger = { id: 'passenger', type: 'window', url: scope }
const anotherPassenger = { id: 'another-passenger', type: 'window', url: `${scope}?journey=saved` }

function workerHarness(options = {}) {
  // Tiny public build bytes only. No passenger location, vehicle or ETA fixture.
  const entries = [
    ['/huasteca-inmersiva/movilidad/index.html', '<!doctype html><title>Offline package test</title>'],
    ['/huasteca-inmersiva/assets/mobility-test.js', 'export const testOnly = true;'],
  ]
  const files = entries.map(([path, text]) => ({ path, bytes: Buffer.byteLength(text), integrity: `sha256-${createHash('sha256').update(text).digest('base64')}` }))
  const build = {
    schemaVersion: 1, version, cachePrefix: 'valles-mobility-test-', cacheName: `valles-mobility-test-${version}`,
    scopePath: new URL(scope).pathname, shellPath: files[0].path, budgetBytes: 6_000_000,
    totalBytes: files.reduce((bytes, file) => bytes + file.bytes, 0), files, legacyCacheNames: [],
  }
  const handlers = new Map()
  const values = new Map(entries.map(([path, text]) => [new URL(path, scope).href, text]))
  const events = []
  let skipCount = 0
  let matchCalls = 0
  const cache = {
    async match(key) {
      const value = values.get(String(key))
      return value === undefined ? undefined : new Response(value)
    },
    async addAll(requests) { events.push({ type: 'install-batch', requests }) },
  }
  const self = {
    registration: { scope, waiting: options.waiting === false ? null : {} },
    clients: {
      async get(id) { return (options.clients ?? [passenger]).find(client => client.id === id) },
      async matchAll(query) {
        assert.equal(query.type, 'window')
        assert.equal(query.includeUncontrolled, true)
        matchCalls += 1
        return options.clientLists ? options.clientLists[Math.min(matchCalls - 1, options.clientLists.length - 1)] : options.clients ?? [passenger]
      },
      async claim() { events.push({ type: 'claim' }) },
    },
    addEventListener(type, listener) { handlers.set(type, listener) },
    async skipWaiting() { skipCount += 1; events.push({ type: 'skip-waiting' }) },
  }
  const caches = {
    async open() { return cache },
    async delete(name) { events.push({ type: 'delete', name }) },
    async keys() { return [build.cacheName, 'valles-mobility-test-previous'] },
  }
  vm.runInNewContext(template.replace('/*__MOBILITY_PRECACHE__*/ null', JSON.stringify(build)), {
    self, caches, URL, Request, Response, crypto: webcrypto, btoa,
    fetch() { throw new Error('Update verification must not fetch resources or telemetry.') },
  })
  return {
    events, values, build,
    get skipCount() { return skipCount },
    get matchCalls() { return matchCalls },
    async message(data = { type: 'ACTIVATE_OFFLINE_UPDATE' }, source = passenger, hasPort = true) {
      let task
      const replies = []
      handlers.get('message')({
        data, source,
        ports: hasPort ? [{ postMessage(reply) { replies.push(reply); events.push({ type: 'reply', reply }) } }] : [],
        waitUntil(promise) { task = promise },
      })
      await task
      return replies
    },
    async install() {
      let task
      handlers.get('install')({ waitUntil(promise) { task = promise } })
      await task
    },
  }
}

test('explicit update verifies installed SRI bytes and replies before skipWaiting', async () => {
  const worker = workerHarness()
  const replies = await worker.message()
  assert.equal(replies[0]?.result, 'updated')
  assert.equal(replies[0]?.version, version)
  assert.equal(worker.skipCount, 1)
  assert.equal(worker.matchCalls, 2)
  assert.deepEqual(worker.events.map(event => event.type), ['reply', 'skip-waiting'])
})

test('another scoped window blocks update and preserves the previous cache', async () => {
  const worker = workerHarness({ clients: [passenger, anotherPassenger] })
  const replies = await worker.message()
  assert.equal(replies[0]?.result, 'other-tabs-open')
  assert.equal(worker.skipCount, 0)
  assert.equal(worker.events.some(event => event.type === 'delete'), false)
})

test('a second scoped window opened during integrity verification also blocks update', async () => {
  const worker = workerHarness({ clientLists: [[passenger], [passenger, anotherPassenger]] })
  const replies = await worker.message()
  assert.equal(replies[0]?.result, 'other-tabs-open')
  assert.equal(worker.skipCount, 0)
})

test('tourism and unrelated same-origin windows are outside the mobility update scope', async () => {
  const worker = workerHarness({ clients: [passenger, { id: 'tourism', type: 'window', url: 'https://example.test/huasteca-inmersiva/' }] })
  assert.equal((await worker.message())[0]?.result, 'updated')
})

test('untrusted event sources cannot acquire permission through JSON claims', async () => {
  for (const source of [null, { ...passenger, url: 'https://evil.test/movilidad/' }, { ...passenger, url: 'https://example.test/huasteca-inmersiva/movilidad-copy/' }, { ...passenger, id: 'unknown' }, { ...passenger, type: 'serviceworker' }]) {
    const worker = workerHarness()
    const replies = await worker.message({ type: 'ACTIVATE_OFFLINE_UPDATE', source: passenger, confirmed: true }, source)
    assert.equal(replies[0]?.result, 'unavailable')
    assert.equal(worker.skipCount, 0)
  }
})

test('missing, modified and same-size corrupted cached files cannot activate', async () => {
  for (const modification of ['missing', 'different-size', 'same-size']) {
    const worker = workerHarness()
    const key = new URL(worker.build.files[1].path, scope).href
    if (modification === 'missing') worker.values.delete(key)
    else if (modification === 'different-size') worker.values.set(key, 'corrupted')
    else worker.values.set(key, 'X'.repeat(worker.build.files[1].bytes))
    assert.equal((await worker.message())[0]?.result, 'unavailable')
    assert.equal(worker.skipCount, 0)
    assert.equal(worker.events.some(event => event.type === 'delete'), false)
  }
})

test('a waiting worker and private reply port are required; installation never skips waiting', async () => {
  const active = workerHarness({ waiting: false })
  assert.equal((await active.message())[0]?.result, 'unavailable')
  const worker = workerHarness()
  assert.deepEqual(await worker.message(undefined, passenger, false), [])
  await worker.install()
  assert.equal(worker.skipCount, 0)
  const batch = worker.events.find(event => event.type === 'install-batch')
  assert.equal(batch.requests.length, worker.build.files.length)
  for (const request of batch.requests) {
    assert.match(request.integrity, /^sha256-/)
    assert.equal(request.credentials, 'omit')
  }
})

function clientHarness({ result = 'updated', hasWaiting = true, replyVersion = version } = {}) {
  const container = new EventTarget()
  const previous = { state: 'activated' }
  const waiting = new EventTarget()
  waiting.state = 'installed'
  let activationRequests = 0
  let reloads = 0
  container.controller = previous
  waiting.postMessage = (message, ports) => {
    const port = ports[0]
    if (message.type === 'GET_OFFLINE_STATUS') {
      port.postMessage({ type: 'OFFLINE_STATUS', version, complete: true, files: 2, bytes: 100 })
    } else {
      activationRequests += 1
      assert.equal(message.type, 'ACTIVATE_OFFLINE_UPDATE')
      port.postMessage({ type: 'OFFLINE_UPDATE_RESULT', result, version: replyVersion })
      if (result === 'updated') {
        // Deliberately deliver controllerchange before the MessagePort reply.
        container.controller = waiting
        waiting.state = 'activated'
        container.dispatchEvent(new Event('controllerchange'))
        waiting.dispatchEvent(new Event('statechange'))
      }
    }
  }
  container.getRegistration = async url => {
    assert.equal(url, scope)
    return { scope, waiting: hasWaiting ? waiting : null }
  }
  const exports = {}
  const compiled = ts.transpileModule(clientSource.replaceAll('import.meta.env', '__buildEnv'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const location = { origin: new URL(scope).origin, reload() { reloads += 1 } }
  vm.runInNewContext(compiled, {
    exports, require(name) { assert.equal(name, 'react'); return { useSyncExternalStore() {} } },
    __buildEnv: { PROD: true, BASE_URL: '/huasteca-inmersiva/' },
    navigator: { serviceWorker: container }, location, window: { setTimeout, clearTimeout, location },
    MessageChannel, URL, setTimeout, clearTimeout,
  })
  return { apply: exports.applyOfflineGuideUpdate, get activationRequests() { return activationRequests }, get reloads() { return reloads } }
}

test('client handles early controllerchange and concurrent clicks with exactly one reload', async () => {
  const client = clientHarness()
  const first = client.apply()
  const second = client.apply()
  assert.equal(first, second)
  assert.deepEqual(await Promise.all([first, second]), ['updated', 'updated'])
  assert.equal(client.activationRequests, 1)
  assert.equal(client.reloads, 1)
  assert.equal(await client.apply(), 'updated')
  assert.equal(client.reloads, 1)
})

test('client preserves its open document when other mobility tabs block the update', async () => {
  const client = clientHarness({ result: 'other-tabs-open' })
  assert.equal(await client.apply(), 'other-tabs-open')
  assert.equal(client.reloads, 0)
})

test('client rejects absent waiting workers, refused activation and mismatched reply versions', async () => {
  for (const options of [{ hasWaiting: false }, { result: 'unavailable' }, { replyVersion: 'c'.repeat(20) }]) {
    const client = clientHarness(options)
    assert.equal(await client.apply(), 'unavailable')
    assert.equal(client.reloads, 0)
  }
})
