import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { planJourney, journeyDistanceMeters, JOURNEY_LOCATION_MAX_AGE_MS } from '../src/mobility/journey/planner.ts'
import { createJourneyState, journeyReducer, saveJourneyRecipe, restoreJourneyRecipe, saveJourneyResumeCandidate, readJourneyResumeCandidate, resumeJourney, JOURNEY_RECIPE_KEY, JOURNEY_RESUME_KEY, JOURNEY_RESUME_MAX_AGE_MS } from '../src/mobility/journey/session.ts'
import { createPassengerRequestGate } from '../src/mobility/usePassengerPosition.ts'

const line = JSON.parse(await readFile(new URL('../src/mobility/data/line-reference.json', import.meta.url), 'utf8'))
const stops = line.stops
const places = line.references.map(item => ({ id: item.id, name: item.name, coordinates: item.coordinates, provenance: { kind: 'community-cartography', sourceUrl: item.sourceUrl } }))
const origin = places.find(place => /Tecnológico/.test(place.name))
const destination = places.find(place => /IMSS/.test(place.name))
const catalogue = { places, stops, lineId: 'valles-l1' }
const now = Date.now()
function memoryStorage() {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
function prepare(from = origin, to = destination) {
  let state = journeyReducer(createJourneyState(), { type: 'SET_ORIGIN', place: from })
  state = journeyReducer(state, { type: 'SET_DESTINATION', place: to })
  const plan = planJourney({ origin: from, destination: to, stops, now })[0]
  return journeyReducer(state, { type: 'SELECT_PLAN', plan })
}
function aboard(from = origin, to = destination) {
  let state = journeyReducer(prepare(from, to), { type: 'START' })
  state = journeyReducer(state, { type: 'CONFIRM_BOARDING', pointConfirmed: true, destinationConfirmed: true })
  return journeyReducer(state, { type: 'BOARD' })
}
function finishJourney(state = aboard()) {
  return journeyReducer(journeyReducer(state, { type: 'ALIGHT' }), { type: 'FINISH' })
}
const deviceOrigin = capturedAt => ({ id: 'device-current', name: 'Mi ubicación', coordinates: [-99.034, 22.02], provenance: { kind: 'device-location', capturedAt } })

test('GPS origin that expires after selecting a plan cannot start the journey', () => {
  const prepared = prepare(deviceOrigin(now))
  assert.equal(prepared.phase, 'prepared')
  assert.equal(journeyReducer(prepared, { type: 'START' }, now + JOURNEY_LOCATION_MAX_AGE_MS).phase, 'to-board')
  assert.equal(journeyReducer(prepared, { type: 'START' }, now + JOURNEY_LOCATION_MAX_AGE_MS + 1), prepared)
  assert.equal(prepared.phase, 'prepared')
})

test('catalogue origins remain valid while a prepared journey waits', () => {
  const prepared = prepare()
  assert.equal(journeyReducer(prepared, { type: 'START' }, now + 30 * 24 * 60 * 60 * 1000).phase, 'to-board')
  assert.equal(origin.provenance.kind, 'community-cartography')
})

test('current data produces useful geographic candidates, never a fabricated itinerary or ETA', () => {
  const options = planJourney({ origin, destination, stops, now })
  assert.equal(options.length, 3)
  assert.match(options[0].boarding.name, /Tecnológico/)
  assert.match(options[0].alighting.name, /Hospital General IMSS/)
  assert.ok(options[0].totalAccessMeters > 0)
  for (const option of options) {
    assert.equal(option.connection, 'unverified')
    assert.equal(option.confidence, 'cartographic-only')
    assert.equal(option.directionId, undefined)
    assert.equal(option.headsign, undefined)
    assert.ok(option.requirements.some(value => /operador/.test(value)))
    assert.equal('eta' in option || 'duration' in option || 'busGeometry' in option, false)
  }
  assert.ok(Object.isFrozen(options[0]))
  assert.ok(Object.isFrozen(options[0].boarding.coordinates))
})

test('ranking uses geographic access distances and limits/deduplicates physical point pairs', () => {
  const options = planJourney({ origin, destination, stops: [...stops, ...stops], now, limit: 100 })
  assert.equal(options.length, 6)
  assert.equal(new Set(options.map(option => option.id)).size, 6)
  assert.ok(options.every(option => option.boarding.id !== option.alighting.id))
  for (let i = 1; i < options.length; i++) assert.ok(options[i].totalAccessMeters >= options[i - 1].totalAccessMeters)
  assert.equal(planJourney({ origin, destination, stops, limit: 0, now }).length, 1)
  assert.equal(journeyDistanceMeters(origin.coordinates, origin.coordinates), 0)
})

test('invalid places, missing provenance, stale/future GPS and same-place requests are rejected', () => {
  const invalid = [
    { ...origin, coordinates: [NaN, 22] }, { ...origin, coordinates: [-100.9, 22] },
    { ...origin, provenance: undefined }, { ...origin, provenance: { kind: 'official-catalogue', sourceUrl: 'javascript:alert(1)' } },
    deviceOrigin(now - 121_000), deviceOrigin(now + 31_000),
  ]
  for (const candidate of invalid) assert.deepEqual(planJourney({ origin: candidate, destination, stops, now }), [])
  assert.deepEqual(planJourney({ origin, destination: origin, stops, now }), [])
  assert.ok(planJourney({ origin: deviceOrigin(now), destination, stops, now }).length > 0)
})

test('an explicitly curated ordered route can confirm only the published direction', () => {
  const basic = planJourney({ origin, destination, stops, now })[0]
  const verifiedRoute = { lineId: 'valles-l1', sourceUrl: 'https://example.test/approved-route', verifiedAt: new Date(now - 60_000).toISOString(), validUntil: new Date(now + 3600_000).toISOString(), directions: [{ id: 'outbound', headsign: 'Destino validado en test', stopIds: [basic.boarding.id, basic.alighting.id] }] }
  const options = planJourney({ origin, destination, stops, now, verifiedRoute })
  assert.equal(options[0].connection, 'verified')
  assert.equal(options[0].directionId, 'outbound')
  const reverse = planJourney({ origin: destination, destination: origin, stops, now, verifiedRoute })
  const reversedPair = reverse.find(option => option.boarding.id === basic.alighting.id && option.alighting.id === basic.boarding.id)
  assert.equal(reversedPair?.connection ?? 'unverified', 'unverified')
  assert.ok(reverse[0].totalAccessMeters < basic.totalAccessMeters + 100, 'A verified opposite-direction connection must not outrank closer access pairs')
  for (const route of [{ ...verifiedRoute, validUntil: new Date(now - 1).toISOString() }, { ...verifiedRoute, verifiedAt: '2026-02-30' }, { ...verifiedRoute, lineId: 'capital-l1' }, { ...verifiedRoute, directions: [{ ...verifiedRoute.directions[0], stopIds: [basic.boarding.id, 'unknown'] }] }]) {
    assert.equal(planJourney({ origin, destination, stops, now, verifiedRoute: route }).some(option => option.connection === 'verified'), false)
  }
})

test('manual boarding requires a prepared plan, start and both passenger confirmations', () => {
  const empty = createJourneyState()
  assert.equal(journeyReducer(empty, { type: 'START' }), empty)
  assert.equal(journeyReducer(empty, { type: 'BOARD' }), empty)
  let state = prepare()
  assert.equal(state.phase, 'prepared')
  assert.equal(journeyReducer(state, { type: 'BOARD' }), state)
  state = journeyReducer(state, { type: 'START' })
  assert.equal(state.phase, 'to-board')
  assert.equal(journeyReducer(state, { type: 'BOARD' }), state)
  state = journeyReducer(state, { type: 'CONFIRM_BOARDING', pointConfirmed: true, destinationConfirmed: false })
  assert.equal(journeyReducer(state, { type: 'BOARD' }), state)
  state = journeyReducer(state, { type: 'CONFIRM_BOARDING', pointConfirmed: true, destinationConfirmed: true })
  state = journeyReducer(state, { type: 'BOARD' })
  assert.equal(state.phase, 'aboard')
  assert.equal(state.selectedPlan.connection, 'unverified', 'A personal confirmation does not become operator-verified route data')
  state = journeyReducer(state, { type: 'APPROACH' })
  assert.equal(state.phase, 'approaching')
  assert.equal(journeyReducer(state, { type: 'FINISH' }), state, 'Being near the stop is not arrival at the destination')
  state = journeyReducer(state, { type: 'ALIGHT' })
  assert.equal(state.phase, 'last-leg')
  assert.equal(journeyReducer(state, { type: 'FINISH' }).phase, 'finished')
})

test('changing endpoints invalidates old choices and a return is planned afresh', () => {
  let state = aboard()
  state = finishJourney(state)
  state = journeyReducer(state, { type: 'PREPARE_RETURN' })
  assert.equal(state.phase, 'choosing')
  assert.equal(state.leg, 'return')
  assert.equal(state.origin.id, destination.id)
  assert.equal(state.destination.id, origin.id)
  assert.equal(state.selectedPlan, null)
  assert.deepEqual(state.confirmation, { pointConfirmed: false, destinationConfirmed: false })
  const old = prepare()
  const changed = journeyReducer(old, { type: 'SET_DESTINATION', place: places.find(place => /UASLP/.test(place.name)) })
  assert.equal(changed.phase, 'choosing')
  assert.equal(changed.selectedPlan, null)
  assert.equal(journeyReducer(changed, { type: 'SELECT_PLAN', plan: old.selectedPlan }), changed)
  assert.equal(journeyReducer(old, { type: 'SELECT_PLAN', plan: { ...old.selectedPlan, totalAccessMeters: 0 } }), old)
})

test('recipe roundtrip stores only valid catalogue IDs and rehydrates current catalogue data', () => {
  const storage = memoryStorage()
  const state = aboard()
  assert.equal(saveJourneyRecipe(state, catalogue, storage), true)
  const raw = storage.getItem(JOURNEY_RECIPE_KEY)
  assert.doesNotMatch(raw, /coordinates|latitude|longitude|capturedAt|confirmation|aboard|Tecnológico/)
  const changedCatalogue = { ...catalogue, places: places.map(place => place.id === destination.id ? { ...place, name: 'Nombre actual del catálogo' } : place) }
  const restored = restoreJourneyRecipe(changedCatalogue, storage)
  assert.equal(restored.phase, 'prepared')
  assert.equal(restored.destination.name, 'Nombre actual del catálogo')
  assert.equal(restored.selectedPlan.connection, 'unverified')
  assert.deepEqual(restored.confirmation, { pointConfirmed: false, destinationConfirmed: false })
})

test('a GPS origin is never persisted, even if its ID collides with a catalogue place', () => {
  const storage = memoryStorage()
  const privateOrigin = { ...deviceOrigin(now), id: origin.id }
  const state = prepare(privateOrigin)
  assert.equal(saveJourneyRecipe(state, catalogue, storage), true)
  const raw = storage.getItem(JOURNEY_RECIPE_KEY), recipe = JSON.parse(raw)
  assert.equal(recipe.originId, null)
  assert.doesNotMatch(raw, /-99\.034|22\.02|capturedAt|device-location|Mi ubicación/)
  const restored = restoreJourneyRecipe(catalogue, storage)
  assert.equal(restored.phase, 'choosing')
  assert.equal(restored.origin, null)
  assert.equal(restored.originRequiresRefresh, true)
  assert.equal(restored.destination.id, destination.id)
})

test('corrupt, oversized, foreign or removed IDs cannot be restored', () => {
  const storage = memoryStorage()
  saveJourneyRecipe(prepare(), catalogue, storage)
  const valid = JSON.parse(storage.getItem(JOURNEY_RECIPE_KEY))
  for (const value of ['{bad', 'x'.repeat(7000), JSON.stringify({ ...valid, boardingId: '__proto__' }), JSON.stringify({ ...valid, destinationId: 'removed-place' }), JSON.stringify({ ...valid, destinationId: valid.originId }), JSON.stringify({ ...valid, lineId: 'capital-l1' }), JSON.stringify({ ...valid, coordinates: [0, 0] })]) {
    storage.setItem(JOURNEY_RECIPE_KEY, value)
    assert.equal(restoreJourneyRecipe(catalogue, storage), null)
  }
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') } }
  assert.equal(saveJourneyRecipe(prepare(), catalogue, blocked), false)
  assert.equal(restoreJourneyRecipe(catalogue, blocked), null)
})

test('resume candidate is a passive, expiring proposal and never restores confirmations', () => {
  const storage = memoryStorage(), state = aboard()
  assert.equal(saveJourneyResumeCandidate(state, catalogue, storage, now), true)
  const raw = storage.getItem(JOURNEY_RESUME_KEY)
  assert.doesNotMatch(raw, /coordinates|capturedAt|confirmation|Tecnológico/)
  const candidate = readJourneyResumeCandidate(catalogue, storage, now)
  assert.equal(candidate.phase, 'aboard')
  assert.equal(createJourneyState().phase, 'choosing', 'Reading a proposal does not change the current state')
  const resumed = resumeJourney(candidate, catalogue, undefined, now)
  assert.equal(resumed.phase, 'aboard')
  assert.deepEqual(resumed.confirmation, { pointConfirmed: false, destinationConfirmed: false })
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now + JOURNEY_RESUME_MAX_AGE_MS + 1), null)
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now - 31_000), null)
})

