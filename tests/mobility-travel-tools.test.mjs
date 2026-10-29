import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildPointCard, cleanPointNote, operatorQuestion, readPointNotes, writePointNotes } from '../src/mobility/travel-tools.ts'

const dataset = JSON.parse(await readFile(new URL('../src/mobility/data/line-reference.json', import.meta.url), 'utf8'))
const stop = dataset.stops.find(item => item.name === 'Tecnológico')

test('portable point card carries limitations and provenance instead of inventing a trip or arrival', () => {
  const url = `https://example.test/huasteca-inmersiva/movilidad/?punto=${stop.id}`
  const card = buildPointCard(stop, 'Punto A', url)
  assert.match(card, /MiRedMetro/)
  assert.ok(card.includes(stop.name) && card.includes(stop.sourceUrl) && card.includes(stop.surveyDate))
  assert.ok(card.includes(url))
  assert.match(card, /por confirmar/)
  assert.match(card, /No contiene un itinerario ni una estimación de llegada/)
  assert.match(card, /ODbL/)
  assert.equal(card.includes('hora de llegada garantizada'), false)
})

test('operator prompt respects the explicitly chosen boarding, arrival or return intention', () => {
  assert.match(operatorQuestion(stop.name, 'board'), /subir cerca de Tecnológico/)
  assert.match(operatorQuestion(stop.name, 'arrive'), /llegar a Tecnológico/)
  assert.match(operatorQuestion(stop.name, 'return'), /última salida de hoy/)
  for (const intent of ['board', 'arrive', 'return']) {
    assert.match(operatorQuestion(stop.name, intent), /¿/)
    assert.equal(/en \d+ min|garantizado/.test(operatorQuestion(stop.name, intent)), false)
  }
})

test('private notes are bounded, read only for known points and never enter the public point card', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let saved
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { return saved ?? null }, setItem(_key, value) { saved = value } } })
  try {
    const note = 'Referencia privada QA: junto al local de mi familia'
    assert.equal(writePointNotes({ [stop.id]: note, 'unknown-point': 'untrusted' }), true)
    assert.deepEqual(readPointNotes([stop.id]), { [stop.id]: note })
    assert.equal(buildPointCard(stop, 'Punto A', 'https://example.test/').includes(note), false)
    assert.equal(cleanPointNote('x'.repeat(1000)).length, 140)
    assert.equal(cleanPointNote('  Pista\u0000 con\ncontrol  '), 'Pista  con control')
    saved = '{broken'
    assert.deepEqual(readPointNotes([stop.id]), {})
    saved = JSON.stringify({ [stop.id]: { bad: true } })
    assert.deepEqual(readPointNotes([stop.id]), {})
    saved = 'x'.repeat(25_000)
    assert.deepEqual(readPointNotes([stop.id]), {})
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage }
})

test('storage denial remains recoverable rather than pretending persistence succeeded', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied by test browser') } })
  try { assert.deepEqual(readPointNotes([stop.id]), {}); assert.equal(writePointNotes({ [stop.id]: 'nota' }), false) }
  finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage }
})
