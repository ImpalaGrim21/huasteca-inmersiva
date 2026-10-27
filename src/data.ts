import { assetUrl } from './asset-url'
export type Category = 'Todos' | 'Agua y cascadas' | 'Aventura' | 'Cultura'

export interface Destination {
  id: string
  name: string
  shortName: string
  municipality: string
  category: Exclude<Category, 'Todos'>
  description: string
  experience: string
  duration: number
  position: [number, number]
  image: string
  imagePosition?: string
  source: string
}

export interface TourPackage {
  id: string
  name: string
  description: string
  destinationIds: string[]
  days: number
  price: number
  capacity: number
  status: 'Publicado' | 'Borrador'
  category: Exclude<Category, 'Todos'>
  image: string
  includes: string[]
}

export const destinations: Destination[] = [
  {
    id: 'tamul', name: 'Cascada de Tamul', shortName: 'Tamul', municipality: 'Aquismón',
    category: 'Agua y cascadas',
    description: 'El encuentro entre el río Gallinas y el Santa María se convierte en una de las postales más extraordinarias de la Huasteca.',
    experience: 'Contemplación · Recorrido en río', duration: 180, position: [-0.5, 1],
    image: assetUrl('images/tamul.webp'), imagePosition: 'center 57%',
    source: 'https://2024-2027.aquismon-slp.gob.mx/index.php/cascada-de-tamul',
  },
  {
    id: 'puente', name: 'Puente de Dios', shortName: 'Puente de Dios', municipality: 'Tamasopo',
    category: 'Agua y cascadas',
    description: 'Una formación natural de roca, agua turquesa y vegetación que invita a descubrir otra perspectiva de Tamasopo.',
    experience: 'Naturaleza · Fotografía', duration: 120, position: [-5, 1],
    image: assetUrl('images/puente-de-dios.webp'), source: 'https://experiencias.visitasanluispotosi.com/directory/puente-de-dios-en-tamasopo/',
  },
  {
    id: 'micos', name: 'Cascadas de Micos', shortName: 'Micos', municipality: 'Ciudad Valles',
    category: 'Aventura',
    description: 'Una sucesión de cascadas en un entorno de vegetación tropical. Un escenario para diseñar experiencias de aventura junto al río.',
    experience: 'Cascadas · Aventura', duration: 150, position: [3, -4],
    image: assetUrl('images/micos.webp'), source: 'https://experiencias.visitasanluispotosi.com/directory/salto-de-cascadas-en-micos-y-nacimiento-de-tanchipa/',
  },
  {
    id: 'xilitla', name: 'Jardín de Edward James', shortName: 'Xilitla', municipality: 'Xilitla',
    category: 'Cultura',
    description: 'Escaleras, columnas y estructuras surrealistas conviven con la vegetación en Las Pozas, el jardín escultórico de Edward James.',
    experience: 'Arte · Arquitectura · Selva', duration: 120, position: [5, 6],
    image: assetUrl('images/xilitla.webp'), source: 'https://laspozasxilitla.org.mx/',
  },
  {
    id: 'golondrinas', name: 'Sótano de las Golondrinas', shortName: 'Las Golondrinas', municipality: 'Aquismón',
    category: 'Aventura',
    description: 'Una gran cavidad vertical en la sierra de Aquismón, reconocida por el espectáculo de las aves que habitan sus paredes.',
    experience: 'Observación de aves · Senderismo', duration: 120, position: [2, 5],
    image: assetUrl('images/golondrinas.webp'), source: 'https://segam.slp.gob.mx/areas-naturales-protegidas/sotano-de-las-golondrinas/',
  },
  {
    id: 'tamasopo', name: 'Cascadas de Tamasopo', shortName: 'Tamasopo', municipality: 'Tamasopo',
    category: 'Agua y cascadas',
    description: 'Caídas de agua y pozas rodeadas de vegetación. Una parada para disfrutar con calma el paisaje de la región.',
    experience: 'Cascadas · Descanso', duration: 120, position: [-6, -2],
    image: assetUrl('images/tamasopo.webp'), source: 'https://cascadasdetamasopo.com.mx/',
  },
]

export const initialPackages: TourPackage[] = [
  {
    id: 'turquesa', name: 'El corazón turquesa',
    description: 'Tres escenarios. Un mismo asombro. Descubre la esencia de la Huasteca entre cascadas, ríos y caminos llenos de vida.',
    destinationIds: ['puente', 'tamul', 'micos'], days: 2, price: 2450, capacity: 12,
    status: 'Publicado', category: 'Agua y cascadas', image: assetUrl('images/tamul.webp'),
    includes: ['Transporte local', 'Guía de la región', 'Equipo de seguridad'],
  },
  {
    id: 'surrealista', name: 'Entre selva y surrealismo',
    description: 'Un encuentro con el arte de Edward James y los paisajes de la sierra de Aquismón.',
    destinationIds: ['xilitla', 'golondrinas'], days: 2, price: 1890, capacity: 10,
    status: 'Publicado', category: 'Cultura', image: assetUrl('images/xilitla.webp'),
    includes: ['Transporte local', 'Guía de la región'],
  },
  {
    id: 'agua', name: 'Donde el agua te lleva',
    description: 'Una escapada para reconectar con la naturaleza en las pozas y cascadas de Tamasopo.',
    destinationIds: ['tamasopo', 'puente'], days: 1, price: 1250, capacity: 8,
    status: 'Borrador', category: 'Agua y cascadas', image: assetUrl('images/puente-de-dios.webp'),
    includes: ['Guía de la región', 'Equipo de seguridad'],
  },
]

export const categories: Category[] = ['Todos', 'Agua y cascadas', 'Aventura', 'Cultura']
export const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)
export const getDestination = (id: string) => destinations.find((d) => d.id === id)!

export function readPackages(): { packages: TourPackage[]; warning: string | null } {
  try {
    const saved = localStorage.getItem('huasteca-packages-v1')
    if (!saved) return { packages: initialPackages, warning: null }
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isPackage)) throw new Error('Datos inválidos')
    return { packages: parsed.map(p => ({ ...p, image: assetUrl(p.image) })), warning: null }
  } catch {
    return { packages: initialPackages, warning: 'No pudimos recuperar los cambios locales. Mostramos los paquetes de ejemplo.' }
  }
}

function isPackage(value: unknown): value is TourPackage {
  if (!value || typeof value !== 'object') return false
  const p = value as TourPackage
  return typeof p.id === 'string' && typeof p.name === 'string' && typeof p.description === 'string'
    && Array.isArray(p.destinationIds) && p.destinationIds.length > 0 && new Set(p.destinationIds).size === p.destinationIds.length
    && p.destinationIds.every(id => destinations.some(d => d.id === id))
    && Number.isInteger(p.days) && p.days > 0 && p.days <= 30
    && Number.isFinite(p.price) && p.price > 0 && Number.isInteger(p.capacity) && p.capacity > 0
    && ['Publicado', 'Borrador'].includes(p.status) && categories.includes(p.category)
    && typeof p.image === 'string' && Array.isArray(p.includes) && p.includes.every(i => typeof i === 'string')
}
