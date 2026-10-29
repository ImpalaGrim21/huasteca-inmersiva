import { copyJourneyPlace, createJourneyOption, isFreshJourneyOrigin, isJourneyId, isJourneyPlace, isJourneyStop, journeyDistanceMeters, uniqueJourneyStops } from './planner.ts'
import type { JourneyAction, JourneyCatalogue, JourneyOption, JourneyPlace, JourneyResumeCandidate, JourneyState, JourneyStorage } from './types.ts'

export const JOURNEY_RECIPE_KEY = 'mi-redmetro:journey-recipe:v1'
export const JOURNEY_RESUME_KEY = 'mi-redmetro:journey-resume:v1'
export const JOURNEY_RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_STORED_LENGTH = 6000
const emptyConfirmation = () => Object.freeze({ pointConfirmed: false, destinationConfirmed: false })

export function createJourneyState(): JourneyState {
  return Object.freeze({ phase: 'choosing', leg: 'outbound', origin: null, destination: null, selectedPlan: null, originRequiresRefresh: false, destinationRequiresRefresh: false, confirmation: emptyConfirmation() })
}

function selectableOption(plan: JourneyOption, state: JourneyState): boolean {
  if (!state.origin || !state.destination || !plan || plan.originId !== state.origin.id || plan.destinationId !== state.destination.id || !isJourneyId(plan.lineId) || !isJourneyStop(plan.boarding) || !isJourneyStop(plan.alighting) || plan.boarding.id === plan.alighting.id || typeof plan.originDistanceMeters !== 'number' || !Number.isFinite(plan.originDistanceMeters) || plan.originDistanceMeters < 0 || typeof plan.destinationDistanceMeters !== 'number' || !Number.isFinite(plan.destinationDistanceMeters) || plan.destinationDistanceMeters < 0 || typeof plan.totalAccessMeters !== 'number' || !Number.isFinite(plan.totalAccessMeters)) return false
  return Math.abs(plan.originDistanceMeters - journeyDistanceMeters(state.origin.coordinates, plan.boarding.coordinates)) < 1 && Math.abs(plan.destinationDistanceMeters - journeyDistanceMeters(state.destination.coordinates, plan.alighting.coordinates)) < 1 && Math.abs(plan.totalAccessMeters - plan.originDistanceMeters - plan.destinationDistanceMeters) < 1
}

/** Manual passenger milestones only. GPS observations never advance a phase. */
export function journeyReducer(state: JourneyState, action: JourneyAction, now = Date.now()): JourneyState {
  switch (action.type) {
    case 'RESET': return createJourneyState()
    case 'SET_ORIGIN':
    case 'SET_DESTINATION': {
      if (action.place !== null && !isJourneyPlace(action.place)) return state
      const field = action.type === 'SET_ORIGIN' ? 'origin' : 'destination'
      return Object.freeze({ ...state, phase: 'choosing', [field]: action.place ? copyJourneyPlace(action.place) : null, selectedPlan: null, originRequiresRefresh: field === 'origin' && action.place ? false : state.originRequiresRefresh, destinationRequiresRefresh: field === 'destination' && action.place ? false : state.destinationRequiresRefresh, confirmation: emptyConfirmation() })
    }
    case 'SELECT_PLAN':
      if (!['choosing', 'prepared'].includes(state.phase) || !selectableOption(action.plan, state)) return state
      return Object.freeze({ ...state, phase: 'prepared', selectedPlan: action.plan, originRequiresRefresh: false, destinationRequiresRefresh: false, confirmation: emptyConfirmation() })
    case 'START':
      return state.phase === 'prepared' && state.origin && isFreshJourneyOrigin(state.origin, now) && state.destination && state.selectedPlan ? Object.freeze({ ...state, phase: 'to-board' }) : state
    case 'CONFIRM_BOARDING':
      if (!['prepared', 'to-board'].includes(state.phase) || !state.selectedPlan || typeof action.pointConfirmed !== 'boolean' || typeof action.destinationConfirmed !== 'boolean') return state
      return Object.freeze({ ...state, confirmation: Object.freeze({ pointConfirmed: action.pointConfirmed, destinationConfirmed: action.destinationConfirmed }) })
    case 'BOARD':
      return state.phase === 'to-board' && state.selectedPlan && state.confirmation.pointConfirmed && state.confirmation.destinationConfirmed ? Object.freeze({ ...state, phase: 'aboard' }) : state
    case 'APPROACH': return state.phase === 'aboard' ? Object.freeze({ ...state, phase: 'approaching' }) : state
    case 'ALIGHT': return ['aboard', 'approaching'].includes(state.phase) ? Object.freeze({ ...state, phase: 'last-leg' }) : state
    case 'FINISH': return state.phase === 'last-leg' ? Object.freeze({ ...state, phase: 'finished' }) : state
    case 'PREPARE_RETURN':
      if (state.phase !== 'finished') return state
      return Object.freeze({ phase: 'choosing', leg: state.leg === 'outbound' ? 'return' : 'outbound', origin: state.destination, destination: state.origin, selectedPlan: null, originRequiresRefresh: state.destination === null, destinationRequiresRefresh: state.origin === null, confirmation: emptyConfirmation() })
    default: return state
  }
}

