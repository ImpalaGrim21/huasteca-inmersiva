import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { BedDouble, House, Landmark, Maximize2, Navigation2, Store, TreePine, Trees, Utensils, X } from 'lucide-react'
import type { GuideCategory, GuideGeometry, GuidePlace } from '../guide-data'
import { guidePosition } from '../guide-data'
import type { GuideCameraState } from './CityScene.types'
import './GuideMiniMap.css'

export interface GuideMiniMapProps {
  geometry: GuideGeometry | null
  places: GuidePlace[]
  selectedId: string | null
  camera: GuideCameraState | null
  onSelect: (id: string) => void
}

const categoryAppearance: Record<GuideCategory, { color: string; icon: typeof House }> = {
  Pueblos: { color: '#49604c', icon: House },
  Plazas: { color: '#5b784a', icon: TreePine },
  Hospedaje: { color: '#a97b43', icon: BedDouble },
  Cultura: { color: '#8a656b', icon: Landmark },
  Comida: { color: '#b67553', icon: Utensils },
  Servicios: { color: '#557d85', icon: Store },
  Naturaleza: { color: '#52826b', icon: Trees },
}

const compass = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
const compassNames = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']
const TAU = Math.PI * 2
const headingIndex = (yaw: number) => Math.round((((yaw % TAU) + TAU) % TAU) / (Math.PI / 4)) % 8
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function localMapBounds(geometry: GuideGeometry, places: GuidePlace[]) {
  const positions = places.map(guidePosition).filter(([x, z]) => x >= geometry.bounds.minX && x <= geometry.bounds.maxX && z >= geometry.bounds.minZ && z <= geometry.bounds.maxZ)
  if (!positions.length) return geometry.bounds
  const minX = Math.min(...positions.map(([x]) => x)), maxX = Math.max(...positions.map(([x]) => x))
  const minZ = Math.min(...positions.map(([, z]) => z)), maxZ = Math.max(...positions.map(([, z]) => z))
  const halfX = Math.max(150, (maxX - minX) / 2 + 90), halfZ = Math.max(150, (maxZ - minZ) / 2 + 90)
  const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2
  return {
    minX: Math.max(geometry.bounds.minX, centerX - halfX), maxX: Math.min(geometry.bounds.maxX, centerX + halfX),
    minZ: Math.max(geometry.bounds.minZ, centerZ - halfZ), maxZ: Math.min(geometry.bounds.maxZ, centerZ + halfZ),
  }
}

interface MapCanvasProps extends Omit<GuideMiniMapProps, 'geometry'> {
  geometry: GuideGeometry
  width: number
  height: number
  expanded: boolean
}

