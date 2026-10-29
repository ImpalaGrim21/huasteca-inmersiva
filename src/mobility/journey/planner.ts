import type { JourneyCoordinates, JourneyOption, JourneyPlace, JourneyPlanningInput, JourneyStop, VerifiedJourneyRoute } from './types.ts'

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/
const BOUNDS = { west: -99.11, east: -98.91, south: 21.87, north: 22.12 }
export const JOURNEY_LOCATION_MAX_AGE_MS = 120_000
export const isJourneyId = (value: unknown): value is string => typeof value === 'string' && ID.test(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 160 && !/[\u0000-\u001f]/.test(value)
export function isJourneySourceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}
export function isJourneyCoordinates(value: unknown): value is JourneyCoordinates {
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number' && Number.isFinite(item)) && value[0] >= BOUNDS.west && value[0] <= BOUNDS.east && value[1] >= BOUNDS.south && value[1] <= BOUNDS.north
}
export function isJourneyPlace(value: unknown): value is JourneyPlace {
  if (typeof value !== 'object' || !value) return false
  const place = value as Partial<JourneyPlace>
  const source = place.provenance
  if (!isJourneyId(place.id) || !text(place.name) || !isJourneyCoordinates(place.coordinates) || !source || !['community-cartography', 'official-catalogue', 'device-location', 'manual-pin'].includes(source.kind)) return false
  if (source.kind === 'community-cartography' || source.kind === 'official-catalogue') return isJourneySourceUrl(source.sourceUrl)
  return source.kind !== 'device-location' || typeof source.capturedAt === 'number' && Number.isFinite(source.capturedAt) && source.capturedAt >= 0
}
export function isJourneyStop(value: unknown): value is JourneyStop {
  if (typeof value !== 'object' || !value) return false
  const stop = value as Partial<JourneyStop>
  return isJourneyId(stop.id) && text(stop.name) && isJourneyCoordinates(stop.coordinates) && isJourneySourceUrl(stop.sourceUrl) && text(stop.verification)
}
export function copyJourneyPlace(place: JourneyPlace): JourneyPlace {
  return Object.freeze({ id: place.id, name: place.name, coordinates: Object.freeze([...place.coordinates]) as JourneyCoordinates, provenance: Object.freeze({ ...place.provenance }) })
}
function copyStop(stop: JourneyStop): JourneyStop {
  return Object.freeze({ id: stop.id, name: stop.name, coordinates: Object.freeze([...stop.coordinates]) as JourneyCoordinates, sourceUrl: stop.sourceUrl, verification: stop.verification })
}
export function journeyDistanceMeters(from: JourneyCoordinates, to: JourneyCoordinates): number {
  const rad = Math.PI / 180
  const deltaLat = (to[1] - from[1]) * rad, deltaLon = (to[0] - from[0]) * rad
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(from[1] * rad) * Math.cos(to[1] * rad) * Math.sin(deltaLon / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
}
export function isFreshJourneyOrigin(place: JourneyPlace, now = Date.now()): boolean {
  if (place.provenance.kind !== 'device-location') return true
  const capturedAt = place.provenance.capturedAt ?? NaN
  return Number.isFinite(capturedAt) && now - capturedAt <= JOURNEY_LOCATION_MAX_AGE_MS && capturedAt - now <= 30_000
}
export function uniqueJourneyStops(stops: readonly JourneyStop[]): JourneyStop[] {
  const result = new Map<string, JourneyStop>()
  for (const stop of stops.slice(0, 500)) if (isJourneyStop(stop) && !result.has(stop.id)) result.set(stop.id, stop)
  return [...result.values()]
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value)) return false
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return false
  return value.length === 10 ? new Date(time).toISOString().slice(0, 10) === value : new Date(time).toISOString() === (value.length === 20 ? value.replace('Z', '.000Z') : value)
}
function validRoute(route: VerifiedJourneyRoute | undefined, lineId: string, stops: readonly JourneyStop[], now: number): route is VerifiedJourneyRoute {
  if (!route || route.lineId !== lineId || !isJourneySourceUrl(route.sourceUrl) || !validDate(route.verifiedAt) || Date.parse(route.verifiedAt) > now + 30_000 || !Array.isArray(route.directions) || route.directions.length > 12) return false
  if (route.validUntil !== undefined && (!validDate(route.validUntil) || Date.parse(route.validUntil) < now)) return false
  const ids = new Set(stops.map(stop => stop.id)), directions = new Set<string>()
  return route.directions.length > 0 && route.directions.every(direction => {
    if (!isJourneyId(direction.id) || directions.has(direction.id) || !text(direction.headsign) || !Array.isArray(direction.stopIds) || direction.stopIds.length < 2 || direction.stopIds.length > 500 || !direction.stopIds.every((id: unknown) => isJourneyId(id) && ids.has(id))) return false
    directions.add(direction.id)
    return true
  })
}

