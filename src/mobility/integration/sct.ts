/** Public, normalized read model. Raw SCT/GTFS credentials belong to a future backend. */
export type SctFeedStatus = 'disconnected' | 'loading' | 'available' | 'stale' | 'error'
export type SctFeedReason = 'not-configured' | 'approval-required' | 'no-recent-data' | 'invalid-feed' | 'request-failed' | 'configuration-error'

export interface ApprovedSctSource {
  readonly id: string
  readonly label: string
  /** Public evidence/reference recorded by the deployment owner, never a token. */
  readonly approvalReference: string
  readonly confirmed: true
}

export interface VehiclePosition {
  readonly id: string
  readonly lineId: string
  readonly directionId?: 0 | 1
  readonly tripId?: string
  readonly longitude: number
  readonly latitude: number
  readonly bearing?: number
  readonly observedAt: string
}

export interface ArrivalPrediction {
  readonly vehicleId: string
  readonly stopId: string
  readonly lineId: string
  readonly estimatedArrivalAt: string
  readonly observedAt: string
}

export interface SctSnapshot {
  readonly schemaVersion: 1
  readonly agency: string
  readonly lineId: string
  readonly generatedAt: string
  readonly vehiclePositions: readonly VehiclePosition[]
  readonly arrivals: readonly ArrivalPrediction[]
}

export interface SctFeedState {
  readonly status: SctFeedStatus
  readonly reason?: SctFeedReason
  readonly lineId: string
  readonly source?: ApprovedSctSource
  readonly generatedAt?: string
  readonly lastReceivedAt?: string
  /** Empty when disconnected, invalid, expired or lacking the approved source. */
  readonly vehiclePositions: readonly VehiclePosition[]
  /** Empty until IDs belong to a locally verified stop catalogue. */
  readonly arrivals: readonly ArrivalPrediction[]
  readonly staleVehicleCount: number
  readonly hasVerifiedStops: boolean
}

export interface SctBounds {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

export interface SctFeedOptions {
  readonly endpoint?: string
  readonly source?: ApprovedSctSource
  readonly lineId?: string
  readonly verifiedStopIds?: readonly string[]
  readonly bounds?: SctBounds
  readonly baseUrl?: string
  readonly fetcher?: (input: string, init?: RequestInit) => Promise<Response>
  readonly now?: () => number
  readonly pollIntervalMs?: number
}

export interface SctFeedClient {
  getState(): SctFeedState
  subscribe(listener: (state: SctFeedState) => void): () => void
  refresh(): Promise<SctFeedState>
  start(): void
  stop(): void
}

export const SCT_FRESHNESS_MS = 90_000
export const SCT_MAX_RESPONSE_BYTES = 256 * 1024
const CLOCK_SKEW_MS = 30_000
const MAX_VEHICLES = 100
const MAX_ARRIVALS = 500
const REQUEST_TIMEOUT_MS = 10_000
/** Broad city-area guard, not proof that a unit is on its authorized route. */
export const VALLES_BOUNDS: SctBounds = Object.freeze({ west: -99.11, south: 21.87, east: -98.91, north: 22.12 })
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/
const EMPTY: readonly never[] = Object.freeze([])

export class SctValidationError extends Error {
  constructor() {
    super('El servicio de datos no cumple el contrato esperado.')
    this.name = 'SctValidationError'
  }
}

function fail(): never { throw new SctValidationError() }
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail()
  const result = value as Record<string, unknown>
  if (Object.keys(result).some(key => !allowed.includes(key))) return fail()
  return result
}
function identifier(value: unknown): string {
  return typeof value === 'string' && ID.test(value) ? value : fail()
}
function instant(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return fail()
  const time = Date.parse(value)
  const expected = value.length === 20 ? value.replace('Z', '.000Z') : value
  if (!Number.isFinite(time) || new Date(time).toISOString() !== expected) return fail()
  return value
}
function finite(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail()
}
function plainText(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max || /[\u0000-\u001f]/.test(value)) return fail()
  return value.trim()
}