test('an explicitly resumed aboard trip can show its alighting point without saved GPS', () => {
  const storage = memoryStorage(), state = aboard(deviceOrigin(now))
  saveJourneyResumeCandidate(state, catalogue, storage, now)
  const candidate = readJourneyResumeCandidate(catalogue, storage, now)
  assert.equal(candidate.originId, null)
  const resumed = resumeJourney(candidate, catalogue, undefined, now)
  assert.equal(resumed.phase, 'aboard')
  assert.equal(resumed.origin, null)
  assert.equal(resumed.originRequiresRefresh, true)
  assert.equal(resumed.destination.id, destination.id)
  assert.equal(resumed.selectedPlan.alighting.id, state.selectedPlan.alighting.id)
  assert.equal(resumed.selectedPlan.originDistanceMeters, null)
  assert.equal(resumed.selectedPlan.totalAccessMeters, null)
  assert.equal(journeyReducer(resumed, { type: 'APPROACH' }).phase, 'approaching')
})

test('resuming a pre-boarding private origin needs a fresh explicit origin; finishing clears the proposal', () => {
  const storage = memoryStorage()
  saveJourneyResumeCandidate(prepare(deviceOrigin(now)), catalogue, storage, now)
  const candidate = readJourneyResumeCandidate(catalogue, storage, now)
  assert.equal(resumeJourney(candidate, catalogue, undefined, now), null)
  assert.equal(resumeJourney(candidate, catalogue, deviceOrigin(now - 121_000), now), null)
  assert.equal(resumeJourney(candidate, catalogue, deviceOrigin(now), now).phase, 'prepared')
  const finished = finishJourney()
  assert.equal(saveJourneyResumeCandidate(finished, catalogue, storage, now), true)
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now), null)
})

