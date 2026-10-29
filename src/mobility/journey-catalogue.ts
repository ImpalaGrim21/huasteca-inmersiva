import line from './data/line-reference.json'
import city from './data/city-places.json'
import type { TransitStop } from './types'
import type { JourneyPlace } from './journey/types'

export const JOURNEY_STOPS: readonly TransitStop[] = line.stops.map(stop => ({
  ...stop, coordinates: [stop.coordinates[0], stop.coordinates[1]],
  aliases: [...(stop.aliases ?? []), ...(stop.name === 'Hospital General IMSS' ? ['IMSS 6', 'IMSS6', 'Hospital General de Zona 6'] : [])],
}))

export interface LocalPlace extends JourneyPlace {
  shortName: string
  category: string
  aliases: readonly string[]
  description: string
  reference: boolean
}

const shortNames: Record<string, string> = {
  'Hospital General de Zona 6 IMSS': 'IMSS 6', 'Hospital General IMSS': 'IMSS 6',
  'Tecnológico de Ciudad Valles': 'Tecnológico', 'UASLP · Zona Huasteca': 'UASLP',
  'Universidad Autónoma de San Luis Potosí · Zona Huasteca': 'UASLP', 'Zona Centro': 'Centro',
}

const references: LocalPlace[] = line.references.map(place => ({
  id: place.id, name: place.name, shortName: shortNames[place.name] ?? (place.name.includes('UASLP') ? 'UASLP' : place.name.includes('IMSS') ? 'IMSS 6' : place.name),
  coordinates: [place.coordinates[0], place.coordinates[1]],
  provenance: { kind: 'community-cartography', sourceUrl: place.sourceUrl },
  category: place.category === 'health' ? 'Salud' : place.category === 'education' ? 'Estudios' : 'Ciudad',
  aliases: place.aliases, description: place.osmName, reference: true,
}))
const preferredNames = new Set(['Hospital General IMSS', 'Tecnológico', 'Zona Centro'])
const seen = new Set<string>()
const stopPlaces: LocalPlace[] = []
for (const stop of JOURNEY_STOPS) {
  if (seen.has(stop.name) || preferredNames.has(stop.name)) continue
  seen.add(stop.name)
  stopPlaces.push({ id: stop.id, name: stop.name, shortName: shortNames[stop.name] ?? stop.name, coordinates: stop.coordinates,
    provenance: { kind: 'community-cartography', sourceUrl: stop.sourceUrl }, category: 'Punto de la L1',
    aliases: stop.aliases ?? [], description: 'Ubicación cartográfica de referencia · confirma el punto y el sentido.', reference: false })
}
const categories: Record<string, string> = { hospital: 'Hospital', clinic: 'Clínica', pharmacy: 'Farmacia', university: 'Universidad', school: 'Escuela', office: 'Oficina', market: 'Mercado', shop: 'Comercio', park: 'Parque', square: 'Plaza', sports: 'Deporte', culture: 'Cultura', terminal: 'Terminal', place: 'Lugar' }
const referenceIds = new Set(references.map(place => place.id))
const cityPlaces: LocalPlace[] = city.places.filter(place => !referenceIds.has(place.id)).map(place => ({
  id: place.id, name: place.name, shortName: place.name, coordinates: [place.coordinates[0], place.coordinates[1]],
  provenance: { kind: 'community-cartography', sourceUrl: place.sourceUrl }, category: categories[place.category] ?? 'Lugar',
  aliases: [], description: `${categories[place.category] ?? 'Lugar'} · ${place.coordinateKind === 'area-bbox-center' ? 'referencia al centro del área, no entrada' : 'punto en OpenStreetMap'}`,
  reference: true,
}))
export const LOCAL_PLACES: readonly LocalPlace[] = [...references, ...stopPlaces, ...cityPlaces]
export const JOURNEY_CATALOGUE = { places: LOCAL_PLACES, stops: JOURNEY_STOPS, lineId: 'valles-l1' }
export const FEATURED_PLACES = ['IMSS', 'Tecnológico', 'UASLP', 'Zona Centro'].map(name => references.find(place => place.name.includes(name))).filter((place): place is LocalPlace => Boolean(place))
export const shortPlaceName = (place: JourneyPlace) => LOCAL_PLACES.find(item => item.id === place.id)?.shortName ?? place.name

