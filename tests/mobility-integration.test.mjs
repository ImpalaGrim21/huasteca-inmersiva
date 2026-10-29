import test from 'node:test'
import assert from 'node:assert/strict'
import { createSctFeedClient, evaluateSctSnapshot, parseSctSnapshot, resolveSctEndpoint, SCT_MAX_RESPONSE_BYTES, SctValidationError } from '../src/mobility/integration/sct.ts'

// Deliberately synthetic fixtures live only in this test file; never in the app.
const time = Date.parse('2026-10-28T16:00:00.000Z')
const at = delta => new Date(time + delta).toISOString()
const source = Object.freeze({ id: 'sctslp', label: 'Fuente de prueba', approvalReference: 'Contrato ficticio exclusivo de tests', confirmed: true })
const position = overrides => ({ id: 'TEST-UNIT-1', lineId: 'valles-l1', longitude: -99.014, latitude: 21.982, observedAt: at(-10_000), ...overrides })
const feed = overrides => ({ schemaVersion: 1, agency: 'sctslp', lineId: 'valles-l1', generatedAt: at(0), vehiclePositions: [position()], ...overrides })
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })
const parse = value => parseSctSnapshot(value, { agency: 'sctslp', lineId: 'valles-l1', now: time })
const options = overrides => ({ endpoint: 'https://example.test/sct/valles-l1', source, now: () => time, ...overrides })

test('default client has no IO and cannot expose a vehicle or an ETA', async () => {
  let requests = 0
  const client = createSctFeedClient({ fetcher: async () => { requests++; return response(feed()) } })
  const observed = []
  const unsubscribe = client.subscribe(state => observed.push(state.status))
  client.start()
  await client.refresh()
  assert.equal(client.getState().status, 'disconnected')
  assert.equal(client.getState().reason, 'not-configured')
  assert.deepEqual(client.getState().vehiclePositions, [])
  assert.deepEqual(client.getState().arrivals, [])
  assert.deepEqual(observed, ['disconnected'])
  assert.equal(requests, 0)
  unsubscribe()
  client.stop()
})

test('an endpoint alone, or an approval claimed by the feed, never enables a source', async () => {
  let requests = 0
  const client = createSctFeedClient({ endpoint: 'https://example.test/feed', fetcher: async () => { requests++; return response({ ...feed(), official: true }) } })
  client.start()
  await client.refresh()
  assert.equal(client.getState().reason, 'approval-required')
  assert.equal(requests, 0)
  assert.throws(() => parse({ ...feed(), official: true }), SctValidationError)
  client.stop()
})

test('only the expected line and pinned agency pass schema validation', () => {
  assert.throws(() => parse(feed({ agency: 'untrusted-source' })), SctValidationError)
  assert.throws(() => parse(feed({ lineId: 'capital-l1' })), SctValidationError)
  assert.throws(() => parse(feed({ schemaVersion: 2 })), SctValidationError)
  assert.throws(() => parse(feed({ vehiclePositions: [position({ lineId: 'valles-l2' })] })), SctValidationError)
  assert.equal(parse(feed()).vehiclePositions.length, 1)
})

test('reject impossible points, duplicate IDs, future observations and invalid dates', () => {
  const badPositions = [
    position({ longitude: -100.9 }), position({ latitude: NaN }), position({ longitude: '-99.01' }),
    position({ observedAt: at(31_000) }), position({ observedAt: '2026-02-30T16:00:00.000Z' }),
    position({ observedAt: '2026-10-28' }), position({ directionId: 2 }), position({ id: '<script>' }),
  ]
  for (const candidate of badPositions) assert.throws(() => parse(feed({ vehiclePositions: [candidate] })), SctValidationError)
  assert.throws(() => parse(feed({ vehiclePositions: [position(), position()] })), SctValidationError)
  assert.throws(() => parse(feed({ generatedAt: at(31_000) })), SctValidationError)
  assert.throws(() => parse(feed({ generatedAt: at(-120_000) })), SctValidationError)
})

test('a new header cannot refresh old vehicle observations, including mixed coverage', () => {
  const stale = parse(feed({ vehiclePositions: [position({ observedAt: at(-91_000) })] }))
  const oldState = evaluateSctSnapshot(stale, { source, now: time })
  assert.equal(oldState.status, 'stale')
  assert.equal(oldState.staleVehicleCount, 1)
  assert.deepEqual(oldState.vehiclePositions, [])
  const mixed = parse(feed({ vehiclePositions: [position(), position({ id: 'TEST-OLD', observedAt: at(-120_000) })] }))
  const mixedState = evaluateSctSnapshot(mixed, { source, now: time })
  assert.equal(mixedState.status, 'available')
  assert.equal(mixedState.staleVehicleCount, 1)
  assert.deepEqual(mixedState.vehiclePositions.map(item => item.id), ['TEST-UNIT-1'])
  const oldEnvelope = parse(feed({ generatedAt: at(-91_000), vehiclePositions: [position({ observedAt: at(-91_000) })] }))
  assert.equal(evaluateSctSnapshot(oldEnvelope, { source, now: time }).status, 'stale')
})

