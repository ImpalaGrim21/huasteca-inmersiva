import { useEffect, useRef, useState } from 'react'
import { Map, AttributionControl, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Expand, MapPin, RefreshCw } from 'lucide-react'
import type { FeatureCollection, Point } from 'geojson'
import type { TransitStop, UserLocation } from './types'
import type { VehiclePosition } from './integration/sct'
import { cacheGuideResources } from './offline'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

interface Props {
  stops: readonly TransitStop[]
  selected: TransitStop | undefined
  location: UserLocation | null
  vehicles: readonly VehiclePosition[]
  onSelect: (id: string) => void
  journey?: {
    origin?: readonly [number, number]
    destination: readonly [number, number]
    boardingId: string
    alightingId: string
  }
}

function points(stops: readonly TransitStop[], selected?: string, journey?: Props['journey']): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: stops.map(stop => ({ type: 'Feature', id: stop.id, properties: { id: stop.id, name: stop.name, selected: stop.id === selected, boarding: stop.id === journey?.boardingId, alighting: stop.id === journey?.alightingId }, geometry: { type: 'Point', coordinates: [...stop.coordinates] } })) }
}

const motionDuration = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550
function focusPoint(map: Map, stop: TransitStop, duration = motionDuration()) {
  const mobile = window.innerWidth <= 760
  map.easeTo({ center: [...stop.coordinates], zoom: Math.max(map.getZoom(), 15.5), duration, padding: { top: 40, bottom: mobile ? Math.min(map.getContainer().clientHeight * .66, 520) : 140, left: 30, right: 30 } })
}