test('tampered progress, refresh flags and confirmations are rejected rather than imported', () => {
  const storage = memoryStorage()
  saveJourneyResumeCandidate(aboard(), catalogue, storage, now)
  const valid = JSON.parse(storage.getItem(JOURNEY_RESUME_KEY))
  for (const patch of [{ phase: 'arrived-by-gps' }, { leg: 'other' }, { originRequiresRefresh: true }, { confirmation: { pointConfirmed: true } }, { boardingId: 'removed-stop' }]) {
    storage.setItem(JOURNEY_RESUME_KEY, JSON.stringify({ ...valid, ...patch }))
    assert.equal(readJourneyResumeCandidate(catalogue, storage, now), null)
  }
})

test('a new choosing state explicitly clears an abandoned active resume proposal', () => {
  const storage = memoryStorage()
  const active = aboard()
  saveJourneyResumeCandidate(active, catalogue, storage, now)
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now).phase, 'aboard')
  const choosing = journeyReducer(active, { type: 'SET_DESTINATION', place: origin })
  assert.equal(choosing.phase, 'choosing')
  assert.equal(saveJourneyResumeCandidate(choosing, catalogue, storage, now), true)
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now), null)
})

test('preparing and explicitly resuming a return preserves its leg and resets confirmations', () => {
  const storage = memoryStorage()
  const finished = finishJourney()
  let returning = journeyReducer(finished, { type: 'PREPARE_RETURN' })
  const backOrigin = returning.origin, backDestination = returning.destination
  returning = journeyReducer(returning, { type: 'SET_ORIGIN', place: backOrigin })
  returning = journeyReducer(returning, { type: 'SET_DESTINATION', place: backDestination })
  returning = journeyReducer(returning, { type: 'SELECT_PLAN', plan: planJourney({ origin: backOrigin, destination: backDestination, stops, now })[0] })
  assert.equal(returning.phase, 'prepared')
  assert.equal(returning.leg, 'return')
  saveJourneyResumeCandidate(returning, catalogue, storage, now)
  const resumed = resumeJourney(readJourneyResumeCandidate(catalogue, storage, now), catalogue, undefined, now)
  assert.equal(resumed.leg, 'return')
  assert.equal(resumed.phase, 'prepared')
  assert.deepEqual(resumed.confirmation, { pointConfirmed: false, destinationConfirmed: false })
})