function storageOrDefault(storage?: JourneyStorage): JourneyStorage | undefined {
  if (storage) return storage
  try { return typeof localStorage !== 'undefined' ? localStorage : undefined } catch { return undefined }
}
function readRaw(key: string, storage?: JourneyStorage): unknown {
  try {
    const raw = storageOrDefault(storage)?.getItem(key)
    return raw && raw.length <= MAX_STORED_LENGTH ? JSON.parse(raw) as unknown : null
  } catch { return null }
}
function writeRaw(key: string, value: unknown, storage?: JourneyStorage): boolean {
  try {
    const target = storageOrDefault(storage)
    if (!target) return false
    const encoded = JSON.stringify(value)
    if (encoded.length > MAX_STORED_LENGTH) return false
    target.setItem(key, encoded)
    return true
  } catch { return false }
}
function clearResume(storage?: JourneyStorage): boolean {
  try {
    const target = storageOrDefault(storage)
    if (!target) return false
    if (target.removeItem) target.removeItem(JOURNEY_RESUME_KEY)
    else target.setItem(JOURNEY_RESUME_KEY, '')
    return true
  } catch { return false }
}
function catalogueMaps(catalogue: JourneyCatalogue) {
  const stops = uniqueJourneyStops(catalogue.stops)
  const stopMap = new Map(stops.map(stop => [stop.id, stop]))
  const places = new Map<string, JourneyPlace>()
  for (const stop of stops) places.set(stop.id, { id: stop.id, name: stop.name, coordinates: stop.coordinates, provenance: { kind: 'community-cartography', sourceUrl: stop.sourceUrl } })
  for (const place of catalogue.places.slice(0, 1000)) {
    if (isJourneyPlace(place) && !['device-location', 'manual-pin'].includes(place.provenance.kind)) places.set(place.id, copyJourneyPlace(place))
  }
  return { stops, stopMap, places, lineId: catalogue.lineId ?? 'valles-l1' }
}
function publicPlaceId(place: JourneyPlace | null, places: Map<string, JourneyPlace>): string | null {
  return place && !['device-location', 'manual-pin'].includes(place.provenance.kind) && places.has(place.id) ? place.id : null
}

interface Recipe {
  readonly schemaVersion: 1
  readonly lineId: string
  readonly originId: string | null
  readonly destinationId: string | null
  readonly boardingId: string
  readonly alightingId: string
}
function recipeFromState(state: JourneyState, catalogue: JourneyCatalogue): Recipe | null {
  const maps = catalogueMaps(catalogue), plan = state.selectedPlan
  if (!plan || plan.lineId !== maps.lineId || !maps.stopMap.has(plan.boarding.id) || !maps.stopMap.has(plan.alighting.id) || plan.boarding.id === plan.alighting.id) return null
  if (state.origin && !isJourneyPlace(state.origin) || state.destination && !isJourneyPlace(state.destination) || plan.originId !== (state.origin?.id ?? null) || plan.destinationId !== (state.destination?.id ?? null)) return null
  return { schemaVersion: 1, lineId: maps.lineId, originId: publicPlaceId(state.origin, maps.places), destinationId: publicPlaceId(state.destination, maps.places), boardingId: plan.boarding.id, alightingId: plan.alighting.id }
}
function readRecipe(value: unknown, catalogue: JourneyCatalogue, resume = false): Recipe | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const allowed = ['schemaVersion', 'lineId', 'originId', 'destinationId', 'boardingId', 'alightingId', ...(resume ? ['phase', 'leg', 'savedAt', 'originRequiresRefresh', 'destinationRequiresRefresh'] : [])]
  if (Object.keys(data).some(key => !allowed.includes(key))) return null
  const maps = catalogueMaps(catalogue)
  if (data.schemaVersion !== 1 || data.lineId !== maps.lineId || !isJourneyId(data.boardingId) || !isJourneyId(data.alightingId) || data.boardingId === data.alightingId || !maps.stopMap.has(data.boardingId) || !maps.stopMap.has(data.alightingId)) return null
  if (data.originId !== null && (!isJourneyId(data.originId) || !maps.places.has(data.originId)) || data.destinationId !== null && (!isJourneyId(data.destinationId) || !maps.places.has(data.destinationId))) return null
  if (data.originId !== null && data.originId === data.destinationId) return null
  return { schemaVersion: 1, lineId: maps.lineId, originId: data.originId as string | null, destinationId: data.destinationId as string | null, boardingId: data.boardingId, alightingId: data.alightingId }
}