/** Does not authorize a source. The expected agency comes from deployment config. */
export function parseSctSnapshot(
  value: unknown,
  expected: { readonly agency: string; readonly lineId: string; readonly now?: number; readonly bounds?: SctBounds },
): SctSnapshot {
  const now = expected.now ?? Date.now()
  const bounds = expected.bounds ?? VALLES_BOUNDS
  const input = record(value, ['schemaVersion', 'agency', 'lineId', 'generatedAt', 'vehiclePositions', 'arrivals'])
  if (input.schemaVersion !== 1 || input.agency !== expected.agency || input.lineId !== expected.lineId) return fail()
  const generatedAt = instant(input.generatedAt)
  const generatedTime = Date.parse(generatedAt)
  if (generatedTime > now + CLOCK_SKEW_MS) return fail()
  if (!Array.isArray(input.vehiclePositions) || input.vehiclePositions.length > MAX_VEHICLES) return fail()
  if (input.arrivals !== undefined && (!Array.isArray(input.arrivals) || input.arrivals.length > MAX_ARRIVALS)) return fail()
  const ids = new Set<string>()
  const vehiclePositions = input.vehiclePositions.map((item: unknown): VehiclePosition => {
    const entry = record(item, ['id', 'lineId', 'directionId', 'tripId', 'longitude', 'latitude', 'bearing', 'observedAt'])
    const id = identifier(entry.id)
    if (ids.has(id) || entry.lineId !== expected.lineId) return fail()
    ids.add(id)
    const observedAt = instant(entry.observedAt)
    const observationTime = Date.parse(observedAt)
    if (observationTime > now + CLOCK_SKEW_MS || observationTime > generatedTime + CLOCK_SKEW_MS) return fail()
    if (entry.directionId !== undefined && entry.directionId !== 0 && entry.directionId !== 1) return fail()
    const position: VehiclePosition = {
      id, lineId: expected.lineId,
      longitude: finite(entry.longitude, bounds.west, bounds.east),
      latitude: finite(entry.latitude, bounds.south, bounds.north),
      observedAt,
      ...(entry.directionId !== undefined ? { directionId: entry.directionId as 0 | 1 } : {}),
      ...(entry.tripId !== undefined ? { tripId: identifier(entry.tripId) } : {}),
      ...(entry.bearing !== undefined ? { bearing: finite(entry.bearing, 0, 359.999) } : {}),
    }
    return Object.freeze(position)
  })
  const arrivalIds = new Set<string>()
  const arrivals = (input.arrivals as unknown[] | undefined ?? []).map((item): ArrivalPrediction => {
    const entry = record(item, ['vehicleId', 'stopId', 'lineId', 'estimatedArrivalAt', 'observedAt'])
    const vehicleId = identifier(entry.vehicleId)
    const stopId = identifier(entry.stopId)
    if (entry.lineId !== expected.lineId) return fail()
    const key = `${vehicleId}|${stopId}`
    if (arrivalIds.has(key)) return fail()
    arrivalIds.add(key)
    const observedAt = instant(entry.observedAt)
    const estimatedArrivalAt = instant(entry.estimatedArrivalAt)
    const observationTime = Date.parse(observedAt)
    if (observationTime > now + CLOCK_SKEW_MS || observationTime > generatedTime + CLOCK_SKEW_MS) return fail()
    if (Date.parse(estimatedArrivalAt) < observationTime || Date.parse(estimatedArrivalAt) > now + 6 * 60 * 60 * 1000) return fail()
    return Object.freeze({ vehicleId, stopId, lineId: expected.lineId, observedAt, estimatedArrivalAt })
  })
  return Object.freeze({
    schemaVersion: 1, agency: expected.agency, lineId: expected.lineId, generatedAt,
    vehiclePositions: Object.freeze(vehiclePositions), arrivals: Object.freeze(arrivals),
  })
}