export default function TransitMap({ stops, selected, location, vehicles, onSelect, journey }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedRef = useRef(selected)
  const journeyRef = useRef(journey)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState(false)
  onSelectRef.current = onSelect
  selectedRef.current = selected
  journeyRef.current = journey

  useEffect(() => {
    const restore = () => { if (!mapRef.current?.isStyleLoaded()) setAttempt(value => value + 1) }
    window.addEventListener('online', restore)
    return () => window.removeEventListener('online', restore)
  }, [])

  function fitAll() {
    if (!stops.length) return
    const trip = journeyRef.current
    const tripStops = trip ? stops.filter(stop => stop.id === trip.boardingId || stop.id === trip.alightingId) : stops
    const coordinates: (readonly [number, number])[] = [...tripStops.map(stop => stop.coordinates), ...(trip?.origin ? [trip.origin] : []), ...(trip ? [trip.destination] : [])]
    const mobile = window.innerWidth <= 760
    mapRef.current?.fitBounds([[Math.min(...coordinates.map(p => p[0])), Math.min(...coordinates.map(p => p[1]))], [Math.max(...coordinates.map(p => p[0])), Math.max(...coordinates.map(p => p[1]))]], { padding: { top: mobile ? 55 : 90, bottom: mobile ? 38 : 180, left: mobile ? 28 : 60, right: mobile ? 65 : 60 }, maxZoom: 14.5, duration: motionDuration() })
  }

  useEffect(() => {
    if (!container.current) return
    setPhase('loading')
    // Offline guide use must not start a network-backed renderer or worker.
    // The searchable list and personal tools remain available independently.
    if (!navigator.onLine) { setPhase('error'); return }
    let map: Map
    try {
      map = new Map({ container: container.current, style: 'https://tiles.openfreemap.org/styles/positron', center: [-99.015, 21.995], zoom: 13, minZoom: 10, maxZoom: 19, maxBounds: [[-99.15, 21.8], [-98.85, 22.2]], attributionControl: false, canvasContextAttributes: { antialias: false }, cooperativeGestures: false })
    } catch { setPhase('error'); return }
    mapRef.current = map
    const observer = new ResizeObserver(() => {
      map.resize()
      if (selectedRef.current && !journeyRef.current) focusPoint(map, selectedRef.current, 0)
      else fitAll()
    })
    observer.observe(container.current)
    void cacheGuideResources([workerUrl])
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.getCanvas().setAttribute('aria-label', 'Mapa de paraderos cartográficos de la Línea 1. También puedes seleccionarlos en la lista.')
    const timeout = window.setTimeout(() => { if (!map.isStyleLoaded()) setPhase('error') }, 18_000)
    map.on('error', () => { if (!map.isStyleLoaded()) setPhase('error') })
    map.on('movestart', () => setSettled(false))
    map.on('idle', () => setSettled(true))
    map.on('load', () => {
      window.clearTimeout(timeout)
      map.addSource('l1-stops', { type: 'geojson', data: points(stops, selectedRef.current?.id, journeyRef.current) })
      map.addLayer({ id: 'stop-halos', type: 'circle', source: 'l1-stops', paint: { 'circle-radius': ['case', ['get', 'selected'], 21, 12], 'circle-color': '#21664f', 'circle-opacity': ['case', ['get', 'selected'], 0.15, 0.045] } })
      map.addLayer({ id: 'stop-points', type: 'circle', source: 'l1-stops', paint: { 'circle-radius': ['case', ['get', 'boarding'], 10, ['get', 'alighting'], 10, ['get', 'selected'], 10, 7], 'circle-color': ['case', ['get', 'alighting'], '#e66b48', ['get', 'boarding'], '#182f27', ['get', 'selected'], '#174f40', '#ffffff'], 'circle-stroke-width': 2.5, 'circle-stroke-color': '#21664f' } })
      map.addLayer({ id: 'stop-labels', type: 'symbol', source: 'l1-stops', minzoom: 12.3, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-max-width': 12 }, paint: { 'text-color': '#244d41', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } })
      map.addSource('passenger', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'passenger-halo', type: 'circle', source: 'passenger', paint: { 'circle-radius': 18, 'circle-color': '#397bc3', 'circle-opacity': 0.16 } })
      map.addLayer({ id: 'passenger-point', type: 'circle', source: 'passenger', paint: { 'circle-radius': 7, 'circle-color': '#397bc3', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
      map.addSource('sct-vehicles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'sct-vehicle-points', type: 'circle', source: 'sct-vehicles', paint: { 'circle-radius': 8, 'circle-color': '#d07a2e', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
      map.addSource('journey-places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'journey-place-halos', type: 'circle', source: 'journey-places', paint: { 'circle-radius': 19, 'circle-color': ['case', ['==', ['get', 'kind'], 'destination'], '#e66b48', '#182f27'], 'circle-opacity': .12 } })
      map.addLayer({ id: 'journey-place-labels', type: 'symbol', source: 'journey-places', layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-anchor': 'bottom', 'text-offset': [0, -1.4] }, paint: { 'text-color': '#182f27', 'text-halo-color': '#fffef9', 'text-halo-width': 2 } })
      map.on('click', 'stop-points', event => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') onSelectRef.current(id)
      })
      map.on('mouseenter', 'stop-points', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'stop-points', () => { map.getCanvas().style.cursor = '' })
      setPhase('ready')
    })
    return () => { window.clearTimeout(timeout); observer.disconnect(); map.remove(); mapRef.current = null }
  }, [stops, attempt])

  useEffect(() => {
    const map = mapRef.current
    if (phase !== 'ready' || !map) return
    map.resize()
    ;(map.getSource('l1-stops') as GeoJSONSource | undefined)?.setData(points(stops, selected?.id, journey))
    const locations: FeatureCollection<Point> = { type: 'FeatureCollection', features: journey ? [
      ...(journey.origin ? [{ type: 'Feature' as const, properties: { kind: 'origin', label: 'Tu salida' }, geometry: { type: 'Point' as const, coordinates: [...journey.origin] } }] : []),
      { type: 'Feature', properties: { kind: 'destination', label: 'Tu destino' }, geometry: { type: 'Point', coordinates: [...journey.destination] } },
    ] : [] }
    ;(map.getSource('journey-places') as GeoJSONSource | undefined)?.setData(locations)
    const frame = requestAnimationFrame(() => { map.resize(); if (selected && !journey) focusPoint(map, selected); else fitAll() })
    return () => cancelAnimationFrame(frame)
  }, [selected, phase, stops, journey])

  useEffect(() => {
    if (phase !== 'ready') return
    const source = mapRef.current?.getSource('passenger') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: location ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] } }] : [] })
  }, [location, phase])

  useEffect(() => {
    if (phase !== 'ready') return
    const source = mapRef.current?.getSource('sct-vehicles') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: vehicles.map(vehicle => ({ type: 'Feature', properties: { id: vehicle.id }, geometry: { type: 'Point', coordinates: [vehicle.longitude, vehicle.latitude] } })) })
  }, [vehicles, phase])

  return <section className={`transit-map map-${phase}`} aria-label="Mapa de Ciudad Valles" data-map-status={phase} data-map-settled={settled}>
    <div className="map-canvas" ref={container} />
    <div className="map-place-label"><span className="map-location-dot" /> Ciudad Valles <span>San Luis Potosí</span></div>
    <button className="map-fit icon-button" onClick={fitAll} aria-label="Ver todos los paraderos en el mapa"><Expand size={18} /></button>
    {phase === 'loading' && <div className="map-feedback" role="status"><RefreshCw size={22} /><strong>Cargando el mapa de Valles</strong><span>La lista está disponible mientras tanto.</span></div>}
    {phase === 'error' && <div className="map-feedback" role="status"><MapPin size={26} /><strong>El mapa no pudo cargar</strong><span>Puedes seguir consultando y guardando paraderos en la lista.</span><button className="button secondary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} /> Reintentar mapa</button></div>}
    <div className="map-legend"><span className="legend-stop" /> Paraderos en OpenStreetMap <span className="legend-separator">·</span><span>Servicio por confirmar</span></div>
  </section>
}
