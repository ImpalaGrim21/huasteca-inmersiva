import { destinations } from './data'

export type GuideCategory = 'Pueblos' | 'Plazas' | 'Hospedaje' | 'Cultura' | 'Comida' | 'Servicios' | 'Naturaleza'

export interface GuidePlace {
  id: string
  name: string
  category: GuideCategory
  municipality: string
  lat: number
  lon: number
  summary: string
  highlights: string[]
  sourceUrl: string
  websiteUrl?: string
  image?: string
  sceneId?: 'xilitla-centro'
  verification: 'Oficial' | 'OSM' | 'Documental'
  locationNote?: string
}

export interface GuideGeometry {
  origin: [number, number]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  buildings: { id: string; polygon: [number, number][]; holes?: [number, number][][]; name?: string; levels?: number }[]
  paths: { id: string; points: [number, number][]; kind: 'road' | 'path' | 'steps'; name?: string }[]
  squares: { id: string; polygon: [number, number][]; name?: string }[]
  trees: [number, number][]
  attribution: string
  source: string
  heightNotice: string
}

const attractionCoordinates: Record<string, [number, number]> = {
  tamul: [21.80127, -99.18002],
  puente: [21.93173, -99.41566],
  tamasopo: [21.93914, -99.39719],
  micos: [22.10278, -99.15535],
  xilitla: [21.39732, -98.99677],
  golondrinas: [21.6000, -99.0991],
}

const attractionHighlights: Record<string, string[]> = {
  tamul: ['Cascada y cañón', 'Aquismón', 'Paisaje fluvial'],
  puente: ['Poza y roca', 'Tamasopo', 'Vegetación de ribera'],
  tamasopo: ['Caídas de agua', 'Pozas', 'Paisaje de Tamasopo'],
  micos: ['Cascadas escalonadas', 'Ciudad Valles', 'Paisaje de río'],
  xilitla: ['Jardín escultórico', 'Arquitectura y vegetación', 'Edward James'],
  golondrinas: ['Cavidad vertical', 'Aquismón', 'Monumento natural'],
}

// The six original attractions remain discoverable regionally. None belongs to
// the urban scene; their existing local image URLs already respect Vite's base.
const originalAttractions: GuidePlace[] = destinations.map(destination => {
  const [lat, lon] = attractionCoordinates[destination.id]
  return {
    id: destination.id,
    name: destination.name,
    category: 'Naturaleza',
    municipality: destination.municipality,
    lat,
    lon,
    summary: destination.description,
    highlights: attractionHighlights[destination.id],
    sourceUrl: destination.source,
    image: destination.image,
    verification: ['tamul', 'puente', 'micos', 'golondrinas'].includes(destination.id) ? 'Oficial' : 'Documental',
    locationNote: 'Ubicación orientativa del atractivo; no identifica taquilla, embarcadero ni punto de reunión.',
  }
})

