import { assetUrl } from '../asset-url'
import { useEffect, useRef, useState } from 'react'
import { BedDouble, Building2, Landmark, Leaf, Mountain, Store, Utensils } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ExperienceArea } from '../experience-data'
import './TerrainMap.css'

export type TerrainDestination = {
  id: string
  name: string
  position: [number, number]
  category: string
  image?: string
}

type Props = {
  destinations: TerrainDestination[]
  routeIds: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  viewMode: '3d' | '2d'
  focusVersion: number
  zoom: number
  playing: boolean
  layers: boolean
  immersive?: boolean
  areas?: ExperienceArea[]
  activeAreaId?: string | null
  onAreaSelect?: (id: string) => void
  cameraMode?: 'overview' | 'focus' | 'follow'
  focusedDestinationId?: string | null
  journeyProgress?: number
  atmosphere?: 'day' | 'golden'
}

// Both local rasters cover this exact Web Mercator crop. The six landmarks
// use geographic coordinates; custom future landmarks retain the public API.
const BOUNDS = { west: -99.5, east: -98.8, south: 21.35, north: 22.2 }
const WIDTH = 16
const mercator = (latitude: number) => Math.asinh(Math.tan(latitude * Math.PI / 180))
const NORTH = mercator(BOUNDS.north), SOUTH = mercator(BOUNDS.south)
const DEPTH = WIDTH * (NORTH - SOUTH) / ((BOUNDS.east - BOUNDS.west) * Math.PI / 180)
const VERTICAL_EXAGGERATION = 4
const HORIZONTAL_METRES = (BOUNDS.east - BOUNDS.west) * Math.PI / 180 * 6378137 * Math.cos(21.775 * Math.PI / 180)
const LANDMARKS: Record<string, [number, number]> = {
  puente: [21.932, -99.416], tamul: [21.801, -99.180], micos: [22.103, -99.155],
  tamasopo: [21.939, -99.397], xilitla: [21.397, -98.997], golondrinas: [21.600, -99.099],
}
function geographicPosition(destination: TerrainDestination): [number, number] {
  const coordinates = LANDMARKS[destination.id]
  if (!coordinates) return destination.position
  return coordinatePosition(coordinates)
}
function coordinatePosition([latitude, longitude]: [number, number]): [number, number] {
  return [((longitude - BOUNDS.west) / (BOUNDS.east - BOUNDS.west) - 0.5) * WIDTH,
    ((NORTH - mercator(latitude)) / (NORTH - SOUTH) - 0.5) * DEPTH]
}
type TerrainAssets = { height: ImageData; satellite: HTMLImageElement; minimum: number; maximum: number }
const loadLocalImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error(`Unable to load ${source}`))
  image.src = source
})

function TerrainFallback({ destinations, routeIds, onSelect, selectedId, immersive, areas, activeAreaId, onAreaSelect }: Pick<Props, 'destinations' | 'routeIds' | 'onSelect' | 'selectedId' | 'immersive' | 'areas' | 'activeAreaId' | 'onAreaSelect'>) {
  const points = routeIds.map(id => destinations.find(d => d.id === id)).filter((d): d is TerrainDestination => Boolean(d))
  const xy = (d: TerrainDestination) => { const [x, z] = geographicPosition(d); return [300 + x / WIDTH * 300, 225 + z / DEPTH * 390] }
  const badgeXY = (destination: TerrainDestination) => {
    const [x, y] = xy(destination)
    return destination.id === 'puente' ? [x - 35, y - 13] : destination.id === 'tamasopo' ? [x + 35, y + 14] : [x, y]
  }
  return <div className="terrain-fallback">
    <svg viewBox="0 0 600 450" aria-label="Vista satelital interactiva de atractivos de la Huasteca" role="img">
      <image href={assetUrl('maps/huasteca-satellite.webp')} x="150" y="30" width="300" height="390" preserveAspectRatio="none" />
      {immersive && areas?.map(area => <polygon key={area.id} points={area.boundary.map(coordinatePosition).map(([x, z]) => `${300 + x / WIDTH * 300},${225 + z / DEPTH * 390}`).join(' ')} fill={area.color} fillOpacity={activeAreaId === area.id ? 0.28 : 0.1} stroke={area.color} strokeWidth={activeAreaId === area.id ? 2 : 1} onClick={() => onAreaSelect?.(area.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onAreaSelect?.(area.id) } }} tabIndex={0} role="button" aria-label={`Explorar área ${area.title}`} style={{ cursor: 'pointer' }} />)}
      <polyline points={points.map(d => xy(d).join(',')).join(' ')} fill="none" stroke="#d5ef65" strokeWidth="3" strokeDasharray="6 3" />
      {destinations.map(d => { const [x, y] = badgeXY(d), [anchorX, anchorY] = xy(d); return <g key={d.id}><line x1={anchorX} y1={anchorY} x2={x} y2={y} stroke="#f2f4d3" strokeWidth="1" strokeDasharray="3 2" /><g transform={`translate(${x},${y})`} onClick={() => onSelect(d.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(d.id) } }} tabIndex={0} role="button" aria-label={`Explorar ${d.name}`} style={{ cursor: 'pointer' }}><rect x="-60" y="-29" width="120" height="44" rx="4" fill="transparent" pointerEvents="all" /><circle r={selectedId === d.id ? 10 : 7} fill={routeIds.includes(d.id) ? '#d5ef65' : '#fff'} stroke="#1c4233" strokeWidth="2" /><text y="-15" textAnchor="middle" fontSize="11" fontWeight="600" fill="white" pointerEvents="none">{d.name}</text></g></g> })}
    </svg>
    <span className="terrain-fallback-note">Vista ligera · el renderizado 3D no está disponible en este dispositivo.</span>
  </div>
}

