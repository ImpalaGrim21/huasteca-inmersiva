import type { TransitStop } from './types'

const NOTE_KEY = 'miredmetro:private-point-notes:v1'
export const cleanPointNote = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 140)

export function readPointNotes(allowedIds: readonly string[]): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTE_KEY)
    if (!raw || raw.length > 24_000) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([id, value]) => allowedIds.includes(id) && typeof value === 'string').map(([id, value]) => [id, cleanPointNote(value as string)]))
  } catch { return {} }
}

export function writePointNotes(notes: Record<string, string>): boolean {
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); return true } catch { return false }
}

/** Private notes and passenger location are deliberately not arguments. */
export function buildPointCard(stop: TransitStop, pointLabel: string, guideUrl: string): string {
  return [
    'MiRedMetro · Ciudad Valles · Guía independiente',
    'L1 Universitaria — referencia cartográfica de cobertura parcial',
    `${stop.name} · ${pointLabel}`,
    `Coordenadas del mapa: ${stop.coordinates[1].toFixed(6)}, ${stop.coordinates[0].toFixed(6)}`,
    'Operación actual, sentido y accesibilidad: por confirmar.',
    'No contiene un itinerario ni una estimación de llegada.',
    `Levantamiento declarado en OSM: ${stop.surveyDate ?? 'sin fecha'}`,
    `Edición cartográfica: ${stop.osmUpdatedAt?.slice(0, 10) ?? 'sin fecha'}`,
    `Fuente: ${stop.sourceUrl}`,
    '© colaboradores de OpenStreetMap · ODbL',
    `Abrir guía: ${guideUrl}`,
    'Consulta SCT: 444 812 0677 · https://sct.slp.gob.mx/',
  ].join('\n')
}

export type TravelIntent = 'board' | 'arrive' | 'return'
export function operatorQuestion(name: string, intent: TravelIntent): string {
  if (intent === 'board') return `Quiero subir cerca de ${name}. ¿Dónde debo abordar y qué destino indica esta unidad?`
  if (intent === 'return') return `Necesito regresar desde ${name}. ¿Dónde debo abordar y cuál es la última salida de hoy?`
  return `Quiero llegar a ${name}. ¿Esta unidad pasa por ahí y dónde debo bajar?`
}