/** Saves one reusable recipe; no coordinates, labels, GPS or progress are stored. */
export function saveJourneyRecipe(state: JourneyState, catalogue: JourneyCatalogue, storage?: JourneyStorage): boolean {
  const recipe = recipeFromState(state, catalogue)
  return recipe ? writeRaw(JOURNEY_RECIPE_KEY, recipe, storage) : false
}

/** Safe default: a recipe never restores an assertion that someone is aboard. */
export function restoreJourneyRecipe(catalogue: JourneyCatalogue, storage?: JourneyStorage): JourneyState | null {
  const recipe = readRecipe(readRaw(JOURNEY_RECIPE_KEY, storage), catalogue)
  if (!recipe) return null
  const maps = catalogueMaps(catalogue)
  const origin = recipe.originId ? maps.places.get(recipe.originId)! : null
  const destination = recipe.destinationId ? maps.places.get(recipe.destinationId)! : null
  const selectedPlan = origin && destination ? createJourneyOption({ origin, destination, boarding: maps.stopMap.get(recipe.boardingId)!, alighting: maps.stopMap.get(recipe.alightingId)!, stops: maps.stops, lineId: maps.lineId, verifiedRoute: catalogue.verifiedRoute }) : null
  return Object.freeze({ ...createJourneyState(), origin, destination, selectedPlan, phase: selectedPlan ? 'prepared' : 'choosing', originRequiresRefresh: !origin, destinationRequiresRefresh: !destination })
}

/** Call on manual phase changes; completing/resetting clears the active prompt. */
export function saveJourneyResumeCandidate(state: JourneyState, catalogue: JourneyCatalogue, storage?: JourneyStorage, now = Date.now()): boolean {
  if (state.phase === 'choosing' || state.phase === 'finished') return clearResume(storage)
  const recipe = recipeFromState(state, catalogue)
  if (!recipe || !Number.isFinite(now) || now < 0) return false
  return writeRaw(JOURNEY_RESUME_KEY, { ...recipe, phase: state.phase, leg: state.leg, savedAt: now, originRequiresRefresh: recipe.originId === null, destinationRequiresRefresh: recipe.destinationId === null }, storage)
}

/** Pure read: returning a proposal does not start, resume or advance anything. */
export function readJourneyResumeCandidate(catalogue: JourneyCatalogue, storage?: JourneyStorage, now = Date.now()): JourneyResumeCandidate | null {
  return validateResume(readRaw(JOURNEY_RESUME_KEY, storage), catalogue, now)
}
function validateResume(value: unknown, catalogue: JourneyCatalogue, now: number): JourneyResumeCandidate | null {
  if (!Number.isFinite(now) || now < 0) return null
  const recipe = readRecipe(value, catalogue, true)
  if (!recipe) return null
  const data = value as Record<string, unknown>
  if (!['prepared', 'to-board', 'aboard', 'approaching', 'last-leg'].includes(data.phase as string) || !['outbound', 'return'].includes(data.leg as string) || typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) || now - data.savedAt > JOURNEY_RESUME_MAX_AGE_MS || data.savedAt - now > 30_000 || data.originRequiresRefresh !== (recipe.originId === null) || data.destinationRequiresRefresh !== (recipe.destinationId === null)) return null
  return Object.freeze({ ...recipe, phase: data.phase as JourneyResumeCandidate['phase'], leg: data.leg as JourneyResumeCandidate['leg'], savedAt: data.savedAt, originRequiresRefresh: recipe.originId === null, destinationRequiresRefresh: recipe.destinationId === null })
}

/** Only call after an explicit passenger choice to resume this proposal. */
export function resumeJourney(candidate: JourneyResumeCandidate, catalogue: JourneyCatalogue, currentOrigin?: JourneyPlace, now = Date.now()): JourneyState | null {
  const accepted = validateResume(candidate, catalogue, now)
  if (!accepted) return null
  const maps = catalogueMaps(catalogue)
  const origin = accepted.originId ? maps.places.get(accepted.originId)! : currentOrigin && isJourneyPlace(currentOrigin) && isFreshJourneyOrigin(currentOrigin, now) ? copyJourneyPlace(currentOrigin) : null
  const destination = accepted.destinationId ? maps.places.get(accepted.destinationId)! : null
  const alreadyBoarded = accepted.phase === 'aboard' || accepted.phase === 'approaching' || accepted.phase === 'last-leg'
  if (!alreadyBoarded && (!origin || !destination)) return null
  const selectedPlan = createJourneyOption({ origin, destination, boarding: maps.stopMap.get(accepted.boardingId)!, alighting: maps.stopMap.get(accepted.alightingId)!, stops: maps.stops, lineId: maps.lineId, verifiedRoute: catalogue.verifiedRoute, now })
  if (!selectedPlan) return null
  return Object.freeze({ phase: accepted.phase, leg: accepted.leg, origin, destination, selectedPlan, originRequiresRefresh: !origin, destinationRequiresRefresh: !destination, confirmation: emptyConfirmation() })
}