export function evaluateSctSnapshot(
  snapshot: SctSnapshot,
  options: { readonly source: ApprovedSctSource; readonly verifiedStopIds?: readonly string[]; readonly now?: number; readonly lastReceivedAt?: string },
): SctFeedState {
  const now = options.now ?? Date.now()
  const verifiedStops = new Set(options.verifiedStopIds ?? [])
  const feedFresh = now - Date.parse(snapshot.generatedAt) <= SCT_FRESHNESS_MS
  const vehiclePositions = feedFresh
    ? snapshot.vehiclePositions.filter(position => now - Date.parse(position.observedAt) <= SCT_FRESHNESS_MS)
    : EMPTY
  const visibleVehicleIds = new Set(vehiclePositions.map(position => position.id))
  const arrivals = feedFresh ? snapshot.arrivals.filter(arrival =>
    verifiedStops.has(arrival.stopId) && visibleVehicleIds.has(arrival.vehicleId) &&
    now - Date.parse(arrival.observedAt) <= SCT_FRESHNESS_MS && Date.parse(arrival.estimatedArrivalAt) >= now,
  ).sort((a, b) => Date.parse(a.estimatedArrivalAt) - Date.parse(b.estimatedArrivalAt)) : EMPTY
  return Object.freeze({
    status: vehiclePositions.length > 0 ? 'available' : 'stale',
    ...(vehiclePositions.length === 0 ? { reason: 'no-recent-data' as const } : {}),
    lineId: snapshot.lineId, source: options.source, generatedAt: snapshot.generatedAt,
    ...(options.lastReceivedAt ? { lastReceivedAt: options.lastReceivedAt } : {}),
    vehiclePositions: Object.freeze(vehiclePositions), arrivals: Object.freeze(arrivals),
    staleVehicleCount: snapshot.vehiclePositions.length - vehiclePositions.length,
    hasVerifiedStops: verifiedStops.size > 0,
  })
}

/** Reject embedded credentials/query tokens. Configure a public backend read URL. */
export function resolveSctEndpoint(endpoint: string, baseUrl?: string): string {
  let url: URL
  try { url = new URL(endpoint, baseUrl) } catch { return fail() }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) return fail()
  return url.href
}

async function readBoundedSnapshot(response: Response): Promise<unknown> {
  if (!response.ok) { await response.body?.cancel(); throw new Error('request-failed') }
  if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) { await response.body?.cancel(); return fail() }
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > SCT_MAX_RESPONSE_BYTES) { await response.body?.cancel(); return fail() }
  const reader = response.body?.getReader()
  if (!reader) return fail()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > SCT_MAX_RESPONSE_BYTES) {
        await reader.cancel()
        return fail()
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
  } finally { reader.releaseLock() }
  try { return JSON.parse(text) as unknown } catch { return fail() }
}

