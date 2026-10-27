import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { guidePosition } from '../guide-data'
import type { GuideGeometry, GuidePlace } from '../guide-data'
import type { CitySceneProps, GuideCameraState, GuideViewpoint } from './CityScene.types'
import './CityScene.css'

type Point = [number, number]
type Building = GuideGeometry['buildings'][number]
const EYE_HEIGHT = 1.7
const clamp = THREE.MathUtils.clamp
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
function polygonArea(points: Point[]) { return points.reduce((sum, point, i) => { const next = points[(i + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1] }, 0) / 2 }
function polygonCenter(points: Point[]): Point {
  const area = polygonArea(points)
  if (Math.abs(area) < 0.001) return [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length]
  let x = 0, z = 0
  points.forEach((p, i) => { const q = points[(i + 1) % points.length], cross = p[0] * q[1] - q[0] * p[1]; x += (p[0] + q[0]) * cross; z += (p[1] + q[1]) * cross })
  return [x / (6 * area), z / (6 * area)]
}
function insidePolygon([x, z]: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}
function nearestSegment(point: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / Math.max(0.0001, dx * dx + dz * dz), 0, 1)
  return [a[0] + dx * t, a[1] + dz * t]
}
function boundaryDistance(point: Point, polygon: Point[]) { return Math.min(...polygon.map((p, i) => distance(point, nearestSegment(point, p, polygon[(i + 1) % polygon.length])))) }
function insideBuilding(point: Point, building: Building, margin = 0) {
  const outer = insidePolygon(point, building.polygon)
  if (outer && !building.holes?.some(hole => insidePolygon(point, hole) && boundaryDistance(point, hole) > margin)) return true
  return margin > 0 && boundaryDistance(point, building.polygon) < margin
}
function shapeFor(polygon: Point[], holes: Point[][] = []) {
  const shape = new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)))
  holes.forEach(hole => shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z)))))
  return shape
}
function seedOf(value: string) { let seed = 0; for (const letter of value) seed = (seed * 31 + letter.charCodeAt(0)) >>> 0; return seed }
function schematicHeight(building: Building) {
  if (building.levels) return clamp(building.levels * 3.2, 3.2, 22)
  const area = Math.abs(polygonArea(building.polygon)), seed = seedOf(building.id)
  return building.holes?.length ? 9.6 : (area > 360 ? 7 : area > 110 ? 5.8 : 4.2) + seed % 3 * 0.45
}
class SafeAerialCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private from: THREE.Vector3, private to: THREE.Vector3, private ceiling: number) { super() }
  getPoint(t: number, target = new THREE.Vector3()) {
    const ease = (value: number) => value * value * (3 - 2 * value)
    if (t < 0.27) return target.copy(this.from).lerp(new THREE.Vector3(this.from.x, this.ceiling, this.from.z), ease(t / 0.27))
    if (t < 0.73) { const value = ease((t - 0.27) / 0.46); return target.lerpVectors(new THREE.Vector3(this.from.x, this.ceiling, this.from.z), new THREE.Vector3(this.to.x, this.ceiling, this.to.z), value) }
    return target.copy(new THREE.Vector3(this.to.x, this.ceiling, this.to.z)).lerp(this.to, ease((t - 0.73) / 0.27))
  }
}