test('a private return destination can resume aboard using the alighting point, never invented coordinates', () => {
  const storage = memoryStorage()
  let returning = journeyReducer(finishJourney(aboard(deviceOrigin(now))), { type: 'PREPARE_RETURN' })
  const plan = planJourney({ origin: returning.origin, destination: returning.destination, stops, now })[0]
  returning = journeyReducer(returning, { type: 'SELECT_PLAN', plan })
  returning = journeyReducer(returning, { type: 'START' })
  returning = journeyReducer(returning, { type: 'CONFIRM_BOARDING', pointConfirmed: true, destinationConfirmed: true })
  returning = journeyReducer(returning, { type: 'BOARD' })
  saveJourneyResumeCandidate(returning, catalogue, storage, now)
  const resumed = resumeJourney(readJourneyResumeCandidate(catalogue, storage, now), catalogue, undefined, now)
  assert.equal(resumed.phase, 'aboard')
  assert.equal(resumed.leg, 'return')
  assert.equal(resumed.destination, null)
  assert.equal(resumed.selectedPlan.alighting.id, plan.alighting.id)
  assert.equal(resumed.selectedPlan.destinationDistanceMeters, null)
  assert.equal(journeyReducer(resumed, { type: 'START' }), resumed)
  assert.equal(journeyReducer(resumed, { type: 'BOARD' }), resumed)
  const lastLeg = journeyReducer(resumed, { type: 'ALIGHT' })
  saveJourneyResumeCandidate(lastLeg, catalogue, storage, now)
  const resumedLastLeg = resumeJourney(readJourneyResumeCandidate(catalogue, storage, now), catalogue, undefined, now)
  assert.equal(resumedLastLeg.phase, 'last-leg')
  assert.equal(resumedLastLeg.destination, null)
  assert.equal(resumedLastLeg.selectedPlan.alighting.id, plan.alighting.id)
  assert.equal(resumedLastLeg.selectedPlan.destinationDistanceMeters, null)
})

