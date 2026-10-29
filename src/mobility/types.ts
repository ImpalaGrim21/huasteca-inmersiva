export interface TransitStop {
  id: string
  name: string
  coordinates: readonly [number, number]
  sourceUrl: string
  osmUpdatedAt?: string
  surveyDate?: string
  verification: string
  aliases?: readonly string[]
}

export interface UserLocation {
  longitude: number
  latitude: number
  accuracy: number
  capturedAt: number
}

export function distanceTo(location: UserLocation, coordinates: readonly [number, number]): number {
  const rad = Math.PI / 180
  const dLat = (coordinates[1] - location.latitude) * rad
  const dLon = (coordinates[0] - location.longitude) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(location.latitude * rad) * Math.cos(coordinates[1] * rad) * Math.sin(dLon / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distanceLabel(meters: number): string {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} km`
}

export function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX')
}

const FAVORITES_KEY = 'valles-en-ruta:saved:v1'
export function readFavorites(allowed: readonly string[]): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw || raw.length > 10_000) return []
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.includes(id)))].slice(0, 100) : []
  } catch { return [] }
}
export function saveFavorites(ids: readonly string[]): boolean {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.slice(0, 100))); return true } catch { return false }
}