export const guidePlaces: GuidePlace[] = [
  {
    id: 'xilitla-centro', name: 'Xilitla', category: 'Pueblos', municipality: 'Xilitla',
    lat: 21.3852933, lon: -98.9900642,
    summary: 'Una plaza, un exconvento y espacios de arte reúnen vida cotidiana y patrimonio. Explora el centro de Xilitla antes de armar tu visita.',
    highlights: ['Centro urbano', 'Arte y patrimonio', 'Cultura del café'],
    sourceUrl: 'https://www.gob.mx/sectur/articulos/xilitla-san-luis-potosi',
    websiteUrl: 'https://2024-2027.xilitla-slp.gob.mx/',
    sceneId: 'xilitla-centro', verification: 'Oficial',
    locationNote: 'El punto toma la plaza como referencia del centro; no representa límites municipales.',
  },
  {
    id: 'aquismon-centro', name: 'Aquismón', category: 'Pueblos', municipality: 'Aquismón',
    lat: 21.6243008, lon: -99.0198232,
    summary: 'Conoce la cabecera de Aquismón y su relación con la cultura y los paisajes de su municipio. Un lugar para dar contexto a tu visita a la sierra.',
    highlights: ['Pueblo Mágico', 'Vida local', 'Sierra de Aquismón'],
    sourceUrl: 'https://turismo.slp.gob.mx/lugares/aquismon/',
    websiteUrl: 'https://2024-2027.aquismon-slp.gob.mx/',
    verification: 'Oficial',
    locationNote: 'Referencia de población OSM, nodo 4080629097. No es la ubicación precisa de la plaza ni de una oficina.',
  },
  {
    id: 'ciudad-valles-centro', name: 'Ciudad Valles', category: 'Pueblos', municipality: 'Ciudad Valles',
    lat: 21.9916551, lon: -99.0102967,
    summary: 'Alojamiento, gastronomía y servicios conectan la ciudad con la Huasteca. Ubica lugares reales y consulta directamente a sus responsables.',
    highlights: ['Centro de servicios', 'Alojamiento', 'Vida urbana'],
    sourceUrl: 'https://turismo.slp.gob.mx/lugares/ciudad-valles/',
    websiteUrl: 'https://vallesslp.gob.mx/',
    verification: 'Oficial',
    locationNote: 'Referencia OSM de ciudad, nodo 292474264; no es un perímetro del centro ni un punto de encuentro.',
  },
  {
    id: 'jardin-hidalgo', name: 'Plaza Principal · Jardín Hidalgo', category: 'Plazas', municipality: 'Xilitla',
    lat: 21.3852933, lon: -98.9900642,
    summary: 'La Plaza Principal aparece en el mapa como Jardín Hidalgo. Un espacio de referencia para reconocer el centro y conectar sus lugares.',
    highlights: ['Plaza de Xilitla', 'Entorno del kiosco', 'Vida pública'],
    sourceUrl: 'https://slp.gob.mx/lugares/plaza-principal-de-xilitla/',
    sceneId: 'xilitla-centro', verification: 'Oficial',
    locationNote: 'Polígono de referencia OSM way 405514351; la escena conserva su traza cartográfica.',
  },
  {
    id: 'convento-san-agustin', name: 'Templo y exconvento de San Agustín', category: 'Cultura', municipality: 'Xilitla',
    lat: 21.38520827, lon: -98.98953731,
    summary: 'El exconvento de San Agustín forma parte del patrimonio de Xilitla. Su entorno junto a la plaza ayuda a entender el pueblo a través de su arquitectura.',
    highlights: ['Patrimonio de Xilitla', 'Arquitectura religiosa', 'Entorno de la plaza'],
    sourceUrl: 'https://slp.gob.mx/lugares/xilitla/',
    sceneId: 'xilitla-centro', verification: 'Oficial',
    locationNote: 'Referencia de la huella OSM relation 12111700, etiquetada con el nombre parroquial Inmaculado Corazón de María. No identifica una entrada ni acceso interior.',
  },
  {
    id: 'museo-leonora', name: 'Museo Leonora Carrington Xilitla', category: 'Cultura', municipality: 'Xilitla',
    lat: 21.3854395, lon: -98.9907571,
    summary: 'Un museo dedicado a la obra de Leonora Carrington en Corregidora 103. Descubre otra relación entre Xilitla y el surrealismo dentro del centro.',
    highlights: ['Obra de Leonora Carrington', 'Corregidora 103', 'Espacio cultural'],
    sourceUrl: 'https://sic.cultura.gob.mx/ficha.php?table=museo&table_id=2004',
    websiteUrl: 'https://cultura.slp.gob.mx/lugares/museo-leonora-carrington-xilitla/',
    sceneId: 'xilitla-centro', verification: 'Oficial',
    locationNote: 'Ubicación OSM node 6773103641, cotejada con la dirección publicada. La guía no confirma acceso ni agenda del día.',
  },
  {
    id: 'posada-el-castillo', name: 'Posada El Castillo', category: 'Hospedaje', municipality: 'Xilitla',
    lat: 21.3860979, lon: -98.9901411,
    summary: 'Una estancia en Melchor Ocampo 105, dentro del centro de Xilitla. Conoce su entorno antes de consultar los espacios y habitaciones con el alojamiento.',
    highlights: ['Melchor Ocampo 105', 'Estancia en el centro', 'Contacto con el alojamiento'],
    sourceUrl: 'https://www.elcastilloxilitla.com/',
    websiteUrl: 'https://www.elcastilloxilitla.com/',
    sceneId: 'xilitla-centro', verification: 'Documental',
    locationNote: 'Punto OSM node 2529359209; no delimita el edificio ni una habitación. Disponibilidad y vistas por consultar.',
  },
  {
    id: 'hostal-del-cafe', name: 'Hotel Hostal Del Café', category: 'Hospedaje', municipality: 'Xilitla',
    lat: 21.38377258, lon: -98.99226269,
    summary: 'Un alojamiento del centro que relaciona su identidad con el café y la naturaleza. Conoce su entorno y consulta sus espacios con el establecimiento.',
    highlights: ['Temática cafetalera', 'Centro de Xilitla', 'Alojamiento'],
    sourceUrl: 'https://www.hotelhostaldelcafe.com.mx/',
    websiteUrl: 'https://www.hotelhostaldelcafe.com.mx/',
    sceneId: 'xilitla-centro', verification: 'Documental',
    locationNote: 'Referencia de huella OSM way 1214869353. El nombre comercial no demuestra dormitorios compartidos; no se representa un interior.',
  },
  {
    id: 'hotel-valles', name: 'Hotel Valles', category: 'Hospedaje', municipality: 'Ciudad Valles',
    lat: 21.9915288, lon: -99.0106724,
    summary: 'Un hotel de la zona centro de Ciudad Valles con alojamiento y restauración publicados en su sitio. Ubica la propiedad y consulta la categoría que te interese.',
    highlights: ['Zona centro', 'Hospedaje', 'Restauración en la propiedad'],
    sourceUrl: 'https://hotelvalles.mx/contacto/',
    websiteUrl: 'https://hotelvalles.mx/',
    verification: 'Documental',
    locationNote: 'Centro de la propiedad OSM way 504419640; no identifica recepción, comedor ni vista desde una habitación.',
  },
  {
    id: 'hostal-casa-huasteca', name: 'Hostal Casa Huasteca', category: 'Hospedaje', municipality: 'Ciudad Valles',
    lat: 21.9871646, lon: -99.0134051,
    summary: 'Hostal documentado en General Blas Escontría 610. Su posición permite situarlo en Ciudad Valles; el canal de contacto actual aún requiere confirmación.',
    highlights: ['Alojamiento documentado', 'Ciudad Valles', 'Referencia de ubicación'],
    sourceUrl: 'https://turismoslp.com.mx/Principal/Noticias/hoteles2020.pdf',
    verification: 'Documental',
    locationNote: 'Punto OSM node 6773119714. Los dominios históricos no se validaron como canales activos; no hay inventario ni contacto comercial confirmado.',
  },
  {
    id: 'expendio-cafe', name: 'Expendio de Café', category: 'Comida', municipality: 'Xilitla',
    lat: 21.38437363, lon: -98.99287903,
    summary: 'Un punto de café identificado en el mapa comunitario cerca del centro de Xilitla. Se conserva como referencia local; su atención actual debe consultarse.',
    highlights: ['Referencia de café', 'Entorno urbano', 'Dato cartográfico'],
    sourceUrl: 'https://www.openstreetmap.org/way/1214869337',
    sceneId: 'xilitla-centro', verification: 'OSM',
    locationNote: 'OSM lo etiqueta como «Expendió de Café». No se ha confirmado razón comercial, menú, horario ni operación actual.',
  },
  {
    id: 'la-palapa-valles', name: 'Restaurante La Palapa', category: 'Comida', municipality: 'Ciudad Valles',
    lat: 21.9915288, lon: -99.0106724,
    summary: 'Restaurante identificado por Hotel Valles dentro de su propiedad. Descubre su relación con la estancia y consulta el servicio directamente con el hotel.',
    highlights: ['Restauración', 'Hotel Valles', 'Contacto con el establecimiento'],
    sourceUrl: 'https://hotelvalles.mx/restaurantes/',
    websiteUrl: 'https://hotelvalles.mx/restaurantes/',
    verification: 'Documental',
    locationNote: 'Se usa la referencia de la propiedad; no se comprobó el acceso al comedor ni disponibilidad de mesas.',
  },
  {
    id: 'informacion-xilitla', name: 'Información local de Xilitla', category: 'Servicios', municipality: 'Xilitla',
    lat: 21.3852933, lon: -98.9900642,
    summary: 'Canal municipal para consultar información de Xilitla. El punto muestra una referencia del centro y no identifica una oficina de atención presencial.',
    highlights: ['Información del municipio', 'Canal institucional', 'Referencia del centro'],
    sourceUrl: 'https://slp.gob.mx/lugares/xilitla/',
    websiteUrl: 'https://2024-2027.xilitla-slp.gob.mx/',
    verification: 'Oficial',
    locationNote: 'Servicio de información, no una oficina geolocalizada. La ficha oficial publica contacto; la atención vigente debe consultarse.',
  },
  ...originalAttractions,
]
export const guideCategories: GuideCategory[] = ['Pueblos', 'Plazas', 'Hospedaje', 'Cultura', 'Comida', 'Servicios', 'Naturaleza']
export const guideOrigin: [number, number] = [21.3852933, -98.9900642]
export const guidePosition = (place: Pick<GuidePlace, 'lat' | 'lon'>): [number, number] => [
  (place.lon - guideOrigin[1]) * 111320 * Math.cos(guideOrigin[0] * Math.PI / 180),
  -(place.lat - guideOrigin[0]) * 111320,
]