export function createJourneyOption(input: {
  readonly origin: JourneyPlace | null; readonly destination: JourneyPlace | null
  readonly boarding: JourneyStop; readonly alighting: JourneyStop
  readonly stops: readonly JourneyStop[]; readonly lineId?: string; readonly verifiedRoute?: VerifiedJourneyRoute; readonly now?: number
}): JourneyOption | null {
  const lineId = input.lineId ?? 'valles-l1'
  if (!isJourneyId(lineId) || !isJourneyStop(input.boarding) || !isJourneyStop(input.alighting) || input.boarding.id === input.alighting.id || input.origin && !isJourneyPlace(input.origin) || input.destination && !isJourneyPlace(input.destination)) return null
  const route = validRoute(input.verifiedRoute, lineId, input.stops, input.now ?? Date.now()) ? input.verifiedRoute : undefined
  const direction = route?.directions.find(item => {
    const board = item.stopIds.indexOf(input.boarding.id)
    return board >= 0 && item.stopIds.indexOf(input.alighting.id, board + 1) >= 0
  })
  const originDistanceMeters = input.origin ? journeyDistanceMeters(input.origin.coordinates, input.boarding.coordinates) : null
  const destinationDistanceMeters = input.destination ? journeyDistanceMeters(input.alighting.coordinates, input.destination.coordinates) : null
  return Object.freeze({
    id: `${lineId}|${input.boarding.id}|${input.alighting.id}`, lineId,
    originId: input.origin?.id ?? null, destinationId: input.destination?.id ?? null,
    boarding: copyStop(input.boarding), alighting: copyStop(input.alighting), originDistanceMeters, destinationDistanceMeters,
    totalAccessMeters: originDistanceMeters !== null && destinationDistanceMeters !== null ? originDistanceMeters + destinationDistanceMeters : null,
    connection: direction ? 'verified' : 'unverified', confidence: direction ? 'route-verified' : 'cartographic-only',
    ...(direction ? { directionId: direction.id, headsign: direction.headsign, routeSourceUrl: route!.sourceUrl } : {}),
    requirements: Object.freeze([
      direction ? 'Confirma el destino visible de la unidad y cualquier cambio de servicio.' : 'Confirma con el operador que la unidad conecta ambos puntos y en qué sentido.',
      'Revisa el acceso peatonal: las distancias son geográficas, no un camino ni una duración.',
    ]),
  })
}

/** Geographic candidates only; no vehicle, road itinerary or ETA is fabricated. */
export function planJourney(input: JourneyPlanningInput): JourneyOption[] {
  const now = input.now ?? Date.now()
  if (!isJourneyPlace(input.origin) || !isJourneyPlace(input.destination) || input.origin.id === input.destination.id || !isFreshJourneyOrigin(input.origin, now) || !Array.isArray(input.stops)) return []
  const stops = uniqueJourneyStops(input.stops)
  if (stops.length < 2) return []
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(6, Math.floor(input.limit!))) : 3
  const candidates: JourneyOption[] = []
  for (const boarding of stops) for (const alighting of stops) {
    if (boarding.id === alighting.id) continue
    const option = createJourneyOption({ origin: input.origin, destination: input.destination, boarding, alighting, stops, lineId: input.lineId, verifiedRoute: input.verifiedRoute, now })
    if (option) candidates.push(option)
  }
  return candidates.sort((a, b) => (a.totalAccessMeters ?? Infinity) - (b.totalAccessMeters ?? Infinity) || Number(b.connection === 'verified') - Number(a.connection === 'verified') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, limit)
}