export default function TerrainMap(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const leaderRefs = useRef(new Map<string, SVGLineElement>())
  const areaLabelRefs = useRef(new Map<string, HTMLButtonElement>())
  const propsRef = useRef(props)
  const invalidateRef = useRef<() => void>(() => {})
  const [fallback, setFallback] = useState(false)
  const [ready, setReady] = useState(false)
  const [assets, setAssets] = useState<TerrainAssets | null>(null)
  // App filters/maps its array inline. Its identity changes with unrelated UI
  // state; only actual landmark changes should recreate the GPU resources.
  const destinationSignature = props.destinations.map(d => `${d.id}:${d.name}:${d.position.join(',')}`).join('|')
  const areaSignature = props.areas?.map(area => `${area.id}:${area.color}:${JSON.stringify(area.boundary)}:${area.center.join(',')}`).join('|') || ''
  propsRef.current = props

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadLocalImage(assetUrl('maps/huasteca-heightmap.png')),
      loadLocalImage(assetUrl('maps/huasteca-satellite.webp')),
      fetch(assetUrl('maps/huasteca-dem.json')).then(response => { if (!response.ok) throw new Error('Missing terrain metadata'); return response.json() as Promise<{ minimum_m: number; maximum_m: number }> }),
    ]).then(([heightmap, satellite, metadata]) => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = heightmap.width; canvas.height = heightmap.height
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(heightmap, 0, 0)
      setAssets({ height: context.getImageData(0, 0, canvas.width, canvas.height), satellite, minimum: metadata.minimum_m, maximum: metadata.maximum_m })
    }).catch(() => { if (!cancelled) setFallback(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !assets) return
    const mapDestinations = props.destinations.map(destination => ({ ...destination, position: geographicPosition(destination) }))
    const elevationMetres = (x: number, z: number) => {
      const u = THREE.MathUtils.clamp(x / WIDTH + 0.5, 0, 1) * (assets.height.width - 1)
      const v = THREE.MathUtils.clamp(z / DEPTH + 0.5, 0, 1) * (assets.height.height - 1)
      const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(x0 + 1, assets.height.width - 1), y1 = Math.min(y0 + 1, assets.height.height - 1)
      const sample = (sx: number, sy: number) => assets.height.data[(sy * assets.height.width + sx) * 4]
      const value = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sample(x0, y0), sample(x1, y0), u - x0), THREE.MathUtils.lerp(sample(x0, y1), sample(x1, y1), u - x0), v - y0)
      return Math.max(0, assets.minimum + value / 255 * (assets.maximum - assets.minimum))
    }
    const elevation = (x: number, z: number) => 0.08 + elevationMetres(x, z) / HORIZONTAL_METRES * WIDTH * VERTICAL_EXAGGERATION
    let disposed = false, frame = 0
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      setFallback(true)
      return
    }
    setFallback(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.setClearColor(0xeff1e8, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('aria-label', 'Relieve 3D interactivo de la Huasteca: arrastra para girar')
    renderer.domElement.setAttribute('role', 'img')
    mount.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    if (props.immersive) {
      scene.background = new THREE.Color('#071d18')
      scene.fog = new THREE.FogExp2('#071d18', 0.012)
    }
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120)
    camera.position.set(12, 19, 27)
    const controls = new OrbitControls(camera, renderer.domElement)
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    controls.target.set(0, 0.3, 0)
    controls.enableDamping = !motionPreference.matches
    controls.dampingFactor = 0.065
    controls.enablePan = false
    controls.enableZoom = true
    controls.minDistance = props.immersive ? 3.5 : 14
    controls.maxDistance = 48
    controls.minPolarAngle = 0.12
    controls.maxPolarAngle = Math.PI * 0.43
    controls.rotateSpeed = 0.55
    const hemisphere = new THREE.HemisphereLight(0xf1f5ec, 0x5c6d55, props.immersive ? 1.25 : 1.7)
    scene.add(hemisphere)
    const sun = new THREE.DirectionalLight(0xfff7e7, 2.5)
    sun.position.set(-11, 22, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -16
    sun.shadow.camera.right = 16
    sun.shadow.camera.top = 15
    sun.shadow.camera.bottom = -15
    sun.shadow.normalBias = 0.08
    sun.shadow.bias = -0.0002
    sun.shadow.radius = 3
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdde9eb, 0.8)
    fill.position.set(12, 8, -10)
    scene.add(fill)
    const landscape = new THREE.Group()
    landscape.rotation.y = -0.08
    scene.add(landscape)

    const nx = 184, nz = 240, width = WIDTH, depth = DEPTH
    const positions: number[] = [], colors: number[] = [], indices: number[] = [], uvs: number[] = []
    const low = new THREE.Color('#527a56'), medium = new THREE.Color('#8f9d69'), high = new THREE.Color('#c0bd96')
    const color = new THREE.Color()
    const getXZ = (i: number, j: number) => [(i / nx - 0.5) * width, (j / nz - 0.5) * depth]
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const [x, z] = getXZ(i, j), y = elevation(x, z), metres = elevationMetres(x, z)
      positions.push(x, y, z)
      uvs.push(i / nx, 1 - j / nz)
      color.copy(low).lerp(medium, Math.min(1, metres / 1600))
      if (metres > 1600) color.lerp(high, Math.min(1, (metres - 1600) / 1200))
      colors.push(color.r, color.g, color.b)
      if (i < nx && j < nz) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    const terrainGeometry = new THREE.BufferGeometry()
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    terrainGeometry.setIndex(indices)
    terrainGeometry.computeVertexNormals()
    const satelliteTexture = new THREE.Texture(assets.satellite)
    satelliteTexture.colorSpace = THREE.SRGBColorSpace
    satelliteTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    satelliteTexture.needsUpdate = true
    const terrainMaterial = new THREE.MeshStandardMaterial({ map: satelliteTexture, roughness: 0.96, metalness: 0, flatShading: false, emissive: '#ffffff', emissiveMap: satelliteTexture, emissiveIntensity: 0.12 })
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial)
    terrain.castShadow = true
    terrain.receiveShadow = true
    landscape.add(terrain)

    // Give the geographic model a real thickness, with a subtle earthen edge.
    const perimeter: number[] = []
    for (let i = 0; i <= nx; i++) perimeter.push(i)
    for (let j = 1; j <= nz; j++) perimeter.push(j * (nx + 1) + nx)
    for (let i = nx - 1; i >= 0; i--) perimeter.push(nz * (nx + 1) + i)
    for (let j = nz - 1; j > 0; j--) perimeter.push(j * (nx + 1))
    const wallPositions: number[] = [], wallColors: number[] = [], wallIndices: number[] = []
    const earthTop = new THREE.Color(props.immersive ? '#284b35' : '#52634d'), earthBottom = new THREE.Color(props.immersive ? '#10261e' : '#bfc2aa')
    perimeter.forEach((index, k) => {
      const x = positions[index * 3], y = positions[index * 3 + 1], z = positions[index * 3 + 2]
      wallPositions.push(x, y - 0.02, z, x, -0.65, z)
      wallColors.push(earthTop.r, earthTop.g, earthTop.b, earthBottom.r, earthBottom.g, earthBottom.b)
      const a = k * 2, b = ((k + 1) % perimeter.length) * 2
      wallIndices.push(a, b, a + 1, b, b + 1, a + 1)
    })
    const wallGeometry = new THREE.BufferGeometry()
    wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3))
    wallGeometry.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3))
    wallGeometry.setIndex(wallIndices)
    wallGeometry.computeVertexNormals()
    landscape.add(new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })))

    // Soft contact shadow below the floating landscape, entirely local.
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = shadowCanvas.height = 128
    const shadowContext = shadowCanvas.getContext('2d')!
    const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(40,60,37,.24)')
    gradient.addColorStop(0.7, 'rgba(40,60,37,.10)')
    gradient.addColorStop(1, 'rgba(40,60,37,0)')
    shadowContext.fillStyle = gradient
    shadowContext.fillRect(0, 0, 128, 128)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(29, 33), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }))
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.y = -0.85
    scene.add(contactShadow)
    if (props.immersive) {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: '#0b2921', roughness: 0.97, metalness: 0 }))
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -0.92
      floor.receiveShadow = true
      scene.add(floor)
      const ambientPool = new THREE.PointLight('#8cc4a5', 24, 42, 2)
      ambientPool.position.set(-5, 12, 7)
      scene.add(ambientPool)
    }

    const grid = new THREE.GridHelper(28, 28, 0xc0c9b8, 0xd6dcd0)
    grid.position.y = -0.82
    const gridMaterial = grid.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.22
    scene.add(grid)

    // Marching squares over the same measured DEM creates genuine elevation
    // contours, rather than decorative lines unrelated to the landform.
    const contourGroup = new THREE.Group()
    landscape.add(contourGroup)
    for (const level of [500, 1000, 1500, 2000, 2500]) {
      const segments: THREE.Vector3[] = []
      for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) {
        const corners = [getXZ(i, j), getXZ(Math.min(i + 2, nx), j), getXZ(Math.min(i + 2, nx), Math.min(j + 2, nz)), getXZ(i, Math.min(j + 2, nz))]
        const heights = corners.map(([x, z]) => elevationMetres(x, z))
        const intersections: THREE.Vector3[] = []
        for (let edge = 0; edge < 4; edge++) {
          const next = (edge + 1) % 4
          if ((heights[edge] < level) === (heights[next] < level)) continue
          const t = (level - heights[edge]) / (heights[next] - heights[edge])
          const x = THREE.MathUtils.lerp(corners[edge][0], corners[next][0], t), z = THREE.MathUtils.lerp(corners[edge][1], corners[next][1], t)
          intersections.push(new THREE.Vector3(x, elevation(x, z) + 0.018, z))
        }
        for (let point = 0; point + 1 < intersections.length; point += 2) segments.push(intersections[point], intersections[point + 1])
      }
      contourGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segments), new THREE.LineBasicMaterial({ color: '#ecf0d2', transparent: true, opacity: 0.44 })))
    }

    const areaGroup = new THREE.Group()
    landscape.add(areaGroup)
    const areaMeshes: THREE.Mesh[] = []
    const areaVisuals = new Map<string, { surface: THREE.MeshBasicMaterial; outline: THREE.LineBasicMaterial }>()
    const areaCenters = new Map<string, THREE.Vector3>()
    for (const area of props.areas || []) {
      if (area.boundary.length < 3) continue
      const boundary = area.boundary.map(coordinatePosition).map(([x, z]) => new THREE.Vector2(x, z))
      const faces = THREE.ShapeUtils.triangulateShape(boundary, [])
      const vertices: number[] = []
      const subdivide = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, iteration = 0) => {
        if (iteration < 7 && Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) > 0.3) {
          const ab = a.clone().lerp(b, 0.5), bc = b.clone().lerp(c, 0.5), ca = c.clone().lerp(a, 0.5)
          subdivide(a, ab, ca, iteration + 1); subdivide(ab, b, bc, iteration + 1)
          subdivide(ca, bc, c, iteration + 1); subdivide(ab, bc, ca, iteration + 1)
        } else for (const point of [a, b, c]) vertices.push(point.x, elevation(point.x, point.y) + 0.065, point.y)
      }
      faces.forEach(([a, b, c]) => subdivide(boundary[a], boundary[b], boundary[c]))
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.computeVertexNormals()
      const material = new THREE.MeshBasicMaterial({ color: area.color, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, toneMapped: false, fog: false })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.userData.areaId = area.id
      mesh.renderOrder = 2
      areaGroup.add(mesh)
      areaMeshes.push(mesh)
      const outlinePoints: THREE.Vector3[] = []
      boundary.forEach((point, index) => {
        const next = boundary[(index + 1) % boundary.length], count = Math.max(2, Math.ceil(point.distanceTo(next) / 0.12))
        for (let step = 0; step < count; step++) {
          const p = point.clone().lerp(next, step / count)
          outlinePoints.push(new THREE.Vector3(p.x, elevation(p.x, p.y) + 0.1, p.y))
        }
      })
      outlinePoints.push(outlinePoints[0].clone())
      const outlineMaterial = new THREE.LineBasicMaterial({ color: area.color, transparent: true, opacity: 0.75, toneMapped: false, fog: false })
      const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(outlinePoints), outlineMaterial)
      outline.renderOrder = 3
      areaGroup.add(outline)
      areaVisuals.set(area.id, { surface: material, outline: outlineMaterial })
      const [x, z] = coordinatePosition(area.center)
      areaCenters.set(area.id, new THREE.Vector3(x, elevation(x, z) + 0.12, z))
    }

    const selectedBeacon = new THREE.Group()
    const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.4, 48), new THREE.MeshBasicMaterial({ color: '#e0ff93', transparent: true, opacity: 0.95, side: THREE.DoubleSide, toneMapped: false }))
    beaconRing.rotation.x = -Math.PI / 2
    selectedBeacon.add(beaconRing)
    const beaconHalo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.73, 48), new THREE.MeshBasicMaterial({ color: '#cdeaa0', transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
    beaconHalo.rotation.x = -Math.PI / 2
    selectedBeacon.add(beaconHalo)
    landscape.add(selectedBeacon)

    const pinPositions = new Map<string, THREE.Vector3>()
    const pinGroup = new THREE.Group()
    landscape.add(pinGroup)
    mapDestinations.forEach(d => {
      const [x, z] = d.position, y = elevation(x, z)
      pinPositions.set(d.id, new THREE.Vector3(x, y + 0.8, z))
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 5), new THREE.MeshBasicMaterial({ color: '#e6eddb', transparent: true, opacity: 0.9 }))
      stem.position.set(x, y + 0.36, z)
      pinGroup.add(stem)
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.22, 32), new THREE.MeshBasicMaterial({ color: '#d5ee79', side: THREE.DoubleSide }))
      disc.rotation.x = -Math.PI / 2
      disc.position.set(x, y + 0.065, z)
      pinGroup.add(disc)
    })

    const routeGroup = new THREE.Group()
    landscape.add(routeGroup)
    let routeCurve: THREE.CatmullRomCurve3 | null = null
    let routeAnchors: TerrainDestination[] = []
    const routeThickness = { value: 1 }
    const traveler = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    traveler.visible = false
    landscape.add(traveler)
    const travelerHalo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#dbf58c', transparent: true, opacity: 0.35 }))
    traveler.add(travelerHalo)
    const disposeObject = (object: THREE.Object3D) => {
      object.traverse(child => {
        const mesh = child as THREE.Mesh
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose())
        else mesh.material?.dispose()
      })
    }
    function rebuildRoute() {
      routeGroup.children.forEach(disposeObject)
      routeGroup.clear()
      const destinations = propsRef.current.routeIds.map(id => mapDestinations.find(d => d.id === id)).filter((d): d is TerrainDestination => Boolean(d))
      routeAnchors = destinations
      if (destinations.length < 2) { routeCurve = null; return }
      const anchors = destinations.map(d => new THREE.Vector3(d.position[0], 0, d.position[1]))
      const flatCurve = new THREE.CatmullRomCurve3(anchors, false, 'catmullrom', 0.2)
      const surfacePoints: THREE.Vector3[] = []
      for (let i = 0; i <= 240; i++) {
        const point = flatCurve.getPoint(i / 240)
        point.y = elevation(point.x, point.z) + 0.18
        surfacePoints.push(point)
      }
      routeCurve = new THREE.CatmullRomCurve3(surfacePoints)
      const routeGeometry = new THREE.TubeGeometry(routeCurve, 300, 0.052, 6, false)
      const screenWidthMaterial = (geometry: THREE.TubeGeometry, color: string) => {
        const centers: number[] = []
        for (let segment = 0; segment <= 300; segment++) {
          const center = routeCurve!.getPointAt(segment / 300)
          for (let side = 0; side <= 6; side++) centers.push(center.x, center.y, center.z)
        }
        geometry.setAttribute('routeCenter', new THREE.Float32BufferAttribute(centers, 3))
        const material = new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false })
        material.onBeforeCompile = shader => {
          shader.uniforms.uRouteThickness = routeThickness
          shader.vertexShader = 'attribute vec3 routeCenter; uniform float uRouteThickness;\n' + shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = routeCenter + (position - routeCenter) * uRouteThickness;')
        }
        material.customProgramCacheKey = () => 'huasteca-route-screen-width'
        return material
      }
      const route = new THREE.Mesh(routeGeometry, screenWidthMaterial(routeGeometry, '#d8ff65'))
      routeGroup.add(route)
      // Offset the darker tube beneath the lime core to outline the route on
      // both bright clearings and deep forest without washing out its color.
      const outlineCurve = new THREE.CatmullRomCurve3(surfacePoints.map(point => point.clone().add(new THREE.Vector3(0, -0.06, 0))))
      const outlineGeometry = new THREE.TubeGeometry(outlineCurve, 300, 0.09, 6, false)
      routeGroup.add(new THREE.Mesh(outlineGeometry, screenWidthMaterial(outlineGeometry, '#173c2b')))
    }

    const projected = new THREE.Vector3(), world = new THREE.Vector3()
    const desiredPosition = new THREE.Vector3(), desiredTarget = new THREE.Vector3(), followPosition = new THREE.Vector3(), followTarget = new THREE.Vector3(), originTarget = new THREE.Vector3(0, 0.3, 0)
    let widthPx = 1, heightPx = 1
    let requestDraw = () => {}
    const resize = () => {
      widthPx = mount.clientWidth
      heightPx = mount.clientHeight
      if (!widthPx || !heightPx) return
      renderer.setSize(widthPx, heightPx)
      camera.aspect = widthPx / heightPx
      camera.updateProjectionMatrix()
      controls.maxDistance = 60 * Math.max(1, 1.27 / camera.aspect)
      requestDraw()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()
    let previousRoute = '', previousCamera = '', cameraTween = false, elapsed = 0, lastTime = 0
    let previousPlaying = false, followCamera = true, previousTourStop = '', previousLayers: boolean | undefined, previousAtmosphere = '', previousProgress: number | undefined
    let pointerDragging = false, hoveredArea: string | null = null, pointerStart: { x: number; y: number } | null = null, previousBeacon = ''
    const stopTween = () => { cameraTween = false; followCamera = false; pointerDragging = true }
    const endInteraction = () => { pointerDragging = false }
    controls.addEventListener('start', stopTween)
    controls.addEventListener('end', endInteraction)
    const handleContextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; if (!disposed) setFallback(true) }
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
    const animate = (now: number) => {
      frame = 0
      if (disposed || document.hidden || renderer.getContext().isContextLost()) return
      const p = propsRef.current, delta = lastTime ? Math.min((now - lastTime) / 1000, 0.15) : 1 / 60
      lastTime = now
      landscape.rotation.y = p.viewMode === '2d' ? 0 : -0.08
      landscape.updateMatrixWorld()
      const routeSignature = p.routeIds.join('|')
      if (routeSignature !== previousRoute) { previousRoute = routeSignature; rebuildRoute(); elapsed = 0; previousTourStop = '' }
      if (p.playing !== previousPlaying) { followCamera = true; previousPlaying = p.playing }
      const controlledProgress = typeof p.journeyProgress === 'number'
      if (controlledProgress && p.journeyProgress !== previousProgress && !pointerDragging) followCamera = true
      previousProgress = p.journeyProgress
      const mode = p.cameraMode || 'overview'
      const zoomFactor = Math.max(0.65, Math.min(1.8, p.zoom || 1))
      const fit = Math.max(1, 1.27 / camera.aspect)
      const closeFit = Math.max(1, 0.95 / camera.aspect)
      const cameraSignature = `${p.viewMode}|${p.zoom}|${p.focusVersion}|${widthPx}|${heightPx}|${mode}|${p.focusedDestinationId}|${p.activeAreaId}|${p.playing}`
      if (cameraSignature !== previousCamera) {
        previousCamera = cameraSignature
        followCamera = true
        desiredTarget.copy(originTarget)
        if (p.viewMode === '2d') desiredPosition.set(0, 42 * fit / zoomFactor, 0.001)
        else desiredPosition.set(12 * fit / zoomFactor, 19 * fit / zoomFactor, 27 * fit / zoomFactor)
        if (mode === 'focus') {
          const destination = mapDestinations.find(d => d.id === (p.focusedDestinationId || (!p.activeAreaId ? p.selectedId : null)))
          const area = p.areas?.find(item => item.id === p.activeAreaId)
          const target = destination ? new THREE.Vector3(destination.position[0], elevation(...destination.position) + 0.25, destination.position[1]) : area ? areaCenters.get(area.id)?.clone() : undefined
          if (target) {
            desiredTarget.copy(target).applyMatrix4(landscape.matrixWorld)
            let scale = closeFit / zoomFactor
            if (area && !destination) {
              const [cx, cz] = coordinatePosition(area.center)
              const radius = Math.max(...area.boundary.map(coordinatePosition).map(([x, z]) => Math.hypot(x - cx, z - cz)))
              scale *= Math.max(1.15, radius / 2.5)
            }
            if (p.viewMode === '2d') desiredPosition.copy(desiredTarget).add(new THREE.Vector3(0, 14 * scale, 0.001))
            else desiredPosition.copy(desiredTarget).add(new THREE.Vector3(3.5, 5.6, 7.1).multiplyScalar(scale))
          }
        }
        cameraTween = true
      }
      const liveTour = (p.playing || controlledProgress) && routeAnchors.length > 0
      traveler.visible = liveTour
      if (liveTour) {
        if (!controlledProgress && p.playing) elapsed += delta * 0.045
        const progress = controlledProgress ? THREE.MathUtils.clamp(p.journeyProgress!, 0, 1) : elapsed % 1
        if (routeCurve) traveler.position.copy(routeCurve.getPoint(progress))
        else { const [x, z] = routeAnchors[0].position; traveler.position.set(x, elevation(x, z) + 0.2, z) }
        traveler.position.y += 0.1
        travelerHalo.scale.setScalar(p.playing && !motionPreference.matches ? 1 + Math.sin(now * 0.006) * 0.2 : 1)
        if (!controlledProgress) {
          const stop = routeAnchors[Math.min(routeAnchors.length - 1, Math.round(progress * (routeAnchors.length - 1)))]
          if (stop.id !== previousTourStop) { previousTourStop = stop.id; p.onSelect(stop.id) }
        }
        if (followCamera && (mode === 'follow' || (!p.cameraMode && p.playing))) {
          const lookAhead = routeCurve ? routeCurve.getPoint(Math.min(1, progress + 0.045)) : traveler.position.clone().add(new THREE.Vector3(0, 0, -1))
          const current = traveler.position.clone().applyMatrix4(landscape.matrixWorld)
          followTarget.copy(lookAhead).applyMatrix4(landscape.matrixWorld)
          followTarget.y += 0.3
          const direction = followTarget.clone().sub(current); direction.y = 0
          if (direction.lengthSq() < 0.01 && routeCurve) direction.copy(routeCurve.getTangent(Math.max(0, progress - 0.01))).transformDirection(landscape.matrixWorld)
          if (direction.lengthSq() < 0.01) direction.set(0, 0, -1)
          direction.y = 0; direction.normalize()
          if (p.cameraMode) {
            if (p.viewMode === '2d') followPosition.copy(current).add(new THREE.Vector3(0, 17 * closeFit / zoomFactor, 0.001))
            else followPosition.copy(current).addScaledVector(direction, -6 * closeFit / zoomFactor).add(new THREE.Vector3(direction.z * 1.4, 6.5 * closeFit / zoomFactor, -direction.x * 1.4))
            followPosition.y = Math.max(followPosition.y, 5)
          } else {
            followTarget.copy(current).multiplyScalar(0.3)
            followTarget.y = 0.3 + followTarget.y * 0.35
            followPosition.set(12 * fit / zoomFactor, 19 * fit / zoomFactor, 27 * fit / zoomFactor).add(followTarget)
          }
          desiredPosition.copy(followPosition)
          desiredTarget.copy(followTarget)
          cameraTween = true
        }
      }
      if (cameraTween) {
        const speed = motionPreference.matches ? 1 : 1 - Math.exp(-delta * (mode === 'follow' ? 5.5 : 7.5))
        camera.position.lerp(desiredPosition, speed)
        controls.target.lerp(desiredTarget, speed)
        if (camera.position.distanceTo(desiredPosition) < 0.025 && controls.target.distanceTo(desiredTarget) < 0.025) cameraTween = false
      }
      const lightingKey = `${p.immersive}|${p.atmosphere || 'day'}`
      if (lightingKey !== previousAtmosphere) {
        previousAtmosphere = lightingKey
        const golden = p.atmosphere === 'golden'
        sun.color.set(golden ? '#ffd095' : '#fff5de')
        sun.position.set(golden ? -18 : -11, golden ? 8 : 22, golden ? -10 : 8)
        sun.intensity = golden ? 3.3 : 2.5
        hemisphere.color.set(golden ? '#f3d6ae' : '#e8f1e7')
        hemisphere.groundColor.set(golden ? '#35452d' : '#355e50')
        hemisphere.intensity = p.immersive ? (golden ? 1.05 : 1.35) : 1.7
        fill.color.set(golden ? '#9fbed4' : '#d0e8e5')
        fill.intensity = golden ? 0.65 : 0.8
        if (p.immersive) {
          const background = golden ? '#11271d' : '#071d18'
          ;(scene.background as THREE.Color).set(background)
          ;(scene.fog as THREE.FogExp2).color.set(background)
          ;(scene.fog as THREE.FogExp2).density = golden ? 0.014 : 0.011
        }
      }
      areaGroup.visible = Boolean(p.immersive && !controlledProgress)
      areaVisuals.forEach((visual, id) => {
        const active = p.activeAreaId === id, hovered = hoveredArea === id
        visual.surface.opacity = active ? 0.20 : hovered ? 0.14 : p.activeAreaId ? 0.025 : 0.065
        visual.outline.opacity = active ? 1 : hovered ? 0.95 : p.activeAreaId ? 0.22 : 0.75
      })
      const focusedDestination = mapDestinations.find(d => d.id === (p.focusedDestinationId || p.selectedId))
      selectedBeacon.visible = Boolean(p.immersive && focusedDestination && (mode === 'focus' || controlledProgress))
      if (focusedDestination) {
        const [x, z] = focusedDestination.position
        selectedBeacon.position.set(x, elevation(x, z) + 0.11, z)
        if (previousBeacon !== focusedDestination.id) {
          previousBeacon = focusedDestination.id
          for (const ring of [beaconRing, beaconHalo]) {
            const positions = ring.geometry.getAttribute('position')
            for (let index = 0; index < positions.count; index++) positions.setZ(index, elevation(x + positions.getX(index), z - positions.getY(index)) - elevation(x, z) + 0.025)
            positions.needsUpdate = true
            ring.geometry.computeBoundingSphere()
          }
        }
        beaconHalo.scale.setScalar(p.playing && !motionPreference.matches ? 1 + Math.sin(now * 0.004) * 0.12 : 1)
      }
      controls.enabled = p.viewMode === '3d'
      controls.enableRotate = p.viewMode === '3d'
      landscape.rotation.y = p.viewMode === '2d' ? 0 : -0.08
      if (previousLayers !== p.layers) {
        previousLayers = p.layers
        terrainMaterial.map = p.layers ? satelliteTexture : null
        terrainMaterial.emissiveMap = p.layers ? satelliteTexture : null
        terrainMaterial.vertexColors = !p.layers
        terrainMaterial.emissiveIntensity = p.layers ? 0.12 : 0
        terrainMaterial.needsUpdate = true
      }
      grid.visible = !p.immersive
      contourGroup.visible = !p.layers
      if (p.viewMode === '2d') { camera.up.set(0, 0, -1); camera.lookAt(controls.target) }
      else { camera.up.set(0, 1, 0); controls.update() }
      camera.updateMatrixWorld()
      routeThickness.value = p.immersive ? THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) / 35, 0.22, 1) : 1
      scene.updateMatrixWorld()
      areaCenters.forEach((position, id) => {
        const label = areaLabelRefs.current.get(id)
        if (!label) return
        projected.copy(position).applyMatrix4(landscape.matrixWorld).project(camera)
        const x = (projected.x * 0.5 + 0.5) * widthPx, y = (-projected.y * 0.5 + 0.5) * heightPx
        const show = p.immersive && !controlledProgress && mode === 'overview' && projected.z < 1 && x > 70 && x < widthPx - 70 && y > 65 && y < heightPx - 50
        label.hidden = !show
        label.style.left = `${x}px`; label.style.top = `${y + 18}px`
      })
      const labels: { element: HTMLSpanElement; x: number; y: number; width: number; height: number; selected: boolean }[] = []
      const markerPositions: { id: string; marker: HTMLButtonElement; x: number; y: number; anchorX: number; anchorY: number; groundX: number; groundY: number; visible: boolean }[] = []
      pinPositions.forEach((position, id) => {
        const marker = markerRefs.current.get(id)
        if (!marker) return
        world.copy(position).applyMatrix4(landscape.matrixWorld)
        projected.copy(world).project(camera)
        const x = (projected.x * 0.5 + 0.5) * widthPx, y = (-projected.y * 0.5 + 0.5) * heightPx
        const visible = projected.z < 1 && x >= 8 && x <= widthPx - 8 && y >= 30 && y <= heightPx - 8
        world.copy(position); world.y -= 0.7; world.applyMatrix4(landscape.matrixWorld); projected.copy(world).project(camera)
        markerPositions.push({ id, marker, x, y, anchorX: x, anchorY: y, groundX: (projected.x * 0.5 + 0.5) * widthPx, groundY: (-projected.y * 0.5 + 0.5) * heightPx, visible })
      })
      // Nearby real places must remain separately selectable. Repel only the
      // screen-space badges and draw leaders back to their geographic anchors.
      for (let iteration = 0; iteration < 7; iteration++) for (let a = 0; a < markerPositions.length; a++) for (let b = a + 1; b < markerPositions.length; b++) {
        const left = markerPositions[a], right = markerPositions[b]
        if (!left.visible || !right.visible) continue
        let dx = right.x - left.x, dy = right.y - left.y
        const closeTamasopoPair = [left.id, right.id].includes('puente') && [left.id, right.id].includes('tamasopo')
        const photoPair = [left.marker.dataset.detail, right.marker.dataset.detail].every(detail => detail === 'area' || detail === 'focus')
        const minimumDistance = closeTamasopoPair ? p.immersive ? photoPair ? 170 : 36 : 110 : p.immersive ? 34 : 46
        const distance = Math.hypot(dx, dy)
        if (distance >= minimumDistance) continue
        if (closeTamasopoPair) { dx = Math.sign(dx) || 1; dy = 0 }
        if (distance < 1) { dx = 1; dy = 0 }
        const inverse = 1 / Math.max(1, Math.hypot(dx, dy)), displacement = (minimumDistance - distance) / 2
        left.x -= dx * inverse * displacement; left.y -= dy * inverse * displacement
        right.x += dx * inverse * displacement; right.y += dy * inverse * displacement
      }
      markerPositions.forEach(marker => {
        marker.x = THREE.MathUtils.clamp(marker.x, 14, widthPx - 14)
        marker.y = THREE.MathUtils.clamp(marker.y, 35, heightPx - 20)
      })
      const dotBounds: { left: number; top: number; right: number; bottom: number }[] = []
      markerPositions.forEach(({ id, marker, x, y, anchorX, anchorY, groundX, groundY, visible }) => {
        marker.style.left = `${x}px`
        marker.style.top = `${y}px`
        marker.style.opacity = visible ? '1' : '0'
        marker.style.pointerEvents = visible ? 'auto' : 'none'
        marker.style.zIndex = id === p.selectedId ? '8' : String(3 + Math.round((1 - projected.z) * 10))
        const dotSize = marker.querySelector<HTMLSpanElement>('.terrain-pin-dot')?.offsetHeight || 27
        const leader = leaderRefs.current.get(id)
        if (leader) {
          leader.setAttribute('x1', String(groundX)); leader.setAttribute('y1', String(groundY))
          leader.setAttribute('x2', String(x)); leader.setAttribute('y2', String(y - dotSize / 2))
          leader.style.opacity = visible && Math.hypot(x - anchorX, y - anchorY) > 2 ? '0.9' : '0'
        }
        if (visible) dotBounds.push({ left: x - dotSize / 2 - 2, top: y - dotSize - 2, right: x + dotSize / 2 + 2, bottom: y + 2 })
        const label = marker.querySelector<HTMLSpanElement>('.terrain-pin-label')
        if (visible && label && label.offsetWidth && label.offsetHeight) labels.push({ element: label, x, y: y - marker.offsetHeight, width: label.offsetWidth, height: label.offsetHeight, selected: id === p.selectedId })
      })
      // Labels can move a few pixels while their ground pins remain exact.
      // Prioritise the active stop and avoid both clipped text and collisions.
      const occupied: { left: number; top: number; right: number; bottom: number }[] = []
      labels.sort((a, b) => Number(b.selected) - Number(a.selected) || a.y - b.y).forEach(label => {
        const defaultLeft = label.x - label.width / 2
        let bestLeft = THREE.MathUtils.clamp(defaultLeft, 10, Math.max(10, widthPx - label.width - 10))
        let bestTop = THREE.MathUtils.clamp(label.y, 10, heightPx - label.height - 10)
        let bestPenalty = Infinity
        for (const dy of [0, -28, 28, -52, 52]) for (const dx of [0, -32, 32]) {
          const left = THREE.MathUtils.clamp(defaultLeft + dx, 10, Math.max(10, widthPx - label.width - 10))
          const top = THREE.MathUtils.clamp(label.y + dy, 10, heightPx - label.height - 10)
          const overlaps = [...occupied, ...dotBounds].filter(rect => left < rect.right + 4 && left + label.width > rect.left - 4 && top < rect.bottom + 4 && top + label.height > rect.top - 4).length
          const penalty = overlaps * 10000 + Math.abs(dy) * 1.3 + Math.abs(dx)
          if (penalty < bestPenalty) { bestPenalty = penalty; bestLeft = left; bestTop = top }
        }
        label.element.style.setProperty('--label-x', `${bestLeft - defaultLeft}px`)
        label.element.style.setProperty('--label-y', `${bestTop - label.y}px`)
        occupied.push({ left: bestLeft, top: bestTop, right: bestLeft + label.width, bottom: bestTop + label.height })
      })
      areaLabelRefs.current.forEach(label => {
        if (label.hidden) return
        const w = label.offsetWidth, h = label.offsetHeight, x = parseFloat(label.style.left) - w / 2, y = parseFloat(label.style.top)
        let best = { left: x, top: y, penalty: Infinity }
        for (const [dx, dy] of [[0, 0], [0, 48], [-95, 0], [95, 0], [0, -55], [-80, 45], [80, 45]]) {
          const leftMargin = p.immersive && widthPx < 700 && mode === 'overview' ? 62 : 15
          const left = THREE.MathUtils.clamp(x + dx, leftMargin, Math.max(leftMargin, widthPx - w - 15)), top = THREE.MathUtils.clamp(y + dy, 20, heightPx - h - 25)
          const collisions = [...occupied, ...dotBounds].filter(rect => left < rect.right + 5 && left + w > rect.left - 5 && top < rect.bottom + 5 && top + h > rect.top - 5).length
          const penalty = collisions * 10000 + Math.hypot(dx, dy)
          if (penalty < best.penalty) best = { left, top, penalty }
        }
        label.style.left = `${best.left + w / 2}px`; label.style.top = `${best.top}px`
        occupied.push({ left: best.left, top: best.top, right: best.left + w, bottom: best.top + h })
      })
      renderer.render(scene, camera)
      // At rest there is no animation loop. User input, prop updates, resize,
      // camera damping or an explicitly started tour request another frame.
      if (cameraTween || (liveTour && p.playing && !controlledProgress)) requestDraw()
      else if (!frame) lastTime = 0
    }
    requestDraw = () => { if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(animate) }
    invalidateRef.current = requestDraw
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pickArea = (event: PointerEvent) => {
      if (!propsRef.current.immersive || typeof propsRef.current.journeyProgress === 'number' || !areaMeshes.length) return null
      const rectangle = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rectangle.left) / rectangle.width * 2 - 1, -((event.clientY - rectangle.top) / rectangle.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(areaMeshes, false)[0]?.object.userData.areaId as string | undefined
    }
    const handlePointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY } }
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || pointerDragging) return
      const hit = pickArea(event) || null
      if (hoveredArea !== hit) { hoveredArea = hit; renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'; requestDraw() }
    }
    const handlePointerUp = (event: PointerEvent) => {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) <= 5) {
        const hit = pickArea(event)
        if (hit) propsRef.current.onAreaSelect?.(hit)
      }
      pointerStart = null
    }
    const handlePointerLeave = () => { if (hoveredArea) { hoveredArea = null; requestDraw() } }
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
    controls.addEventListener('change', requestDraw)
    const handleVisibility = () => {
      lastTime = 0
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0 }
      else requestDraw()
    }
    const handleMotionPreference = () => { controls.enableDamping = !motionPreference.matches; requestDraw() }
    document.addEventListener('visibilitychange', handleVisibility)
    motionPreference.addEventListener('change', handleMotionPreference)
    requestDraw()
    setReady(true)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      controls.removeEventListener('start', stopTween)
      controls.removeEventListener('end', endInteraction)
      controls.removeEventListener('change', requestDraw)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionPreference.removeEventListener('change', handleMotionPreference)
      invalidateRef.current = () => {}
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
      scene.traverse(object => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose())
        else mesh.material?.dispose()
      })
      shadowTexture.dispose()
      satelliteTexture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [destinationSignature, areaSignature, props.immersive, assets])

  useEffect(() => { invalidateRef.current() }, [props.routeIds, props.selectedId, props.viewMode, props.zoom, props.focusVersion, props.playing, props.layers, props.activeAreaId, props.cameraMode, props.focusedDestinationId, props.journeyProgress, props.atmosphere, areaSignature, destinationSignature])

  return <div className={`terrain-map ${ready ? 'is-ready' : ''} ${props.immersive ? 'terrain-immersive' : ''} ${props.atmosphere === 'golden' ? 'is-golden' : ''}`} ref={mountRef} data-testid="terrain-map">
    <svg className="terrain-marker-lines" aria-hidden="true">{props.destinations.map(destination => <line key={destination.id} ref={element => { if (element) leaderRefs.current.set(destination.id, element); else leaderRefs.current.delete(destination.id) }} />)}</svg>
    {props.immersive && !fallback && props.areas?.map(area => <button type="button" key={area.id} ref={element => { if (element) areaLabelRefs.current.set(area.id, element); else areaLabelRefs.current.delete(area.id) }} className={`terrain-area-label ${props.activeAreaId === area.id ? 'is-active' : ''}`} onClick={() => props.onAreaSelect?.(area.id)} aria-label={`Explorar área ${area.title}`} aria-pressed={props.activeAreaId === area.id} style={{ borderColor: area.color }}><i className="terrain-area-color" style={{ backgroundColor: area.color }} /><span><strong>{area.title}</strong><small>{area.destinationIds.length} {area.destinationIds.length === 1 ? 'lugar' : 'lugares'}</small></span><span className="terrain-area-arrow">↗</span></button>)}
    {!fallback && props.destinations.map(destination => {
      const routeIndex = props.routeIds.indexOf(destination.id)
      const selected = props.selectedId === destination.id
      const PlaceIcon = destination.category === 'Hospedaje' ? BedDouble : destination.category === 'Pueblos' ? Building2 : destination.category === 'Cultura' ? Landmark : destination.category === 'Plazas' ? Leaf : destination.category === 'Comida' ? Utensils : destination.category === 'Servicios' ? Store : Mountain
      const journey = typeof props.journeyProgress === 'number'
      const activeArea = props.areas?.find(area => area.id === props.activeAreaId)
      const detail = !props.immersive ? 'legacy' : journey ? routeIndex >= 0 ? 'journey' : 'dot' : props.focusedDestinationId ? selected ? 'focus' : 'dot' : activeArea ? activeArea.destinationIds.includes(destination.id) ? selected ? 'area' : 'member' : 'dot' : 'dot'
      return <button
        key={destination.id}
        ref={element => { if (element) markerRefs.current.set(destination.id, element); else markerRefs.current.delete(destination.id) }}
        className={`terrain-pin detail-${detail} ${selected ? 'is-selected' : ''} ${routeIndex >= 0 ? 'on-route' : ''}`}
        data-detail={detail}
        onClick={() => props.onSelect(destination.id)}
        onMouseEnter={() => invalidateRef.current()}
        onMouseLeave={() => invalidateRef.current()}
        onFocus={() => invalidateRef.current()}
        onBlur={() => invalidateRef.current()}
        aria-label={`Explorar ${destination.name}`}
        aria-pressed={selected}
        type="button"
      >
        <span className="terrain-pin-label">{props.immersive && (detail === 'area' || detail === 'focus') && destination.image && <img className="terrain-pin-photo" src={destination.image} alt="" />}<span className="terrain-pin-name">{destination.name}{props.immersive && <small>{routeIndex >= 0 ? `PARADA ${String(routeIndex + 1).padStart(2, '0')}` : destination.category}</small>}</span>{props.immersive && <span className="terrain-pin-arrow">↗</span>}</span>
        <span className="terrain-pin-dot">{routeIndex >= 0 ? String(routeIndex + 1).padStart(2, '0') : <PlaceIcon aria-hidden="true" size={16} strokeWidth={1.5} />}</span>
      </button>
    })}
    {!ready && !fallback && <div className="terrain-loading"><span />Preparando el paisaje…</div>}
    {fallback && <TerrainFallback {...props} />}
    <a className="terrain-attribution" href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer" title="Elevación INEGI / Mapzen. Satélite NASA GIBS / USGS Landsat WELD, mosaico histórico 2000. Exageración vertical 4×. Fuentes completas en Créditos.">INEGI · NASA/USGS · Landsat 2000</a>
  </div>
}