test('ETA is hidden without a verified stop, a fresh observation and a fresh matching unit', () => {
  const prediction = { vehicleId: 'TEST-UNIT-1', stopId: 'TEST-STOP-1', lineId: 'valles-l1', estimatedArrivalAt: at(180_000), observedAt: at(-10_000) }
  const snapshot = parse(feed({ arrivals: [prediction] }))
  assert.equal(evaluateSctSnapshot(snapshot, { source, now: time }).arrivals.length, 0)
  assert.equal(evaluateSctSnapshot(snapshot, { source, verifiedStopIds: ['OTHER-STOP'], now: time }).arrivals.length, 0)
  const verified = evaluateSctSnapshot(snapshot, { source, verifiedStopIds: ['TEST-STOP-1'], now: time })
  assert.equal(verified.arrivals.length, 1)
  assert.equal(verified.hasVerifiedStops, true)
  const oldPrediction = parse(feed({ arrivals: [{ ...prediction, observedAt: at(-91_000) }] }))
  assert.equal(evaluateSctSnapshot(oldPrediction, { source, verifiedStopIds: ['TEST-STOP-1'], now: time }).arrivals.length, 0)
  const oldUnit = parse(feed({ vehiclePositions: [position({ observedAt: at(-91_000) })], arrivals: [prediction] }))
  assert.equal(evaluateSctSnapshot(oldUnit, { source, verifiedStopIds: ['TEST-STOP-1'], now: time }).arrivals.length, 0)
})

test('a successful response uses safe fetch options and expires without any new request', async () => {
  let clock = time
  let calls = 0
  const client = createSctFeedClient(options({ now: () => clock, fetcher: async (url, init) => {
    calls++
    assert.equal(url, 'https://example.test/sct/valles-l1')
    assert.equal(init.credentials, 'omit')
    assert.equal(init.redirect, 'error')
    assert.equal(init.cache, 'no-store')
    return response(feed())
  } }))
  assert.equal(calls, 0)
  const states = []
  const unsubscribe = client.subscribe(state => states.push(state.status))
  await client.refresh()
  assert.equal(client.getState().status, 'available')
  assert.deepEqual(states, ['disconnected', 'loading', 'available'])
  clock += 91_000
  assert.equal(client.getState().status, 'stale')
  assert.equal(client.getState().vehiclePositions.length, 0)
  assert.equal(calls, 1)
  unsubscribe()
  client.stop()
})

test('failure clears active positions instead of presenting the last success as live', async () => {
  let calls = 0
  const client = createSctFeedClient(options({ fetcher: async () => ++calls === 1 ? response(feed()) : new Response('error', { status: 503 }) }))
  await client.refresh()
  assert.equal(client.getState().status, 'available')
  await client.refresh()
  assert.equal(client.getState().status, 'error')
  assert.equal(client.getState().reason, 'request-failed')
  assert.deepEqual(client.getState().vehiclePositions, [])
  client.stop()
})

test('invalid/oversized responses cannot become available', async () => {
  const cases = [
    () => new Response('<html>not JSON</html>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{broken-json', { headers: { 'content-type': 'application/json' } }),
    () => response({ ...feed(), passengerNames: ['should-never-be-in-this-feed'] }),
    () => new Response(' '.repeat(SCT_MAX_RESPONSE_BYTES + 1), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': String(SCT_MAX_RESPONSE_BYTES + 1) } }),
  ]
  for (const getResponse of cases) {
    const client = createSctFeedClient(options({ fetcher: async () => getResponse() }))
    const state = await client.refresh()
    assert.equal(state.status, 'error')
    assert.equal(state.reason, 'invalid-feed')
    assert.equal(state.vehiclePositions.length, 0)
    client.stop()
  }
})

test('HTTPS is required except loopback; embedded tokens and credentials are rejected', () => {
  for (const endpoint of ['http://example.test/feed', 'https://user:secret@example.test/feed', 'https://example.test/feed?token=secret', 'javascript:alert(1)', 'https://example.test/feed#token']) assert.throws(() => resolveSctEndpoint(endpoint), SctValidationError)
  assert.equal(resolveSctEndpoint('/api/sct/valles-l1', 'https://example.test/movilidad.html'), 'https://example.test/api/sct/valles-l1')
  assert.equal(resolveSctEndpoint('http://127.0.0.1:5173/api/sct'), 'http://127.0.0.1:5173/api/sct')
  const client = createSctFeedClient(options({ endpoint: 'https://example.test/feed?token=secret' }))
  assert.equal(client.getState().reason, 'configuration-error')
})

test('overlapping refreshes share a request and stop prevents a late result from becoming live', async () => {
  let release
  let calls = 0
  const client = createSctFeedClient(options({ fetcher: () => { calls++; return new Promise(resolve => { release = resolve }) } }))
  const first = client.refresh()
  const second = client.refresh()
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.equal(first, second)
  client.stop()
  release(response(feed()))
  await first
  assert.equal(client.getState().status, 'disconnected')
  assert.equal(client.getState().vehiclePositions.length, 0)
})

test('a synchronously failing fetcher can be retried and never leaves a stuck loading state', async () => {
  let calls = 0
  const client = createSctFeedClient(options({ fetcher: () => { calls++; if (calls === 1) throw new Error('network unavailable'); return Promise.resolve(response(feed())) } }))
  await client.refresh()
  assert.equal(client.getState().status, 'error')
  await client.refresh()
  assert.equal(calls, 2)
  assert.equal(client.getState().status, 'available')
  client.stop()
})

test('stopping immediately after refresh prevents even the deferred network invocation', async () => {
  let calls = 0
  const client = createSctFeedClient(options({ fetcher: async () => { calls++; return response(feed()) } }))
  const request = client.refresh()
  client.stop()
  await request
  assert.equal(calls, 0)
  assert.equal(client.getState().status, 'disconnected')
})