function CityFallback({ geometry, places, selectedId, onSelect, visibleIds }: CitySceneProps) {
  if (!geometry) return null
  const { minX, maxX, minZ, maxZ } = geometry.bounds
  const project = ([x, z]: Point): Point => [30 + (x - minX) / (maxX - minX) * 740, 20 + (z - minZ) / (maxZ - minZ) * 540]
  const path = (polygon: Point[]) => polygon.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(' ')}`).join(' ') + 'Z'
  return <div className="city-fallback"><svg viewBox="0 0 800 600" aria-label="Plano de Xilitla con lugares seleccionables">
    <rect width="800" height="600" fill="#dce0cd" />
    {geometry.paths.map(line => <polyline key={line.id} points={line.points.map(project).map(p => p.join(',')).join(' ')} fill="none" stroke={line.kind === 'road' ? '#adb3a0' : '#c5bc9f'} strokeWidth={line.kind === 'road' ? 5 : 2} />)}
    {geometry.squares.map(square => <path key={square.id} d={path(square.polygon)} fill="#e9dcc1" stroke="#c6b394" />)}
    {geometry.buildings.map(building => <path key={building.id} d={path(building.polygon) + (building.holes || []).map(path).join('')} fillRule="evenodd" fill="#b98464" stroke="#f7ecda" strokeWidth="0.6" />)}
    {places.filter(place => !visibleIds || visibleIds.includes(place.id)).map((place, index) => { const [x, y] = project(guidePosition(place)); const dx = index % 2 ? 13 : -13, dy = index % 3 * 17; return <g key={place.id} transform={`translate(${x + dx},${y - dy})`} role="button" tabIndex={0} aria-label={`Explorar ${place.name}`} onClick={() => onSelect(place.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(place.id) } }}><rect x="-65" y="-28" width="130" height="45" fill="transparent" pointerEvents="all" /><circle r={selectedId === place.id ? 8 : 5} fill={selectedId === place.id ? '#d6ec9c' : '#275e48'} stroke="#fffdf1" strokeWidth="2" /><text textAnchor="middle" y="-13" fill="#244937" stroke="#f7f4e9" strokeWidth="3" paintOrder="stroke" fontSize="9" fontWeight="600" pointerEvents="none">{place.name}</text></g> })}
  </svg><span className="city-fallback-note">Vista 2D ligera · El renderizado 3D no está disponible en este dispositivo.</span></div>
}

export default function CityScene(props: CitySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const leaderRefs = useRef(new Map<string, SVGLineElement>())
  const latest = useRef(props)
  const invalidateRef = useRef<() => void>(() => {})
  const [fallback, setFallback] = useState(false)
  const [ready, setReady] = useState(false)
  const placeSignature = props.places.map(place => `${place.id}:${place.lat}:${place.lon}`).join('|')
  latest.current = props

  useEffect(() => {
    const mount = mountRef.current, geometry = props.geometry
    if (!mount || !geometry) return
    let disposed = false, renderingAvailable = true, frame = 0, requestDraw = () => {}
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }) }
    catch { setFallback(true); latest.current.onAvailabilityChange?.(false); return }
    setFallback(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.domElement.setAttribute('aria-label', 'Maqueta 3D de Xilitla. Arrastra para girar; en vista a pie utiliza WASD o las flechas.')
    renderer.domElement.tabIndex = 0
    mount.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#dfe4d8')
    scene.fog = new THREE.FogExp2('#dfe4d8', 0.0017)
    const camera = new THREE.PerspectiveCamera(44, 1, 0.12, 1800)
    camera.position.set(78, 88, 108)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(18, 1, 3)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    controls.enableDamping = !reduced.matches
    controls.dampingFactor = 0.08
    controls.minDistance = 35
    controls.maxDistance = 650
    controls.maxPolarAngle = Math.PI * 0.43
    controls.minPolarAngle = 0.15
    controls.enablePan = true
    controls.panSpeed = 0.65
    controls.rotateSpeed = 0.6
    const hemisphere = new THREE.HemisphereLight('#f6f5e7', '#738764', 1.25)
    scene.add(hemisphere)
    const sunlight = new THREE.DirectionalLight('#fff0d3', 3.2)
    sunlight.position.set(-120, 210, 95)
    sunlight.castShadow = true
    sunlight.shadow.mapSize.set(1024, 1024)
    sunlight.shadow.camera.left = -180; sunlight.shadow.camera.right = 180
    sunlight.shadow.camera.top = 180; sunlight.shadow.camera.bottom = -180
    sunlight.shadow.camera.near = 1; sunlight.shadow.camera.far = 700
    sunlight.shadow.normalBias = 0.18
    sunlight.shadow.bias = -0.0001
    scene.add(sunlight, sunlight.target)
    scene.add(new THREE.DirectionalLight('#d6e5e2', 0.55))
    const textures = new Set<THREE.Texture>()
    const makeTexture = (paint: (context: CanvasRenderingContext2D, size: number) => void, size = 128) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      paint(canvas.getContext('2d')!, size)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      textures.add(texture)
      return texture
    }
    const stucco = makeTexture((context, size) => {
      context.fillStyle = '#f1eee1'; context.fillRect(0, 0, size, size)
      for (let i = 0; i < 1100; i++) { context.fillStyle = i % 2 ? '#b2a58d10' : '#fffaf615'; context.fillRect((i * 73) % size, (i * 37) % size, 1 + i % 2, 1) }
    })
    stucco.repeat.set(0.13, 0.13)
    const roofTexture = makeTexture((context, size) => {
      context.fillStyle = '#b97953'; context.fillRect(0, 0, size, size)
      for (let y = 0; y < size; y += 16) for (let x = 0; x < size; x += 10) {
        context.fillStyle = (x + y) % 3 ? '#cf9469' : '#9a6245'; context.fillRect(x + 1, y + 1, 8, 14)
        context.fillStyle = '#e2b58a55'; context.fillRect(x + 2, y + 2, 2, 12)
      }
    })
    roofTexture.repeat.set(0.14, 0.14)
    const pavingTexture = makeTexture((context, size) => {
      context.fillStyle = '#e8ddc6'; context.fillRect(0, 0, size, size)
      context.strokeStyle = '#b9aa8a55'; context.lineWidth = 1
      for (let i = 0; i <= size; i += 32) { context.beginPath(); context.moveTo(i, 0); context.lineTo(i, size); context.moveTo(0, i); context.lineTo(size, i); context.stroke() }
    })
    pavingTexture.repeat.set(0.15, 0.15)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: '#aebba1', roughness: 1 }))
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; scene.add(floor)
    const pathGroup = new THREE.Group(); scene.add(pathGroup)
    for (const kind of ['road', 'path', 'steps'] as const) {
      const points: number[] = [], indices: number[] = []
      const width = kind === 'road' ? 6 : kind === 'steps' ? 2.5 : 2
      geometry.paths.filter(path => path.kind === kind).forEach(path => path.points.forEach((p, i) => {
        if (!i) return
        const q = path.points[i - 1], dx = p[0] - q[0], dz = p[1] - q[1], length = Math.hypot(dx, dz)
        if (length < 0.01) return
        const nx = dz / length * width / 2, nz = -dx / length * width / 2, index = points.length / 3
        points.push(q[0] + nx, 0.012, q[1] + nz, q[0] - nx, 0.012, q[1] - nz, p[0] + nx, 0.012, p[1] + nz, p[0] - nx, 0.012, p[1] - nz)
        indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3)
      }))
      const roadGeometry = new THREE.BufferGeometry(); roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); roadGeometry.setIndex(indices); roadGeometry.computeVertexNormals()
      const road = new THREE.Mesh(roadGeometry, new THREE.MeshStandardMaterial({ color: kind === 'road' ? '#7d8d83' : kind === 'steps' ? '#b4a88a' : '#c9b991', roughness: 1, side: THREE.DoubleSide }))
      road.receiveShadow = true; pathGroup.add(road)
      if (kind === 'steps') {
        const stepLines: THREE.Vector3[] = []
        geometry.paths.filter(path => path.kind === kind).forEach(path => path.points.forEach((p, i) => {
          if (!i) return
          const q = path.points[i - 1], length = distance(p, q), dx = (p[0] - q[0]) / length, dz = (p[1] - q[1]) / length
          for (let d = 0; d < length; d += 1) stepLines.push(new THREE.Vector3(q[0] + dx * d + dz, 0.024, q[1] + dz * d - dx), new THREE.Vector3(q[0] + dx * d - dz, 0.024, q[1] + dz * d + dx))
        }))
        pathGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stepLines), new THREE.LineBasicMaterial({ color: '#a9997b' })))
      }
    }
    geometry.squares.forEach(square => {
      const squareGeometry = new THREE.ShapeGeometry(shapeFor(square.polygon)); squareGeometry.rotateX(-Math.PI / 2)
      const squareMesh = new THREE.Mesh(squareGeometry, new THREE.MeshStandardMaterial({ color: '#f1e7d2', map: pavingTexture, roughness: 0.95, side: THREE.DoubleSide }))
      squareMesh.position.y = 0.035; squareMesh.receiveShadow = true; scene.add(squareMesh)
      const edge = square.polygon.map(([x, z]) => new THREE.Vector3(x, 0.07, z))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineBasicMaterial({ color: '#f6efde' })))
    })
    const places = props.places.filter(place => place.sceneId === 'xilitla-centro')
    const placePoints = new Map(places.map(place => [place.id, guidePosition(place)]))
    const buildingRecords: { building: Building; height: number; mesh: THREE.Mesh; wall: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; placeIds: string[] }[] = []
    const pickables: THREE.Object3D[] = []
    const windowInstances: { x: number; y: number; z: number; yaw: number }[] = []
    const trimInstances: { x: number; y: number; z: number; yaw: number; length: number }[] = []
    geometry.buildings.forEach(building => {
      const height = schematicHeight(building), seed = seedOf(building.id)
      const palette = ['#efe1c5', '#f3e9d5', '#dcc9a9', '#ead8b7', '#d3d5bd']
      const wall = new THREE.MeshStandardMaterial({ color: building.holes?.length ? '#dfcfb0' : palette[seed % palette.length], map: stucco, roughness: 0.96 })
      const roof = new THREE.MeshStandardMaterial({ color: building.holes?.length ? '#b99974' : '#d9bb99', map: roofTexture, roughness: 0.95 })
      const buildingGeometry = new THREE.ExtrudeGeometry(shapeFor(building.polygon, building.holes), { depth: height, bevelEnabled: false, steps: 1 })
      buildingGeometry.rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(buildingGeometry, [roof, wall]); mesh.castShadow = true; mesh.receiveShadow = true
      const placeIds = places.filter(place => insidePolygon(guidePosition(place), building.polygon)).map(place => place.id)
      mesh.userData.placeIds = placeIds; mesh.userData.solid = true
      pickables.push(mesh); scene.add(mesh)
      buildingRecords.push({ building, height, mesh, wall, roof, placeIds })
      for (const [ringIndex, ring] of [building.polygon, ...(building.holes || [])].entries()) {
        const orientation = Math.sign(polygonArea(ring)) * (ringIndex ? -1 : 1)
        ring.forEach((p, index) => {
          const q = ring[(index + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], length = Math.hypot(dx, dz)
          if (length < 0.1) return
          const nx = dz / length * orientation, nz = -dx / length * orientation
          trimInstances.push({ x: (p[0] + q[0]) / 2 + nx * 0.1, y: height - 0.12, z: (p[1] + q[1]) / 2 + nz * 0.1, yaw: Math.atan2(-dz, dx), length })
          const count = Math.max(0, Math.floor((length - 2) / 3.3)), floors = Math.max(1, Math.floor((height - 0.7) / 3))
          for (let floorIndex = 0; floorIndex < floors; floorIndex++) for (let number = 0; number < count; number++) {
            const t = (number + 1) / (count + 1)
            windowInstances.push({ x: p[0] + dx * t + nx * 0.065, y: 1.8 + floorIndex * 3, z: p[1] + dz * t + nz * 0.065, yaw: Math.atan2(nx, nz) })
          }
        })
      }
    })
    const dummy = new THREE.Object3D()
    const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 1.25, 0.09), new THREE.MeshStandardMaterial({ color: '#405c55', roughness: 0.47, metalness: 0.12 }), windowInstances.length)
    windowInstances.forEach((p, index) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); windows.setMatrixAt(index, dummy.matrix) })
    scene.add(windows)
    const trims = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.2, 0.34), new THREE.MeshStandardMaterial({ color: '#f2e9d6', roughness: 0.9 }), trimInstances.length)
    trimInstances.forEach((p, index) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.set(p.length, 1, 1); dummy.updateMatrix(); trims.setMatrixAt(index, dummy.matrix) })
    scene.add(trims)

    // Plaza furniture is schematic scale context, never claimed as surveyed.
    const treePoints: Point[] = [...geometry.trees]
    const furnishingPoints: { point: Point; angle: number }[] = []
    geometry.squares.forEach(square => {
      const center = polygonCenter(square.polygon)
      square.polygon.forEach((p, index) => {
        const q = square.polygon[(index + 1) % square.polygon.length], length = distance(p, q)
        if (length < 3) return
        const count = Math.floor(length / 13)
        for (let i = 0; i < count; i++) {
          const t = (i + 0.5) / count, edge: Point = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], inward = distance(edge, center)
          const point: Point = [edge[0] + (center[0] - edge[0]) / inward * 4, edge[1] + (center[1] - edge[1]) / inward * 4]
          if (!geometry.buildings.some(b => insideBuilding(point, b, 1))) treePoints.push(point)
          if (i % 2 === 0) furnishingPoints.push({ point: [edge[0] + (center[0] - edge[0]) / inward * 7, edge[1] + (center[1] - edge[1]) / inward * 7], angle: Math.atan2(q[0] - p[0], q[1] - p[1]) })
        }
      })
    })
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.18, 2.7, 6), new THREE.MeshStandardMaterial({ color: '#75664a', roughness: 1 }), treePoints.length)
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8, 2), new THREE.MeshStandardMaterial({ color: '#64865a', roughness: 1, flatShading: true }), treePoints.length * 2)
    treePoints.forEach(([x, z], index) => {
      dummy.position.set(x, 1.35, z); dummy.rotation.set(0, index * 0.7, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix)
      for (let part = 0; part < 2; part++) { dummy.position.set(x + (part ? 0.8 : -0.35), 3.6 + part * 0.5, z + (part ? -0.45 : 0.2)); dummy.scale.set(1.15, 0.85 + part * 0.15, 1); dummy.updateMatrix(); crowns.setMatrixAt(index * 2 + part, dummy.matrix); crowns.setColorAt(index * 2 + part, new THREE.Color(part ? '#789b63' : '#547b55')) }
    })
    trunks.castShadow = true; crowns.castShadow = true; crowns.receiveShadow = true; scene.add(trunks, crowns)
    const benches = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.17, 0.55), new THREE.MeshStandardMaterial({ color: '#886a45', roughness: 0.9 }), furnishingPoints.length)
    const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.55, 0.13), new THREE.MeshStandardMaterial({ color: '#886a45', roughness: 0.9 }), furnishingPoints.length)
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.08, 4.2, 6), new THREE.MeshStandardMaterial({ color: '#46564b', roughness: 0.7 }), furnishingPoints.length)
    const lanterns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.48, 0.34), new THREE.MeshStandardMaterial({ color: '#ece0b2', emissive: '#dfca91', emissiveIntensity: 0.1, roughness: 0.5 }), furnishingPoints.length)
    furnishingPoints.forEach(({ point: [x, z], angle }, index) => {
      dummy.rotation.set(0, angle, 0); dummy.scale.set(1, 1, 1); dummy.position.set(x, 0.52, z); dummy.updateMatrix(); benches.setMatrixAt(index, dummy.matrix)
      dummy.position.y = 0.9; dummy.updateMatrix(); backs.setMatrixAt(index, dummy.matrix)
      dummy.position.set(x + 2, 2.1, z + 2); dummy.updateMatrix(); poles.setMatrixAt(index, dummy.matrix)
      dummy.position.y = 4.25; dummy.updateMatrix(); lanterns.setMatrixAt(index, dummy.matrix)
    })
    benches.castShadow = true; backs.castShadow = true; poles.castShadow = true; scene.add(benches, backs, poles, lanterns)

    const plazaCenter = geometry.squares[0] ? polygonCenter(geometry.squares[0].polygon) : [0, 0] as Point
    const kiosk = new THREE.Group(); kiosk.position.set(plazaCenter[0], 0, plazaCenter[1]); scene.add(kiosk)
    const stone = new THREE.MeshStandardMaterial({ color: '#d5c3a2', roughness: 0.98 })
    const kioskPaint = new THREE.MeshStandardMaterial({ color: '#eee2c4', roughness: 0.9 })
    const kioskRoof = new THREE.MeshStandardMaterial({ color: '#647d60', roughness: 0.95, metalness: 0 })
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(4.25, 4.5, 0.65, 8), stone); pedestal.position.y = 0.325; pedestal.rotation.y = Math.PI / 8; pedestal.castShadow = true; pedestal.receiveShadow = true; kiosk.add(pedestal)
    const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 3.35, 8), kioskPaint, 8)
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 0.09), kioskPaint, 16)
    const railingPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 5), kioskPaint, 24)
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + Math.PI / 8, next = (i + 1) / 8 * Math.PI * 2 + Math.PI / 8
      const a: Point = [Math.cos(angle) * 3.65, Math.sin(angle) * 3.65], b: Point = [Math.cos(next) * 3.65, Math.sin(next) * 3.65], length = distance(a, b)
      dummy.position.set(a[0], 2.325, a[1]); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); columns.setMatrixAt(i, dummy.matrix)
      for (let level = 0; level < 2; level++) { dummy.position.set((a[0] + b[0]) / 2, 1.1 + level * 0.5, (a[1] + b[1]) / 2); dummy.rotation.set(0, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0); dummy.scale.set(length, 1, 1); dummy.updateMatrix(); rails.setMatrixAt(i * 2 + level, dummy.matrix) }
      for (let part = 0; part < 3; part++) { const t = (part + 1) / 4; dummy.position.set(a[0] + (b[0] - a[0]) * t, 1.18, a[1] + (b[1] - a[1]) * t); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); railingPosts.setMatrixAt(i * 3 + part, dummy.matrix) }
    }
    columns.castShadow = true; rails.castShadow = true; kiosk.add(columns, rails, railingPosts)
    const roofBase = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.8, 0.22, 8), kioskPaint); roofBase.rotation.y = Math.PI / 8; roofBase.position.y = 4.1; roofBase.castShadow = true; kiosk.add(roofBase)
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.9, 1.75, 8), kioskRoof); canopy.rotation.y = Math.PI / 8; canopy.position.y = 4.98; canopy.castShadow = true; kiosk.add(canopy)
    const roofVent = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.65, 0.55, 8), kioskPaint); roofVent.position.y = 5.75; kiosk.add(roofVent)
    const roofCrown = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.65, 8), kioskRoof); roofCrown.rotation.y = Math.PI / 8; roofCrown.position.y = 6.23; roofCrown.castShadow = true; kiosk.add(roofCrown)
    for (let step = 0; step < 3; step++) { const stair = new THREE.Mesh(new THREE.BoxGeometry(2.3, (step + 1) * 0.2, 0.8), stone); stair.position.set(0, (step + 1) * 0.1, 5.7 - step * 0.65); stair.castShadow = true; stair.receiveShadow = true; kiosk.add(stair) }

    const pinPoints = new Map<string, THREE.Vector3>(), proxies = new Map<string, THREE.Mesh>()
    const markerMaterial = new THREE.MeshBasicMaterial({ color: '#356548', toneMapped: false })
    const markerGeometry = new THREE.CylinderGeometry(0, 1.5, 2.4, 6)
    const pinStems = new THREE.Group(); scene.add(pinStems)
    places.forEach(place => {
      const [x, z] = placePoints.get(place.id)!, building = buildingRecords.find(record => insidePolygon([x, z], record.building.polygon)), y = distance([x, z], plazaCenter) < 6.5 ? 9 : (building?.height || 0) + 4.3
      pinPoints.set(place.id, new THREE.Vector3(x, y, z))
      const marker = new THREE.Mesh(markerGeometry, markerMaterial); marker.rotation.x = Math.PI; marker.position.set(x, y - 1.2, z); marker.userData.placeId = place.id; pinStems.add(marker)
      const proxy = new THREE.Mesh(new THREE.SphereGeometry(3.1, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
      proxy.position.set(x, y, z); proxy.userData.placeId = place.id; proxy.userData.proxy = true
      proxies.set(place.id, proxy); pickables.push(proxy); scene.add(proxy)
    })
    const beacon = new THREE.Group()
    const beaconDisk = new THREE.Mesh(new THREE.RingGeometry(1.6, 2, 48), new THREE.MeshBasicMaterial({ color: '#e3b15a', side: THREE.DoubleSide, transparent: true, opacity: 0.95, toneMapped: false }))
    beaconDisk.rotation.x = -Math.PI / 2; beacon.add(beaconDisk)
    const beaconHalo = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.1, 48), new THREE.MeshBasicMaterial({ color: '#d9ac60', side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }))
    beaconHalo.rotation.x = -Math.PI / 2; beacon.add(beaconHalo); scene.add(beacon)

    const inBounds = ([x, z]: Point) => x > geometry.bounds.minX + 2 && x < geometry.bounds.maxX - 2 && z > geometry.bounds.minZ + 2 && z < geometry.bounds.maxZ - 2
    const blocked = (point: Point, margin = 0.45) => !inBounds(point) || distance(point, plazaCenter) < 4.6 + margin || geometry.buildings.some(building => insideBuilding(point, building, margin))
    const nearestPath = (point: Point, onlyRoad = false) => {
      let result: Point = point, best = Infinity
      geometry.paths.filter(path => !onlyRoad || path.kind === 'road').forEach(path => path.points.forEach((p, index) => { if (!index) return; const q = nearestSegment(point, path.points[index - 1], p), d = distance(point, q); if (d < best) { best = d; result = q } }))
      return result
    }
    const viewpointFor = (place: GuidePlace | undefined, view: GuideViewpoint) => {
      const point: Point = place ? placePoints.get(place.id) || [0, 0] : [0, 0]
      const square = geometry.squares[0], plaza = square ? polygonCenter(square.polygon) : [0, 0] as Point
      let preferred: Point
      if (view === 'plaza') preferred = [plaza[0] - 11, plaza[1] + 9]
      else if (view === 'street') { const street = nearestPath(point, true); preferred = [street[0] + 1.2, street[1] - 1.2] }
      else { const path = nearestPath(point); preferred = distance(point, path) > 2 ? path : [point[0] - 6, point[1] + 7] }
      let eyePoint: Point | null = null, best = Infinity
      for (const radius of [0, 2.8, 5, 9, 15, 24, 38, 60]) for (let step = 0; step < 20; step++) {
        const angle = step / 20 * Math.PI * 2, candidate: Point = [preferred[0] + Math.cos(angle) * radius, preferred[1] + Math.sin(angle) * radius]
        if (!inBounds(candidate) || distance(candidate, plazaCenter) < 6.3 || geometry.buildings.some(building => insidePolygon(candidate, building.polygon) || boundaryDistance(candidate, building.polygon) < 2.4)) continue
        const score = distance(candidate, preferred) + distance(candidate, nearestPath(candidate)) * 0.25
        if (score < best) { best = score; eyePoint = candidate }
      }
      eyePoint ||= plaza
      const record = buildingRecords.find(building => building.placeIds.includes(place?.id || ''))
      const target = new THREE.Vector3(point[0], record ? Math.min(4, record.height * 0.38) : distance(point, plazaCenter) < 7 ? 2.8 : 1.5, point[1])
      if (Math.hypot(target.x - eyePoint[0], target.z - eyePoint[1]) < 2) target.set(36, 3, 4)
      return { eye: new THREE.Vector3(eyePoint[0], EYE_HEIGHT, eyePoint[1]), target }
    }

    let width = 1, height = 1, mode: GuideCameraState['mode'] = 'orbit', yaw = 0, pitch = 0
    let lastTime = 0, lastNotify = -Infinity, lastState = '', hoveredId: string | null = null, dragging = false
    let lastCommand = '', lastLighting = '', previousZoom = props.zoom, lastShadowX = Infinity, lastShadowZ = Infinity
    let previewAt = Infinity, pointerStart: { x: number; y: number; lastX: number; lastY: number } | null = null
    const keys = new Set<string>()
    const desiredLook = new THREE.Vector3(), direction = new THREE.Vector3(), projected = new THREE.Vector3()
    let lastOrbit = { position: camera.position.clone(), target: controls.target.clone() }
    let flight: { start: number; duration: number; curve: THREE.Curve<THREE.Vector3>; fromLook: THREE.Vector3; toLook: THREE.Vector3; fromFov: number; toFov: number; destination: 'orbit' | 'pov' } | null = null
    const previewTarget = new THREE.WebGLRenderTarget(256, 144)
    previewTarget.texture.colorSpace = THREE.SRGBColorSpace
    const previewPixels = new Uint8Array(256 * 144 * 4), previewCanvas = document.createElement('canvas')
    previewCanvas.width = 256; previewCanvas.height = 144
    const previewContext = previewCanvas.getContext('2d')!
    const schedulePreview = (delay = 0) => { previewAt = performance.now() + delay; requestDraw() }
    const capturePreview = () => {
      const snapshot = camera.clone(); snapshot.aspect = 256 / 144; snapshot.updateProjectionMatrix(); snapshot.updateMatrixWorld()
      if (mode === 'orbit') { const p = latest.current, viewpoint = viewpointFor(places.find(place => place.id === p.selectedId), p.viewpoint); snapshot.position.copy(viewpoint.eye); snapshot.lookAt(viewpoint.target); snapshot.fov = 70; snapshot.updateProjectionMatrix(); snapshot.updateMatrixWorld() }
      const previousTarget = renderer.getRenderTarget()
      renderer.setRenderTarget(previewTarget); renderer.render(scene, snapshot)
      renderer.readRenderTargetPixels(previewTarget, 0, 0, 256, 144, previewPixels)
      renderer.setRenderTarget(previousTarget)
      const data = previewContext.createImageData(256, 144)
      for (let row = 0; row < 144; row++) data.data.set(previewPixels.subarray((143 - row) * 256 * 4, (144 - row) * 256 * 4), row * 256 * 4)
      previewContext.putImageData(data, 0, 0)
      latest.current.onPreview(previewCanvas.toDataURL('image/jpeg', 0.8))
    }
    const startFlight = (end: THREE.Vector3, target: THREE.Vector3, destination: 'orbit' | 'pov') => {
      previewAt = Infinity
      camera.getWorldDirection(direction); const fromLook = camera.position.clone().addScaledVector(direction, 45)
      const maxRoof = Math.max(12, ...buildingRecords.map(building => building.height))
      let clearance = Math.max(maxRoof + 28, camera.position.y + 12, end.y + 25)
      let curve: THREE.Curve<THREE.Vector3>, collision = false
      for (let attempt = 0; ; attempt++) {
        curve = new THREE.CubicBezierCurve3(camera.position.clone(), new THREE.Vector3(camera.position.x, clearance, camera.position.z), new THREE.Vector3(end.x, clearance, end.z), end)
        collision = false
        const samples = Math.min(1600, Math.max(100, Math.ceil(curve.getLength() / 0.65)))
        for (let i = 1; i < samples; i++) { const point = curve.getPoint(i / samples); if ((point.y < 7.5 && Math.hypot(point.x - plazaCenter[0], point.z - plazaCenter[1]) < 5.2) || buildingRecords.some(building => point.y < building.height + 1.5 && insideBuilding([point.x, point.z], building.building, 0.8))) { collision = true; break } }
        if (!collision || attempt >= 8) break
        clearance += 36
      }
      if (collision) curve = new SafeAerialCurve(camera.position.clone(), end, clearance)
      flight = { start: performance.now(), duration: reduced.matches ? 0 : 1800, curve, fromLook, toLook: target.clone(), fromFov: camera.fov, toFov: destination === 'pov' ? 70 : 44, destination }
      mode = 'flying'; controls.enabled = false; hoveredId = null; requestDraw()
    }
    const resize = () => {
      const oldFit = Math.max(1, 0.85 / camera.aspect)
      width = mount.clientWidth; height = mount.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height); camera.aspect = width / height
      const fitRatio = Math.max(1, 0.85 / camera.aspect) / oldFit
      if (mode === 'orbit') camera.position.sub(controls.target).multiplyScalar(fitRatio).add(controls.target)
      else lastOrbit.position.sub(lastOrbit.target).multiplyScalar(fitRatio).add(lastOrbit.target)
      camera.updateProjectionMatrix(); requestDraw()
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(mount); resize()
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
    const pick = (event: PointerEvent) => {
      const rectangle = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rectangle.left) / rectangle.width * 2 - 1, -(event.clientY - rectangle.top) / rectangle.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const visible = latest.current.visibleIds
      for (const hit of raycaster.intersectObjects(pickables, false)) {
        const direct = hit.object.userData.placeId as string | undefined
        if (direct) { if (!visible || visible.includes(direct)) return direct; continue }
        if (hit.object.userData.solid) return (hit.object.userData.placeIds as string[]).find(id => !visible || visible.includes(id)) || null
      }
      return null
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return
      pointerStart = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY }
      if (mode === 'pov') { renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.focus({ preventScroll: true }) }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (pointerStart && mode === 'pov') {
        yaw -= (event.clientX - pointerStart.lastX) * 0.0042; pitch = clamp(pitch - (event.clientY - pointerStart.lastY) * 0.0032, -Math.PI / 3, Math.PI / 3)
        pointerStart.lastX = event.clientX; pointerStart.lastY = event.clientY; requestDraw()
      } else if (!pointerStart && !dragging && mode === 'orbit' && event.pointerType !== 'touch') {
        const hit = pick(event)
        if (hit !== hoveredId) { hoveredId = hit; renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'; requestDraw() }
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 5 && mode !== 'flying') { const hit = pick(event); if (hit) latest.current.onSelect(hit) }
      if (mode === 'pov') schedulePreview(120)
      pointerStart = null
    }
    const onPointerCancel = () => { pointerStart = null; dragging = false }
    const onPointerLeave = () => { if (!pointerStart) { hoveredId = null; requestDraw() } }
    const onWheel = (event: WheelEvent) => { if (mode === 'pov') { event.preventDefault(); camera.fov = clamp(camera.fov + event.deltaY * 0.035, 55, 85); camera.updateProjectionMatrix(); schedulePreview(220) } }
    const isForm = (target: EventTarget | null) => target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable)
    const onKeyDown = (event: KeyboardEvent) => {
      if (mode !== 'pov' || isForm(event.target) || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog:modal') || !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
      event.preventDefault(); keys.add(event.code); requestDraw()
    }
    const onKeyUp = (event: KeyboardEvent) => { if (keys.delete(event.code) && mode === 'pov') schedulePreview(150) }
    const clearInput = () => { keys.clear(); pointerStart = null; dragging = false }
    const onOrbitStart = () => { dragging = true; if (mode === 'orbit') flight = null }
    const onOrbitEnd = () => { dragging = false }
    const onVisibility = () => { lastTime = 0; clearInput(); if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else requestDraw() }
    const onReducedMotion = () => { controls.enableDamping = !reduced.matches; if (flight && reduced.matches) flight.duration = 0; requestDraw() }
    const onContextLost = (event: Event) => { event.preventDefault(); renderingAvailable = false; cancelAnimationFrame(frame); frame = 0; if (!disposed) { setFallback(true); latest.current.onAvailabilityChange?.(false) } }
    const engineStartedAt = performance.now()

    const animate = (now: number) => {
      frame = 0
      if (disposed || !renderingAvailable || document.hidden || renderer.getContext().isContextLost()) return
      const p = latest.current, dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 1 / 60
      lastTime = now
      const selected = places.find(place => place.id === p.selectedId)
      const command = `${p.perspective}|${p.selectedId}|${p.viewpoint}|${p.focusVersion}`
      if (command !== lastCommand) {
        const initial = !lastCommand; lastCommand = command; keys.clear()
        if (p.perspective === 'pov') {
          if (mode === 'orbit' || initial) lastOrbit = { position: camera.position.clone(), target: controls.target.clone() }
          const viewpoint = viewpointFor(selected, p.viewpoint); startFlight(viewpoint.eye, viewpoint.target, 'pov')
        } else if (!initial && now - engineStartedAt > 250) {
          const point = selected ? placePoints.get(selected.id) || [0, 0] : [0, 0]
          const returning = mode === 'pov' || flight?.destination === 'pov'
          const target = returning ? lastOrbit.target : new THREE.Vector3(point[0], 1, point[1])
          const position = returning ? lastOrbit.position : target.clone().add(new THREE.Vector3(78, 88, 108).multiplyScalar(Math.max(1, 0.85 / camera.aspect)))
          startFlight(position, target, 'orbit')
        }
        if (p.perspective === 'overview' && (initial || now - engineStartedAt <= 250)) schedulePreview(40)
      }
      if (p.timeOfDay !== lastLighting) {
        lastLighting = p.timeOfDay; const sunset = p.timeOfDay === 'sunset'
        sunlight.color.set(sunset ? '#ffc58c' : '#fff0d3'); sunlight.position.set(sunset ? -230 : -120, sunset ? 105 : 210, sunset ? -100 : 95); sunlight.intensity = sunset ? 3 : 3.2
        hemisphere.color.set(sunset ? '#f4debe' : '#f6f5e7'); hemisphere.groundColor.set(sunset ? '#777d61' : '#738764'); hemisphere.intensity = sunset ? 1.05 : 1.25
        const sky = sunset ? '#dfcdb5' : '#dfe4d8'; (scene.background as THREE.Color).set(sky); (scene.fog as THREE.FogExp2).color.set(sky)
        renderer.shadowMap.needsUpdate = true; if (mode === 'pov') schedulePreview(120)
      }
      pathGroup.visible = p.showPaths
      if (p.zoom !== previousZoom) {
        const ratio = clamp(previousZoom || 1, 0.2, 5) / clamp(p.zoom || 1, 0.2, 5); previousZoom = p.zoom
        if (mode === 'orbit') camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target)
        else if (mode === 'pov') { camera.fov = clamp(70 / clamp(p.zoom || 1, 0.5, 2), 55, 85); camera.updateProjectionMatrix(); schedulePreview(180) }
      }
      if (flight) {
        const t = flight.duration ? clamp((now - flight.start) / flight.duration, 0, 1) : 1, eased = t * t * (3 - 2 * t)
        flight.curve.getPoint(eased, camera.position); desiredLook.copy(flight.fromLook).lerp(flight.toLook, eased); camera.lookAt(desiredLook)
        camera.fov = THREE.MathUtils.lerp(flight.fromFov, flight.toFov, eased); camera.updateProjectionMatrix()
        if (t >= 1) {
          mode = flight.destination; controls.target.copy(flight.toLook)
          if (mode === 'pov') { camera.getWorldDirection(direction); yaw = Math.atan2(direction.x, -direction.z); pitch = Math.asin(clamp(direction.y, -1, 1)); camera.position.y = EYE_HEIGHT; schedulePreview() }
          else schedulePreview(40)
          flight = null
        }
      }
      let walking = false
      if (mode === 'pov') {
        const modalOpen = Boolean(document.querySelector('dialog:modal'))
        if (modalOpen) keys.clear()
        const forward = modalOpen ? 0 : clamp(p.walkInput.forward + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')), -1, 1)
        const right = modalOpen ? 0 : clamp(p.walkInput.right + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), -1, 1)
        walking = Boolean(forward || right)
        if (walking) {
          const normalizer = Math.max(1, Math.hypot(forward, right)), step = 5 * dt / normalizer
          const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * right) * step, dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * right) * step
          const xMove: Point = [camera.position.x + dx, camera.position.z]; if (!blocked(xMove)) camera.position.x = xMove[0]
          const zMove: Point = [camera.position.x, camera.position.z + dz]; if (!blocked(zMove)) camera.position.z = zMove[1]
        }
        camera.position.y = EYE_HEIGHT
        direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
        desiredLook.copy(camera.position).addScaledVector(direction, 45); camera.lookAt(desiredLook)
      }
      controls.enabled = mode === 'orbit'
      if (mode === 'orbit') { controls.update(); desiredLook.copy(controls.target) }
      const shadowPoint: Point = mode === 'orbit' ? [controls.target.x, controls.target.z] : selected ? placePoints.get(selected.id) || plazaCenter : plazaCenter
      if (Math.hypot(shadowPoint[0] - lastShadowX, shadowPoint[1] - lastShadowZ) > 60 || renderer.shadowMap.needsUpdate) {
        lastShadowX = shadowPoint[0]; lastShadowZ = shadowPoint[1]
        sunlight.target.position.set(lastShadowX, 0, lastShadowZ)
        sunlight.position.set(lastShadowX + (p.timeOfDay === 'sunset' ? -230 : -120), p.timeOfDay === 'sunset' ? 105 : 210, lastShadowZ + (p.timeOfDay === 'sunset' ? -100 : 95))
        renderer.shadowMap.needsUpdate = true
      }
      camera.updateMatrixWorld(); scene.updateMatrixWorld()
      const visible = p.visibleIds ? new Set(p.visibleIds) : null
      proxies.forEach((proxy, id) => { proxy.visible = !visible || visible.has(id) })
      pinStems.children.forEach(marker => { marker.visible = mode !== 'pov' && (!visible || visible.has(marker.userData.placeId as string)) })
      buildingRecords.forEach(record => { const active = record.placeIds.includes(p.selectedId || ''), hover = record.placeIds.includes(hoveredId || ''); record.wall.emissive.set(active ? '#4a3a13' : hover ? '#2d3d21' : '#000000'); record.wall.emissiveIntensity = active ? 0.17 : hover ? 0.1 : 0; record.roof.emissive.copy(record.wall.emissive); record.roof.emissiveIntensity = record.wall.emissiveIntensity })
      const selectedPoint = placePoints.get(p.selectedId || '')
      beacon.visible = Boolean(selectedPoint && distance(selectedPoint, plazaCenter) > 6.5 && (!visible || visible.has(p.selectedId || '')))
      if (selectedPoint) { const record = buildingRecords.find(building => insideBuilding(selectedPoint, building.building)); beacon.position.set(selectedPoint[0], (record?.height || 0) + 0.14, selectedPoint[1]) }
      const occupied: { x: number; y: number; w: number; h: number }[] = []
      const canvasBounds = mount.getBoundingClientRect()
      const overlays = (p.getLabelObstacles?.() || []).map(box => ({ left: box.left - canvasBounds.left, right: box.right - canvasBounds.left, top: box.top - canvasBounds.top, bottom: box.bottom - canvasBounds.top }))
      const markers = places.map(place => ({ place, point: pinPoints.get(place.id)!, button: markerRefs.current.get(place.id) })).filter(item => item.button).sort((a, b) => Number(b.place.id === p.selectedId) - Number(a.place.id === p.selectedId))
      markers.forEach(({ place, point, button: rawButton }) => {
        const button = rawButton!; projected.copy(point).project(camera)
        const px = (projected.x * 0.5 + 0.5) * width, py = (-projected.y * 0.5 + 0.5) * height
        const shown = (!visible || visible.has(place.id)) && projected.z > -1 && projected.z < 1 && px > 5 && px < width - 5 && py > 10 && py < height - 5
        button.hidden = !shown
        if (!shown) { leaderRefs.current.get(place.id)?.setAttribute('opacity', '0'); return }
        button.dataset.labels = String(p.showLabels)
        button.classList.toggle('is-hovered', hoveredId === place.id)
        const w = button.offsetWidth, h = button.offsetHeight
        let best = { x: clamp(px, w / 2 + 10, width - w / 2 - 10), y: clamp(py, h + 12, height - 15), penalty: Infinity }
        const candidates = [[0, 0], [0, -35], [0, 35], [-45, 0], [45, 0], [-50, -40], [50, -40], [0, -70], ...overlays.flatMap(box => [[box.left - w / 2 - 12 - px, 0], [box.right + w / 2 + 12 - px, 0], [0, box.top - 12 - py], [0, box.bottom + h + 12 - py]])]
        for (const [dx, dy] of candidates) {
          const x = clamp(px + dx, w / 2 + 10, Math.max(w / 2 + 10, width - w / 2 - 10)), y = clamp(py + dy, h + 12, height - 15)
          const collisions = occupied.filter(box => x - w / 2 < box.x + box.w / 2 + 5 && x + w / 2 > box.x - box.w / 2 - 5 && y - h < box.y + 5 && y > box.y - box.h - 5).length
          const covered = overlays.filter(box => x - w / 2 < box.right + 6 && x + w / 2 > box.left - 6 && y - h < box.bottom + 6 && y > box.top - 6).length
          const penalty = (collisions + covered) * 10000 + Math.hypot(dx, dy)
          if (penalty < best.penalty) best = { x, y, penalty }
        }
        button.style.left = `${best.x}px`; button.style.top = `${best.y}px`; button.style.zIndex = place.id === p.selectedId ? '8' : '5'
        occupied.push({ x: best.x, y: best.y, w, h })
        const leader = leaderRefs.current.get(place.id)
        if (leader) { leader.setAttribute('x1', String(px)); leader.setAttribute('y1', String(py)); leader.setAttribute('x2', String(best.x)); leader.setAttribute('y2', String(best.y - 7)); leader.setAttribute('opacity', Math.hypot(best.x - px, best.y - py) > 8 ? '0.7' : '0') }
      })
      try { renderer.render(scene, camera) }
      catch { renderingAvailable = false; cancelAnimationFrame(frame); frame = 0; setFallback(true); p.onAvailabilityChange?.(false); return }
      if (previewAt <= now && mode !== 'flying' && !walking) { previewAt = Infinity; capturePreview() }
      camera.getWorldDirection(direction)
      const nextState: GuideCameraState = { position: [camera.position.x, camera.position.y, camera.position.z], target: [desiredLook.x, desiredLook.y, desiredLook.z], yaw: Math.atan2(direction.x, -direction.z), mode, fov: camera.fov, aspect: camera.aspect }
      const stateKey = `${nextState.position.map(n => n.toFixed(2))}|${nextState.target.map(n => n.toFixed(2))}|${mode}|${camera.fov.toFixed(1)}|${camera.aspect.toFixed(4)}`
      const pendingNotify = stateKey !== lastState
      if (pendingNotify && now - lastNotify >= 100) { lastNotify = now; lastState = stateKey; p.onCameraChange(nextState) }
      if (flight || walking || previewAt < Infinity || (pendingNotify && now - lastNotify < 100)) requestDraw()
      else if (!frame) lastTime = 0
    }
    requestDraw = () => { if (!disposed && renderingAvailable && !document.hidden && !frame) frame = requestAnimationFrame(animate) }
    invalidateRef.current = requestDraw
    controls.addEventListener('change', requestDraw); controls.addEventListener('start', onOrbitStart); controls.addEventListener('end', onOrbitEnd)
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('pointercancel', onPointerCancel); renderer.domElement.addEventListener('pointerleave', onPointerLeave); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', onVisibility); reduced.addEventListener('change', onReducedMotion)
    let cleanupInspection: (() => void) | undefined
    if (import.meta.env.DEV) {
      const inspectScene = () => {
        if (disposed || !renderingAvailable || renderer.getContext().isContextLost()) {
          mount.dataset.sceneMetrics = JSON.stringify({ schemaVersion: 1, available: false })
          return
        }
        // The last normal render may be the preview. Sample the main camera explicitly.
        const previousTarget = renderer.getRenderTarget()
        try { renderer.setRenderTarget(null); renderer.render(scene, camera) }
        catch { mount.dataset.sceneMetrics = JSON.stringify({ schemaVersion: 1, available: false, reason: 'Main-camera inspection render failed' }); return }
        finally { renderer.setRenderTarget(previousTarget) }
        const uniqueTextures = new Set<THREE.Texture>(textures)
        const addTexture = (value: unknown) => {
          if (Array.isArray(value)) value.forEach(addTexture)
          else if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture === true) uniqueTextures.add(value as THREE.Texture)
        }
        addTexture(scene.background); addTexture(scene.environment); addTexture(previewTarget.texture); addTexture(previewTarget.depthTexture)
        scene.traverse(object => {
          const mesh = object as THREE.Mesh
          const materials = mesh.material ? Array.isArray(mesh.material) ? mesh.material : [mesh.material] : []
          materials.forEach(material => {
            Object.values(material).forEach(addTexture)
            if ('uniforms' in material) Object.values((material as THREE.ShaderMaterial).uniforms).forEach(uniform => addTexture(uniform.value))
          })
          const shadow = (object as THREE.DirectionalLight).shadow
          addTexture(shadow?.map?.texture); addTexture(shadow?.map?.depthTexture); addTexture(shadow?.mapPass?.texture)
        })
        let estimatedBaseRgba8Bytes = 0, texturesWithUnknownDimensions = 0
        uniqueTextures.forEach(texture => {
          const images = Array.isArray(texture.image) ? texture.image : [texture.image]
          let measured = false
          images.forEach(image => {
            const size = image as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number } | null
            const imageWidth = Number(size?.naturalWidth || size?.videoWidth || size?.width || 0), imageHeight = Number(size?.naturalHeight || size?.videoHeight || size?.height || 0)
            if (imageWidth > 0 && imageHeight > 0 && Number.isFinite(imageWidth * imageHeight)) { estimatedBaseRgba8Bytes += imageWidth * imageHeight * 4; measured = true }
          })
          if (!measured) texturesWithUnknownDimensions++
        })
        const groups = scene.children.filter((object): object is THREE.Group => object instanceof THREE.Group).map((group, index) => {
          const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
          let objects = 0, meshes = 0, instancedMeshes = 0, instances = 0
          group.traverse(object => {
            objects++
            const mesh = object as THREE.Mesh
            if (mesh.isMesh) meshes++
            if (mesh.geometry) geometries.add(mesh.geometry)
            if (Array.isArray(mesh.material)) mesh.material.forEach(material => materials.add(material)); else if (mesh.material) materials.add(mesh.material)
            if ((object as THREE.InstancedMesh).isInstancedMesh) { instancedMeshes++; instances += (object as THREE.InstancedMesh).count }
          })
          return { name: group.name || `scene-group-${index + 1}`, objects, meshes, instancedMeshes, instances, geometries: geometries.size, materials: materials.size }
        })
        mount.dataset.sceneMetrics = JSON.stringify({
          schemaVersion: 1, available: true, sampledAt: new Date().toISOString(), renderPass: 'main-camera-on-demand',
          render: { ...renderer.info.render }, memory: { ...renderer.info.memory }, programs: renderer.info.programs?.length || 0,
          viewport: { width, height, pixelRatio: renderer.getPixelRatio(), drawingBufferWidth: renderer.domElement.width, drawingBufferHeight: renderer.domElement.height },
          trackedTextures: { uniqueCount: uniqueTextures.size, estimatedBaseRgba8Bytes, texturesWithUnknownDimensions, estimate: 'width × height × 4 per base image; excludes mipmaps, format/compression differences, depth buffers and driver overhead; not measured GPU memory' },
          camera: { position: camera.position.toArray(), target: desiredLook.toArray(), fov: camera.fov, aspect: camera.aspect, mode },
          selectedId: latest.current.selectedId, groups,
        })
      }
      mount.addEventListener('huasteca:inspect', inspectScene)
      cleanupInspection = () => { mount.removeEventListener('huasteca:inspect', inspectScene); delete mount.dataset.sceneMetrics }
    }
    requestDraw(); setReady(true); latest.current.onAvailabilityChange?.(true)
    return () => {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); invalidateRef.current = () => {}; keys.clear()
      cleanupInspection?.()
      controls.removeEventListener('change', requestDraw); controls.removeEventListener('start', onOrbitStart); controls.removeEventListener('end', onOrbitEnd); controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('pointercancel', onPointerCancel); renderer.domElement.removeEventListener('pointerleave', onPointerLeave); renderer.domElement.removeEventListener('wheel', onWheel); renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onReducedMotion)
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (Array.isArray(mesh.material)) mesh.material.forEach(material => materials.add(material)); else if (mesh.material) materials.add(mesh.material) })
      geometries.forEach(resource => resource.dispose()); materials.forEach(resource => resource.dispose()); textures.forEach(texture => texture.dispose()); previewTarget.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [props.geometry, placeSignature])

  useEffect(() => { invalidateRef.current() }, [props.selectedId, props.perspective, props.viewpoint, props.focusVersion, props.timeOfDay, props.showLabels, props.showPaths, props.zoom, props.walkInput.forward, props.walkInput.right, props.visibleIds, props.labelLayoutKey])

  return <div className={`city-scene ${ready ? 'is-ready' : ''} ${props.perspective === 'pov' ? 'is-pov' : ''}`} ref={mountRef} data-testid="city-scene">
    <svg className="city-leaders" aria-hidden="true">{props.places.map(place => <line key={place.id} ref={element => { if (element) leaderRefs.current.set(place.id, element); else leaderRefs.current.delete(place.id) }} />)}</svg>
    {!fallback && props.places.filter(place => place.sceneId === 'xilitla-centro').map((place, index) => <button type="button" key={place.id} ref={element => { if (element) markerRefs.current.set(place.id, element); else markerRefs.current.delete(place.id) }} className={`city-marker ${props.selectedId === place.id ? 'is-selected' : ''}`} data-labels={props.showLabels} aria-label={`Explorar ${place.name}`} aria-pressed={props.selectedId === place.id} onClick={() => props.onSelect(place.id)} onMouseEnter={() => invalidateRef.current()} onMouseLeave={() => invalidateRef.current()} onFocus={() => invalidateRef.current()} onBlur={() => invalidateRef.current()}><span className="city-marker-name">{place.name}<small>{place.category}</small></span><span className="city-marker-dot">{String(index + 1).padStart(2, '0')}</span></button>)}
    {(!props.geometry || (!ready && !fallback)) && <div className="city-scene-loading"><span /><strong>Construyendo una nueva perspectiva</strong><small>El centro de Xilitla, lugar por lugar.</small></div>}
    {fallback && <CityFallback {...props} />}
  </div>
}
