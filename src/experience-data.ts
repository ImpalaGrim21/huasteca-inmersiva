import { assetUrl } from './asset-url'
export interface ExperienceArea {
  id: string
  title: string
  kicker: string
  description: string
  color: string
  destinationIds: string[]
  center: [number, number]
  boundary: [number, number][]
  image: string
}

export interface PhotoHotspot {
  id: string
  label: string
  text: string
  x: number
  y: number
}

export interface DestinationStory {
  id: string
  headline: string
  body: string
  highlights: string[]
  hotspots: PhotoHotspot[]
}

// Editorial areas for exploration, not administrative boundaries or navigable routes.
// Centers and polygon vertices use [latitude, longitude] in decimal degrees.
export const experienceAreas: ExperienceArea[] = [
  {
    id: 'agua',
    title: 'Agua que conecta',
    kicker: 'POZAS, ROCAS Y CAÍDAS DE AGUA',
    description: 'Puente de Dios, Tamasopo y Tamul: tres formas de descubrir el agua y encontrar el pulso de la Huasteca.',
    color: '#8fd6c2',
    destinationIds: ['puente', 'tamasopo', 'tamul'],
    center: [21.89, -99.331],
    boundary: [
      [22.005, -99.47],
      [22.005, -99.29],
      [21.92, -99.13],
      [21.76, -99.12],
      [21.74, -99.25],
      [21.85, -99.46],
    ],
    image: assetUrl('images/tamul.webp'),
  },
  {
    id: 'sierra',
    title: 'Selva y surrealismo',
    kicker: 'ROCA, BOSQUE Y ARQUITECTURA',
    description: 'La sierra de Aquismón y el jardín de Xilitla: dos escenarios donde la roca, la vegetación y la imaginación cambian la mirada.',
    color: '#d9ec9c',
    destinationIds: ['golondrinas', 'xilitla'],
    center: [21.499, -99.048],
    boundary: [
      [21.69, -99.16],
      [21.67, -98.98],
      [21.49, -98.87],
      [21.355, -98.91],
      [21.355, -99.07],
      [21.50, -99.18],
    ],
    image: assetUrl('images/xilitla.webp'),
  },
  {
    id: 'aventura',
    title: 'Ríos de aventura',
    kicker: 'EL PAISAJE SIGUE SU CURSO',
    description: 'En Micos, las caídas escalonadas y la vegetación dibujan un paisaje fluvial con carácter propio.',
    color: '#e9bb74',
    destinationIds: ['micos'],
    center: [22.103, -99.155],
    boundary: [
      [22.195, -99.25],
      [22.19, -99.08],
      [22.11, -98.99],
      [22.035, -99.055],
      [22.035, -99.235],
      [22.115, -99.29],
    ],
    image: assetUrl('images/micos.webp'),
  },
]