test('passenger request cancellation resolves immediately and rejects a late callback', () => {
  const gate = createPassengerRequestGate(), results = []
  const id = gate.begin(value => results.push(value))
  assert.equal(gate.isCurrent(id), true)
  gate.cancel()
  assert.deepEqual(results, [null])
  assert.equal(gate.isCurrent(id), false)
  assert.equal(gate.finish(id, { longitude: -99.01, latitude: 22, accuracy: 10, capturedAt: now }), false)
  assert.deepEqual(results, [null])
})

test('a newer passenger request settles the older one and can complete only once', () => {
  const gate = createPassengerRequestGate(), first = [], second = []
  const oldId = gate.begin(value => first.push(value))
  const newId = gate.begin(value => second.push(value))
  assert.deepEqual(first, [null])
  assert.equal(gate.isCurrent(oldId), false)
  const location = { longitude: -99.01, latitude: 22, accuracy: 10, capturedAt: now }
  assert.equal(gate.finish(oldId, location), false)
  assert.equal(gate.finish(newId, location), true)
  assert.equal(gate.finish(newId, location), false)
  assert.deepEqual(second, [location])
})

test('cancelling without a pending request remains safe across repeated mount cleanup', () => {
  const gate = createPassengerRequestGate(), results = []
  gate.cancel(); gate.cancel()
  const id = gate.begin(value => results.push(value))
  gate.cancel(); gate.cancel()
  assert.deepEqual(results, [null])
  assert.equal(gate.isCurrent(id), false)
})