const MapCanvas = memo(function MapCanvas({ geometry, places, selectedId, camera, onSelect, width, height, expanded }: MapCanvasProps) {
  const clipId = `guide-mini-${useId().replace(/:/g, '')}`
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const projection = useMemo(() => {
    const bounds = localMapBounds(geometry, places)
    const { minX, maxX, minZ, maxZ } = bounds
    const top = expanded ? 24 : 29
    const bottom = expanded ? 28 : 23
    const side = expanded ? 25 : 13
    const scale = Math.min((width - side * 2) / Math.max(1, maxX - minX), (height - top - bottom) / Math.max(1, maxZ - minZ))
    const originX = (width - (maxX - minX) * scale) / 2
    const originY = top + (height - top - bottom - (maxZ - minZ) * scale) / 2
    const project = (x: number, z: number): [number, number] => [originX + (x - minX) * scale, originY + (z - minZ) * scale]
    const ring = (points: [number, number][]) => points.map(([x, z], index) => {
      const [px, py] = project(x, z)
      return `${index ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`
    }).join(' ') + ' Z'
    return { project, ring, scale, top, bottom, bounds }
  }, [geometry, places, width, height, expanded])

  const mapFeatures = useMemo(() => ({
    squares: geometry.squares.filter(square => square.polygon.length > 2).map(square => ({ id: square.id, path: projection.ring(square.polygon) })),
    buildings: geometry.buildings.filter(building => building.polygon.length > 2).map(building => ({
      id: building.id,
      path: [projection.ring(building.polygon), ...(building.holes || []).filter(hole => hole.length > 2).map(projection.ring)].join(' '),
    })),
    paths: geometry.paths.filter(path => path.points.length > 1).map(path => ({
      id: path.id,
      kind: path.kind,
      points: path.points.map(([x, z]) => projection.project(x, z).map(value => value.toFixed(2)).join(',')).join(' '),
    })),
    trees: geometry.trees.map(([x, z]) => projection.project(x, z)),
  }), [geometry, projection])

  const localPlaces = useMemo(() => {
    const occupied: [number, number][] = []
    return places.map(place => {
      const [x, z] = guidePosition(place)
      return { place, x, z, actualPoint: projection.project(x, z) }
    }).filter(({ x, z }) => x >= geometry.bounds.minX && x <= geometry.bounds.maxX && z >= geometry.bounds.minZ && z <= geometry.bounds.maxZ)
      .map(item => {
        const [px, py] = item.actualPoint
        const separation = expanded ? 25 : 18
        const candidates: [number, number][] = [[px, py]]
        for (const radius of [separation, separation * 1.8, separation * 2.6]) {
          for (let index = 0; index < 8; index++) {
            const angle = index * Math.PI / 4 - Math.PI / 2
            candidates.push([clamp(px + Math.cos(angle) * radius, 13, width - 13), clamp(py + Math.sin(angle) * radius, projection.top + 4, height - projection.bottom - 3)])
          }
        }
        const point = candidates.find(candidate => occupied.every(other => Math.hypot(candidate[0] - other[0], candidate[1] - other[1]) >= separation)) || item.actualPoint
        occupied.push(point)
        return { ...item, point, displaced: Math.hypot(point[0] - px, point[1] - py) > 2 }
      })
  }, [places, geometry, projection, expanded, width, height])

  const cameraMap = useMemo(() => {
    if (!camera) return null
    const point = projection.project(camera.position[0], camera.position[2])
    const outside = camera.position[0] < projection.bounds.minX || camera.position[0] > projection.bounds.maxX || camera.position[2] < projection.bounds.minZ || camera.position[2] > projection.bounds.maxZ
    const marker: [number, number] = [clamp(point[0], 9, width - 9), clamp(point[1], projection.top, height - projection.bottom)]
    const groundDistance = Math.hypot(camera.target[0] - camera.position[0], camera.target[2] - camera.position[2])
    const length = clamp(groundDistance * projection.scale, expanded ? 28 : 19, expanded ? 92 : 39)
    const halfAngle = clamp(camera.fov, 25, 110) * Math.PI / 360
    const first = [point[0] + Math.sin(camera.yaw - halfAngle) * length, point[1] - Math.cos(camera.yaw - halfAngle) * length]
    const last = [point[0] + Math.sin(camera.yaw + halfAngle) * length, point[1] - Math.cos(camera.yaw + halfAngle) * length]
    return { point, marker, outside, frustum: `M${point[0]},${point[1]} L${first[0]},${first[1]} L${last[0]},${last[1]} Z` }
  }, [camera, projection, width, height, expanded])

  const tooltipPlace = localPlaces.find(({ place }) => place.id === hoveredId)
  const scaleMeters = [5, 10, 20, 50, 100, 200].find(value => value * projection.scale >= 35) || 200

  return <svg className="guide-mini-map-svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Mapa local de lugares. Norte arriba. Los marcadores se pueden seleccionar." preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id={clipId}><rect width={width} height={height} rx={expanded ? 9 : 7} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}>
      <rect width={width} height={height} className="guide-mini-map-paper" />
      {mapFeatures.squares.map(square => <path key={square.id} d={square.path} className="guide-mini-square" />)}
      {mapFeatures.buildings.map(building => <path key={building.id} d={building.path} fillRule="evenodd" className="guide-mini-building" />)}
      {mapFeatures.paths.filter(path => path.kind === 'road').map(path => <polyline key={`edge-${path.id}`} points={path.points} className="guide-mini-road-edge" strokeWidth={expanded ? 7 : 4.1} />)}
      {mapFeatures.paths.map(path => <polyline key={path.id} points={path.points} className={`guide-mini-street guide-mini-street-${path.kind}`} strokeWidth={path.kind === 'road' ? expanded ? 4.8 : 2.5 : expanded ? 2 : 1.2} />)}
      {mapFeatures.trees.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={expanded ? 1.65 : 0.95} className="guide-mini-tree" />)}
      {cameraMap && <path d={cameraMap.frustum} className="guide-mini-frustum" aria-hidden="true" />}

      {localPlaces.filter(item => item.displaced).map(({ place, point, actualPoint }) => <g key={`anchor-${place.id}`} className="guide-mini-place-anchor" aria-hidden="true"><path d={`M${actualPoint[0]},${actualPoint[1]} L${point[0]},${point[1]}`} /><circle cx={actualPoint[0]} cy={actualPoint[1]} r={expanded ? 1.7 : 1.1} /></g>)}
      {[...localPlaces].sort((a, b) => Number(a.place.id === selectedId) - Number(b.place.id === selectedId)).map(({ place, point: [x, y] }) => {
        const { color, icon: Icon } = categoryAppearance[place.category]
        const selected = place.id === selectedId
        const radius = expanded ? 11 : 8.2
        const iconSize = expanded ? 14 : 10.5
        return <g key={place.id} transform={`translate(${x},${y})`} className={`guide-mini-poi ${selected ? 'guide-mini-poi-selected' : ''}`} role="button" tabIndex={0} focusable="true" aria-label={`Ver ${place.name}, ${place.category}`} aria-pressed={selected}
          onClick={() => onSelect(place.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(place.id) } }}
          onPointerEnter={() => setHoveredId(place.id)} onPointerLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(place.id)} onBlur={() => setHoveredId(null)}>
          <title>{place.name} · {place.category}</title>
          <circle r={expanded ? 19 : 13} fill="transparent" className="guide-mini-hit-area" />
          <circle r={radius + 3.4} className="guide-mini-selected-ring" />
          <circle r={radius} fill={selected ? '#254b38' : color} className="guide-mini-poi-disc" />
          <Icon x={-iconSize / 2} y={-iconSize / 2} width={iconSize} height={iconSize} strokeWidth={1.8} className="guide-mini-poi-icon" aria-hidden="true" />
        </g>
      })}

      {cameraMap && camera && <g transform={`translate(${cameraMap.marker[0]},${cameraMap.marker[1]}) rotate(${camera.yaw * 180 / Math.PI})`} className={`guide-mini-camera ${cameraMap.outside ? 'guide-mini-camera-outside' : ''}`} aria-label={cameraMap.outside ? 'La cámara está fuera del recorte. Indicador situado en el borde.' : 'Posición y dirección de la cámara'}>
        <title>{cameraMap.outside ? 'Cámara fuera del recorte; indicador en el borde' : `Mirando al ${compassNames[headingIndex(camera.yaw)]}`}</title>
        <path d={expanded ? 'M0,-10 L7,7 L0,3 L-7,7 Z' : 'M0,-7 L5,5 L0,2 L-5,5 Z'} />
      </g>}

      <g className="guide-mini-north" transform={`translate(${width - (expanded ? 19 : 11)},${expanded ? 31 : 43})`} aria-hidden="true"><path d="M0,-7 L3,1 L0,-1 L-3,1 Z" /><text x="0" y="11" textAnchor="middle">N</text></g>
      {expanded && <g className="guide-mini-scale" transform={`translate(18,${height - 13})`} aria-label={`Escala ${scaleMeters} metros`}><path d={`M0,-4 V0 H${scaleMeters * projection.scale} V-4`} /><text x={scaleMeters * projection.scale / 2} y="-7" textAnchor="middle">{scaleMeters} m</text></g>}

      {tooltipPlace && (() => {
        const labelWidth = Math.min(width - 16, tooltipPlace.place.name.length * (expanded ? 6.1 : 4.8) + 17)
        const labelX = clamp(tooltipPlace.point[0] - labelWidth / 2, 6, width - labelWidth - 6)
        const preferredY = tooltipPlace.point[1] - (expanded ? 33 : 27)
        const labelY = clamp(preferredY < 22 ? tooltipPlace.point[1] + 15 : preferredY, 19, height - 36)
        return <g className="guide-mini-label" transform={`translate(${labelX},${labelY})`} aria-hidden="true"><rect width={labelWidth} height={expanded ? 20 : 17} rx="4" /><text x={labelWidth / 2} y={expanded ? 13 : 11} textAnchor="middle" textLength={tooltipPlace.place.name.length * (expanded ? 6.1 : 4.8) + 4 > labelWidth ? labelWidth - 12 : undefined} lengthAdjust="spacingAndGlyphs">{tooltipPlace.place.name}</text></g>
      })()}
    </g>
  </svg>
})