// Hotspots were placed after inspecting the six local photographs. Coordinates
// are normalized against each uncropped image, from its top-left corner.
// These photographs are interactive still images, not panoramic/360 captures.
export const destinationStories: Record<string, DestinationStory> = {
  tamul: {
    id: 'tamul',
    headline: 'Donde el agua cambia de escala',
    body: 'El río se abre entre pozas y roca antes de caer al cañón. Desde esta perspectiva, Tamul revela el contraste entre la fuerza del agua y el bosque que la rodea.',
    highlights: ['Caída de agua', 'Cañón y bosque', 'Perspectiva aérea'],
    hotspots: [
      {
        id: 'salto', label: 'El salto', x: 0.47, y: 0.49,
        text: 'El agua rebasa el borde de roca y cae junto a la pared del cañón.',
      },
      {
        id: 'agua-roca', label: 'Agua entre roca', x: 0.66, y: 0.28,
        text: 'Antes de la caída, los tonos turquesa contrastan con las superficies de roca expuesta.',
      },
      {
        id: 'bosque', label: 'El bosque del cañón', x: 0.82, y: 0.67,
        text: 'Las copas de los árboles cubren la ladera que acompaña la caída de agua.',
      },
    ],
  },
  puente: {
    id: 'puente',
    headline: 'La luz encuentra su camino',
    body: 'En Tamasopo, el agua aparece entre la roca y las raíces. La poza de Puente de Dios guarda una escena de verdes, reflejos y pequeñas cortinas de agua.',
    highlights: ['Poza natural', 'Cortinas de agua', 'Roca y vegetación'],
    hotspots: [
      {
        id: 'cortina', label: 'Cortina de agua', x: 0.19, y: 0.49,
        text: 'Una caída delgada recorre la pared de roca a la izquierda de la fotografía.',
      },
      {
        id: 'poza', label: 'La poza', x: 0.55, y: 0.83,
        text: 'La superficie de agua reúne reflejos azules y verdes al pie de las paredes.',
      },
      {
        id: 'roca-raices', label: 'Roca y raíces', x: 0.43, y: 0.42,
        text: 'Raíces y ramas descienden sobre las formas irregulares de la roca.',
      },
    ],
  },
  micos: {
    id: 'micos',
    headline: 'Un paisaje que sigue el río',
    body: 'El agua se reúne al pie de las caídas escalonadas de Micos. Las laderas y las ramas enmarcan una escena donde el río marca el ritmo del paisaje.',
    highlights: ['Cascadas escalonadas', 'Paisaje fluvial', 'Laderas cubiertas de verde'],
    hotspots: [
      {
        id: 'caidas', label: 'Las caídas escalonadas', x: 0.50, y: 0.58,
        text: 'Al fondo, varias cortinas de agua se reparten sobre el desnivel de roca.',
      },
      {
        id: 'superficie', label: 'El agua en primer plano', x: 0.58, y: 0.78,
        text: 'Pequeñas ondulaciones y reflejos cambian el color de la superficie del río.',
      },
      {
        id: 'laderas', label: 'Laderas verdes', x: 0.40, y: 0.35,
        text: 'La vegetación cubre las laderas que cierran el paisaje detrás de las cascadas.',
      },
    ],
  },
  xilitla: {
    id: 'xilitla',
    headline: 'La imaginación echa raíces',
    body: 'En Las Pozas, las curvas de concreto se entrelazan con la vegetación. El jardín de Edward James invita a mirar cómo la arquitectura y el bosque comparten espacio.',
    highlights: ['Arquitectura surrealista', 'Jardín escultórico', 'Vegetación y concreto'],
    hotspots: [
      {
        id: 'arcos', label: 'Arcos de concreto', x: 0.28, y: 0.61,
        text: 'Las formas curvas se superponen entre columnas, plataformas y vegetación.',
      },
      {
        id: 'columna', label: 'Columna y vegetación', x: 0.81, y: 0.20,
        text: 'Una columna se eleva entre hojas y ramas, a la derecha de la imagen.',
      },
      {
        id: 'flores', label: 'Flores entre ramas', x: 0.20, y: 0.12,
        text: 'Las flores y las ramas cruzan la escena por encima de las estructuras.',
      },
    ],
  },
  golondrinas: {
    id: 'golondrinas',
    headline: 'La sierra revela su profundidad',
    body: 'La roca se abre en una cavidad vertical entre la vegetación de Aquismón. Esta fotografía histórica permite observar sus paredes y la escala del borde.',
    highlights: ['Cavidad vertical', 'Paredes de roca', 'Fotografía histórica'],
    hotspots: [
      {
        id: 'pared', label: 'Paredes de la cavidad', x: 0.35, y: 0.45,
        text: 'La pared vertical muestra texturas, grietas y cambios de luz hacia el interior.',
      },
      {
        id: 'borde', label: 'Relieve del borde', x: 0.79, y: 0.38,
        text: 'La foto histórica muestra un borde de roca irregular; no representa accesos ni condiciones actuales.',
      },
      {
        id: 'vegetacion', label: 'Vegetación en la roca', x: 0.61, y: 0.11,
        text: 'La vegetación crece entre las formas de la roca, cerca de la abertura de la cavidad.',
      },
    ],
  },
  tamasopo: {
    id: 'tamasopo',
    headline: 'El agua se convierte en paisaje',
    body: 'Las caídas de Tamasopo se despliegan sobre la roca entre árboles y vegetación. Al frente, la poza reúne reflejos y deja ver otra escala del paisaje.',
    highlights: ['Caídas y poza', 'Roca y vegetación', 'Paisaje de Tamasopo'],
    hotspots: [
      {
        id: 'caida', label: 'Caída principal', x: 0.26, y: 0.40,
        text: 'Una cortina de agua desciende sobre la pared de roca hasta encontrarse con la poza.',
      },
      {
        id: 'reflejos', label: 'Reflejos en la poza', x: 0.54, y: 0.72,
        text: 'La luz y las formas de la orilla se reflejan sobre la superficie del agua.',
      },
      {
        id: 'roca', label: 'Roca y vegetación', x: 0.73, y: 0.34,
        text: 'La roca expuesta y las plantas se alternan entre los distintos brazos de la caída.',
      },
    ],
  },
}