test('alighting and arrival are distinct manual milestones with no invalid shortcut', () => {
  for (const state of [createJourneyState(), prepare()]) {
    assert.equal(journeyReducer(state, { type: 'ALIGHT' }), state)
    assert.equal(journeyReducer(state, { type: 'FINISH' }), state)
  }
  const riding = aboard()
  assert.equal(journeyReducer(riding, { type: 'FINISH' }), riding)
  const lastLeg = journeyReducer(riding, { type: 'ALIGHT' })
  assert.equal(lastLeg.phase, 'last-leg')
  assert.equal(lastLeg.selectedPlan.alighting.id, riding.selectedPlan.alighting.id)
  assert.equal(lastLeg.destination.id, destination.id)
  assert.equal(journeyReducer(lastLeg, { type: 'BOARD' }), lastLeg)
  assert.equal(journeyReducer(lastLeg, { type: 'APPROACH' }), lastLeg)
  assert.equal(journeyReducer(lastLeg, { type: 'FINISH' }).phase, 'finished')
})

test('last-leg persists until arrival and resumes explicitly without a saved private origin', () => {
  const storage = memoryStorage()
  const lastLeg = journeyReducer(aboard(deviceOrigin(now)), { type: 'ALIGHT' })
  assert.equal(saveJourneyResumeCandidate(lastLeg, catalogue, storage, now), true)
  assert.doesNotMatch(storage.getItem(JOURNEY_RESUME_KEY), /coordinates|capturedAt|device-location/)
  const candidate = readJourneyResumeCandidate(catalogue, storage, now)
  assert.equal(candidate.phase, 'last-leg')
  const resumed = resumeJourney(candidate, catalogue, undefined, now)
  assert.equal(resumed.phase, 'last-leg')
  assert.equal(resumed.origin, null)
  assert.equal(resumed.selectedPlan.originDistanceMeters, null)
  assert.equal(resumed.destination.id, destination.id)
  assert.equal(resumed.selectedPlan.destinationDistanceMeters, lastLeg.selectedPlan.destinationDistanceMeters)
  const arrived = journeyReducer(resumed, { type: 'FINISH' })
  assert.equal(arrived.phase, 'finished')
  saveJourneyResumeCandidate(arrived, catalogue, storage, now)
  assert.equal(readJourneyResumeCandidate(catalogue, storage, now), null)
})