export default function GuideMiniMap({ geometry, places, selectedId, camera, onSelect }: GuideMiniMapProps) {
  const [expanded, setExpanded] = useState(false)
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const headingId = `guide-map-title-${useId().replace(/:/g, '')}`
  const selectedPlace = places.find(place => place.id === selectedId)
  const direction = camera ? compass[headingIndex(camera.yaw)] : null
  const mapBounds = useMemo(() => geometry ? localMapBounds(geometry, places) : null, [geometry, places])
  const cameraOutside = mapBounds && camera && (camera.position[0] < mapBounds.minX || camera.position[0] > mapBounds.maxX || camera.position[2] < mapBounds.minZ || camera.position[2] > mapBounds.maxZ)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!expanded || !dialog) return
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
      requestAnimationFrame(() => { if (!document.querySelector('dialog:modal')) expandButtonRef.current?.focus({ preventScroll: true }) })
    }
  }, [expanded])

  const choosePlace = (id: string) => { onSelect(id); setExpanded(false) }
  const localPlaces = geometry ? places.filter(place => {
    const [x, z] = guidePosition(place)
    return x >= geometry.bounds.minX && x <= geometry.bounds.maxX && z >= geometry.bounds.minZ && z <= geometry.bounds.maxZ
  }) : []

  return <>
    <section className="guide-mini-map" aria-label="Tu posición en el pueblo">
      {geometry ? <MapCanvas geometry={geometry} places={places} selectedId={selectedId} camera={camera} onSelect={choosePlace} width={mobile ? 145 : 230} height={mobile ? 105 : 150} expanded={false} /> : <div className="guide-mini-loading"><Navigation2 size={16} /><span>Preparando<br />el mapa local</span></div>}
      <div className="guide-mini-heading"><span className="guide-mini-heading-dot" />Dónde miras</div>
      <button ref={expandButtonRef} className="guide-mini-expand" type="button" onClick={() => setExpanded(true)} disabled={!geometry} aria-label="Ampliar mapa local" aria-haspopup="dialog" aria-expanded={expanded}><Maximize2 size={12} /></button>
      <div className="guide-mini-map-caption"><span title={cameraOutside ? 'La posición de la cámara está fuera del recorte del mapa' : direction ? `Mirando al ${compassNames[headingIndex(camera!.yaw)]}` : 'La cámara todavía no está disponible'}><Navigation2 size={9} />{cameraOutside ? 'Borde · ' : ''}{direction || 'Vista general'}</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" title={geometry?.attribution || '© OpenStreetMap contributors'} aria-label="Atribución de datos de OpenStreetMap">© OpenStreetMap</a></div>
    </section>

    {expanded && <dialog ref={dialogRef} className="guide-map-dialog" aria-labelledby={headingId} onCancel={event => { event.preventDefault(); setExpanded(false) }} onClick={event => { if (event.target === event.currentTarget) setExpanded(false) }}>
      <header className="guide-map-dialog-header"><div><span>EL PUEBLO, A TU ALCANCE</span><h2 id={headingId}>Dónde estás. Hacia dónde miras.</h2></div><button type="button" onClick={() => setExpanded(false)} aria-label="Cerrar mapa local"><X size={20} /></button></header>
      {geometry && <MapCanvas geometry={geometry} places={places} selectedId={selectedId} camera={camera} onSelect={choosePlace} width={mobile ? 320 : 640} height={mobile ? 350 : 420} expanded />}
      <div className="guide-map-dialog-context"><span><Navigation2 size={13} />{direction ? `Mirando al ${compassNames[headingIndex(camera!.yaw)]}` : 'Vista general'}{cameraOutside ? ' · cámara fuera del recorte' : ''}</span><span>{selectedPlace ? selectedPlace.name : 'Elige un lugar del mapa'}</span></div>
      <div className="guide-map-place-list" aria-label="Lugares del mapa">{localPlaces.map(place => {
        const { color, icon: Icon } = categoryAppearance[place.category]
        return <button key={place.id} type="button" className={selectedId === place.id ? 'guide-map-place-selected' : ''} aria-pressed={selectedId === place.id} onClick={() => choosePlace(place.id)}><span style={{ color }}><Icon size={15} /></span><span><strong>{place.name}</strong><small>{place.category}</small></span>{selectedId === place.id && <span className="guide-map-current-dot" aria-hidden="true" />}</button>
      })}</div>
      <footer className="guide-map-dialog-footer"><span>Calles, huellas y plazas de OpenStreetMap · Norte arriba</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{geometry?.attribution || '© OpenStreetMap contributors'}</a></footer>
    </dialog>}
  </>
}