/** No IO occurs until refresh/start. stop aborts requests and removes all timers. */
export function createSctFeedClient(options: SctFeedOptions = {}): SctFeedClient {
  const lineId = options.lineId ?? 'valles-l1'
  const now = options.now ?? Date.now
  const verifiedStopIds = Object.freeze([...(options.verifiedStopIds ?? [])])
  const listeners = new Set<(state: SctFeedState) => void>()
  const makeEmpty = (status: SctFeedStatus, reason?: SctFeedReason): SctFeedState => Object.freeze({
    status, ...(reason ? { reason } : {}), lineId,
    ...(source ? { source } : {}), vehiclePositions: EMPTY, arrivals: EMPTY,
    staleVehicleCount: 0, hasVerifiedStops: verifiedStopIds.length > 0,
  })
  let source: ApprovedSctSource | undefined
  let endpoint: string | undefined
  let configurationError = false
  const needsApproval = Boolean(options.endpoint?.trim()) && options.source?.confirmed !== true
  try {
    identifier(lineId)
    verifiedStopIds.forEach(identifier)
    if (options.source?.confirmed === true) {
      source = Object.freeze({
        id: identifier(options.source.id), label: plainText(options.source.label, 120),
        approvalReference: plainText(options.source.approvalReference, 500), confirmed: true,
      })
    }
    if (options.endpoint?.trim() && source) {
      endpoint = resolveSctEndpoint(options.endpoint.trim(), options.baseUrl ?? (typeof location !== 'undefined' ? location.href : undefined))
    }
  } catch { configurationError = true }
  let state = makeEmpty(configurationError ? 'error' : 'disconnected', configurationError ? 'configuration-error' : needsApproval ? 'approval-required' : endpoint ? undefined : 'not-configured')
  let snapshot: SctSnapshot | undefined
  let lastReceivedAt: string | undefined
  let controller: AbortController | undefined
  let pending: Promise<SctFeedState> | undefined
  let polling: ReturnType<typeof setInterval> | undefined
  let freshness: ReturnType<typeof setInterval> | undefined
  let generation = 0
  const fetcher = options.fetcher ?? ((input: string, init?: RequestInit) => fetch(input, init))
  const publish = (next: SctFeedState) => {
    state = next
    for (const listener of listeners) listener(state)
  }
  const evaluate = () => snapshot && source ? evaluateSctSnapshot(snapshot, { source, verifiedStopIds, now: now(), lastReceivedAt }) : state
  const getState = () => {
    // Do not turn the last successful snapshot into live data after a failed request.
    if (state.status === 'available' || state.status === 'stale') state = evaluate()
    return state
  }
  const refresh = (): Promise<SctFeedState> => {
    if (pending) return pending
    if (!endpoint || !source || configurationError) return Promise.resolve(getState())
    const requestGeneration = generation
    controller = new AbortController()
    const activeController = controller
    const timeout = setTimeout(() => activeController.abort(), REQUEST_TIMEOUT_MS)
    if (state.status !== 'available' && state.status !== 'stale') publish(makeEmpty('loading'))
    pending = (async () => {
      // Yield before a fetcher can throw synchronously, so pending is assigned first.
      await Promise.resolve()
      try {
        if (requestGeneration !== generation) return getState()
        const response = await fetcher(endpoint, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' }, signal: activeController.signal })
        const body = await readBoundedSnapshot(response)
        const nextSnapshot = parseSctSnapshot(body, { agency: source.id, lineId, now: now(), ...(options.bounds ? { bounds: options.bounds } : {}) })
        if (requestGeneration !== generation) return getState()
        snapshot = nextSnapshot
        lastReceivedAt = new Date(now()).toISOString()
        publish(evaluate())
      } catch (error: unknown) {
        if (requestGeneration === generation) publish(makeEmpty('error', error instanceof SctValidationError ? 'invalid-feed' : 'request-failed'))
      } finally {
        clearTimeout(timeout)
        if (requestGeneration === generation) { controller = undefined; pending = undefined }
      }
      return getState()
    })()
    return pending
  }
  return {
    getState,
    subscribe(listener) { listeners.add(listener); listener(getState()); return () => { listeners.delete(listener) } },
    refresh,
    start() {
      if (polling || !endpoint || !source || configurationError) return
      void refresh()
      const requestedInterval = options.pollIntervalMs
      const interval = typeof requestedInterval === 'number' && Number.isFinite(requestedInterval)
        ? Math.max(30_000, Math.min(requestedInterval, 5 * 60_000)) : 30_000
      polling = setInterval(() => { void refresh() }, interval)
      freshness = setInterval(() => {
        const previous = state
        const next = getState()
        if (previous.status !== next.status || previous.vehiclePositions.length !== next.vehiclePositions.length || previous.arrivals.length !== next.arrivals.length) publish(next)
      }, 1000)
    },
    stop() {
      generation++
      controller?.abort()
      controller = undefined
      pending = undefined
      if (polling) clearInterval(polling)
      if (freshness) clearInterval(freshness)
      polling = undefined
      freshness = undefined
      snapshot = undefined
      lastReceivedAt = undefined
      if (endpoint && source && !configurationError) publish(makeEmpty('disconnected'))
    },
  }
}
