import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Accessibility, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BusFront, Check, ChevronRight, Clock3, Compass, Copy, Info, LocateFixed, MapPin, MessageSquareText, Navigation, Phone, RefreshCw, Search, ShieldCheck, Ticket, WifiOff, X } from 'lucide-react'
import line from './data/line-reference.json'
import { createSctFeedClient } from './integration/sct'
import { approvedSctSource, verifiedSctStopIds } from './integration-config'
import { distanceLabel, distanceTo, normalized, readFavorites, saveFavorites } from './types'
import type { TransitStop, UserLocation } from './types'
import PointTools from './PointTools'
import { readPointNotes, writePointNotes } from './travel-tools'
import { useOfflineGuideStatus } from './offline'

const TransitMap = lazy(() => import('./TransitMap'))
const STOPS: readonly TransitStop[] = line.stops.map(stop => ({ id: stop.id, name: stop.name, coordinates: [stop.coordinates[0], stop.coordinates[1]], sourceUrl: stop.sourceUrl, osmUpdatedAt: stop.osmUpdatedAt, surveyDate: stop.surveyDate, verification: stop.verification, aliases: [...(stop.aliases ?? []), ...(stop.name === 'Hospital General IMSS' ? ['IMSS 6', 'IMSS6', 'Hospital General de Zona 6'] : [])] }))
const STOP_IDS = STOPS.map(stop => stop.id)
const OFFICIAL_QR = 'https://redmetrovalles.sctslp.com/'
const GOVERNMENT_SOURCE = 'https://slp.gob.mx/noticias/2026/3/11/redmetro-de-valles-supera-12-millones-de-viajes-y-m%C3%A1s-apoyo-a-las-familias-ricardo-gallardo/'
type View = 'explore' | 'saved' | 'help'

function pointLabel(stop: TransitStop): string {
  const siblings = STOPS.filter(item => item.name === stop.name)
  return siblings.length > 1 ? `Punto ${String.fromCharCode(65 + siblings.findIndex(item => item.id === stop.id))}` : 'Punto cartográfico'
}

export default function MobilityApp({ onUsePoint }: { onUsePoint?: (stop: TransitStop, role: 'origin' | 'destination') => void }) {
  const Workspace = onUsePoint ? 'section' : 'main'
  const [view, setView] = useState<View>('explore')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(() => { const id = new URLSearchParams(location.search).get('punto'); return id && STOP_IDS.includes(id) ? id : null })
  const [lastSelectedId, setLastSelectedId] = useState(selectedId)
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites(STOP_IDS))
  const [notes, setNotes] = useState(() => readPointNotes(STOP_IDS))
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [nearby, setNearby] = useState(false)
  const [locationAge, setLocationAge] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [notice, setNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const stopButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const mounted = useRef(true)
  const [client] = useState(() => createSctFeedClient({ endpoint: import.meta.env.VITE_SCT_FEED_URL, lineId: 'valles-l1', source: approvedSctSource, verifiedStopIds: verifiedSctStopIds }))
  const [feed, setFeed] = useState(client.getState)
  const offlineGuide = useOfflineGuideStatus()
  const selected = STOPS.find(stop => stop.id === selectedId)

  useEffect(() => {
    mounted.current = true
    const unsubscribe = client.subscribe(setFeed)
    const sync = () => {
      setOnline(navigator.onLine)
      if (document.visibilityState === 'visible' && navigator.onLine) client.start()
      else client.stop()
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { mounted.current = false; unsubscribe(); client.stop(); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); document.removeEventListener('visibilitychange', sync) }
  }, [client])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!userLocation) return
    const update = () => {
      const age = Math.max(0, Math.floor((Date.now() - userLocation.capturedAt) / 1000))
      setLocationAge(age)
      if (age > 120) { setUserLocation(null); setNearby(false); setLocationMessage('Tu ubicación tiene más de dos minutos. Actualízala para consultar cercanía.') }
    }
    update()
    const timer = window.setInterval(update, 10_000)
    return () => window.clearInterval(timer)
  }, [userLocation])

  useEffect(() => {
    if (!selectedId || view === 'help') return
    if (window.innerWidth <= 760) detailHeadingRef.current?.focus({ preventScroll: true })
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); clearSelected() } }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [selectedId, view])

  function selectStop(id: string) {
    if (!STOP_IDS.includes(id)) return
    setSelectedId(id)
    setLastSelectedId(id)
    const url = new URL(location.href)
    url.searchParams.set('punto', id)
    history.replaceState(null, '', url)
  }

  function changeView(next: View) {
    clearSelected(false)
    setView(next)
    setQuery('')
    setCopyFallback('')
  }

  function clearSelected(restoreFocus = true) {
    const previous = selectedId
    setSelectedId(null)
    const url = new URL(location.href)
    url.searchParams.delete('punto')
    history.replaceState(null, '', url)
    if (restoreFocus && previous) requestAnimationFrame(() => { (stopButtonRefs.current.get(previous) ?? searchRef.current)?.focus() })
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id]
    setFavorites(next)
    const persisted = saveFavorites(next)
    setNotice(persisted ? next.includes(id) ? 'Punto guardado para tu próximo viaje.' : 'Punto eliminado de tus guardados.' : 'Guardado durante esta sesión. El navegador no permite conservarlo al cerrar.')
  }

  async function copyText(text: string, confirmation: string) {
    try { await navigator.clipboard.writeText(text); setNotice(confirmation); setCopyFallback('') }
    catch { setCopyFallback(text); setNotice('Selecciona y copia el texto que aparece debajo.') }
  }

  function locate() {
    if (!navigator.geolocation) { setLocationMessage('Este navegador no permite ubicación. Puedes buscar por nombre.'); return }
    setLocating(true)
    setLocationMessage('Buscando tu ubicación…')
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current) return
      setLocating(false)
      const { longitude, latitude, accuracy } = position.coords
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(accuracy) || accuracy < 0) { setLocationMessage('No pudimos obtener una ubicación válida. Busca por nombre.'); return }
      if (accuracy > 500) { setUserLocation(null); setNearby(false); setLocationMessage('La ubicación es demasiado imprecisa para ordenar puntos cercanos. Intenta de nuevo o busca por nombre.'); return }
      if (!Number.isFinite(position.timestamp) || position.timestamp > Date.now() + 30_000 || Date.now() - position.timestamp > 120_000) { setUserLocation(null); setNearby(false); setLocationMessage('La ubicación recibida no es reciente. Actualízala o busca por nombre.'); return }
      if (longitude < -99.11 || longitude > -98.91 || latitude < 21.87 || latitude > 22.12) {
        setLocationMessage('Tu ubicación está fuera de la zona urbana de Valles. Puedes explorar por nombre.'); setUserLocation(null); setNearby(false); return
      }
      setUserLocation({ longitude, latitude, accuracy, capturedAt: position.timestamp })
      setNearby(true)
      setLocationMessage(`Ubicación aproximada (±${Math.round(accuracy)} m). Las distancias son en línea recta, no a pie.`)
    }, error => {
      if (!mounted.current) return
      setLocating(false)
      setUserLocation(null)
      setNearby(false)
      setLocationMessage(error.code === 1 ? 'Ubicación no autorizada. Puedes seguir buscando por nombre.' : 'No pudimos localizarte. Intenta de nuevo o busca por nombre.')
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 })
  }

  const visibleStops = useMemo(() => {
    const terms = normalized(query.trim()).split(/\s+/).filter(Boolean)
    const filtered = STOPS.filter(stop => (view !== 'saved' || favorites.includes(stop.id)) && terms.every(term => normalized(`${stop.name} ${pointLabel(stop)} ${stop.aliases?.join(' ') ?? ''}`).includes(term)))
    return nearby && userLocation ? filtered.sort((a, b) => distanceTo(userLocation, a.coordinates) - distanceTo(userLocation, b.coordinates)) : filtered
  }, [view, favorites, query, nearby, userLocation])
  const referenceMatches = useMemo(() => {
    const terms = normalized(query.trim()).split(/\s+/).filter(Boolean)
    return view === 'explore' && terms.length ? line.references.filter(reference => terms.every(term => normalized(`${reference.name} ${reference.osmName} ${reference.aliases.join(' ')}`).includes(term))) : []
  }, [query, view])
  const vehicles = online ? feed.vehiclePositions : []
  const arrivals = selected && online ? feed.arrivals.filter(arrival => arrival.stopId === selected.id) : []
  const hasLive = online && feed.status === 'available'
  const feedTitle = !online ? 'Sin conexión' : feed.status === 'loading' ? 'Consultando ubicaciones' : hasLive ? 'Posiciones recibidas' : feed.status === 'stale' ? 'Ubicaciones sin actualizar' : feed.status === 'error' ? 'Ubicaciones no disponibles' : 'Llegadas aún no disponibles'
  const feedDescription = !online ? 'Sin conexión a internet. No podemos consultar información reciente de las unidades.' : feed.status === 'loading' ? 'Estamos consultando la fuente autorizada. Espera una respuesta antes de planear con sus datos.' : hasLive ? 'Consulta la hora de captura de cada unidad. Las llegadas necesitan además un catálogo de paradas validado.' : feed.status === 'stale' ? 'La fuente no entrega posiciones recientes. No mostramos unidades o llegadas con datos vencidos.' : feed.status === 'error' ? 'La consulta a la fuente falló o sus datos no superaron la validación. Intenta más tarde.' : 'No hay una fuente de unidades conectada y validada para esta guía.'
  const shareSelected = () => { if (selected) void copyText(new URL(`?punto=${encodeURIComponent(selected.id)}`, location.href).href, 'Enlace del punto copiado.') }

  return <div className="mobility-app">
    <a className="skip-link" href="#trip-panel">Saltar a la guía de viaje</a>
    <header className="app-header">
      <a className="brand" href="./" aria-label="MiRedMetro Valles, inicio"><span className="brand-symbol" aria-hidden="true"><Navigation size={24} strokeWidth={2.2} /></span><span>MiRedMetro<span className="brand-sub">Ciudad Valles<span className="brand-period">.</span></span></span></a>
      <nav className="primary-nav" aria-label="Navegación principal">
        <button onClick={() => changeView('explore')} className={view === 'explore' ? 'active' : ''} aria-current={view === 'explore' ? 'page' : undefined}><Compass size={18} /> Explorar</button>
        <button onClick={() => changeView('saved')} className={view === 'saved' ? 'active' : ''} aria-current={view === 'saved' ? 'page' : undefined}><Bookmark size={18} /> Guardados{favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>
        <button onClick={() => changeView('help')} className={view === 'help' ? 'active' : ''} aria-current={view === 'help' ? 'page' : undefined}><Info size={18} /> Antes de salir</button>
      </nav>
      <div className="header-location"><MapPin size={15} /><span>Ciudad Valles, S.L.P.<span className="mobile-independent">Guía independiente · Prototipo</span></span><span className="prototype-label">Prototipo independiente</span></div>
    </header>

    {!online && <div className="offline-banner" role="status"><WifiOff size={16} /> Sin conexión. Puedes consultar esta página; el mapa base y los datos de unidades necesitan internet.</div>}

    <Workspace className={`app-workspace view-${view}${selected && view !== 'help' ? ' has-selected' : ''}`} aria-label="Mapa y herramientas de la Línea 1">
      <aside className="trip-panel" id="trip-panel" tabIndex={-1} aria-label="Guía de la Línea 1">
        <div className="line-heading"><span className="eyebrow">TU LÍNEA EN CIUDAD VALLES</span><div className="line-name"><span className="line-badge">L1</span><div><h1>Universitaria</h1><p>Línea urbana · Guía independiente</p></div><span className="line-mode" title="Autobús"><BusFront size={23} /></span></div></div>

        <div className="fare-strip"><div><span className="fare-amount">$0</span><span>Transporte gratuito</span></div><a href={OFFICIAL_QR} target="_blank" rel="noreferrer noopener">Registro QR <ArrowUpRight size={15} /></a></div>

        <div className={`feed-strip ${hasLive ? 'has-data' : ''}`} role="status"><span className="status-dot" /><div><strong>{feedTitle}</strong><span>{hasLive ? `${vehicles.length} unidad${vehicles.length !== 1 ? 'es' : ''} con posición reciente` : 'Consulta ubicaciones cartográficas y requisitos.'}</span></div><button className="icon-button" onClick={() => changeView('help')} aria-label="Entender la disponibilidad de llegadas"><Info size={17} /></button></div>

        {view !== 'help' ? <>
          <div className="search-section"><div className="section-heading"><h2>{view === 'saved' ? 'Tus puntos de cada día' : '¿Qué punto buscas?'}</h2>{view === 'saved' && <Bookmark size={18} />}</div><div className="search-box"><Search size={19} /><label className="sr-only" htmlFor="stop-search">Buscar paradero por nombre</label><input id="stop-search" ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca Centro, IMSS, UASLP…" autoComplete="off" maxLength={100} />{query && <button className="clear-search" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Limpiar búsqueda"><X size={16} /></button>}</div>
            <div className="search-tools"><button className={nearby ? 'nearby-button is-active' : 'nearby-button'} onClick={() => nearby ? setNearby(false) : locate()} disabled={locating} aria-pressed={nearby}><LocateFixed size={15} />{locating ? 'Buscando…' : nearby ? 'Cerca de mí' : 'Usar mi ubicación'}</button><span>{visibleStops.length} puntos</span></div>
            {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
            {userLocation && <div className="location-freshness"><span>Captura: {locationAge < 10 ? 'hace unos segundos' : `hace ${locationAge} s`}</span><button onClick={locate} disabled={locating} aria-label="Actualizar mi ubicación"><RefreshCw size={13} /> Actualizar</button></div>}
            <div className="mapping-note"><Info size={15} /><span>Cartografía comunitaria. <strong>Operación y sentido por confirmar.</strong></span></div>
          </div>

          <div className="stop-list" aria-label={view === 'saved' ? 'Puntos guardados' : 'Paraderos cartográficos'}>
            <div className="list-caption">{nearby ? 'Distancia aproximada en línea recta' : 'Orden alfabético · secuencia de viaje sin validar'}</div>
            {visibleStops.length === 0 && referenceMatches.length === 0 ? <div className="empty-state">{view === 'saved' ? <Bookmark size={32} /> : <Search size={32} />}<h3>{view === 'saved' && !query ? 'Tu próximo viaje, a un toque' : 'No encontramos ese punto'}</h3><p>{view === 'saved' && !query ? 'Guarda un punto con el marcador para encontrarlo aquí, sin crear una cuenta.' : 'Prueba “Centro”, “IMSS” o “Tecnológico”. La cobertura cartográfica es parcial.'}</p><button className="button secondary" onClick={() => { changeView('explore'); searchRef.current?.focus() }}>Explorar paraderos <ArrowRight size={16} /></button></div> : visibleStops.map(stop => <article key={stop.id} className={`stop-card ${selectedId === stop.id ? 'is-selected' : ''}`}>
              <button className="stop-select" ref={element => { if (element) stopButtonRefs.current.set(stop.id, element); else stopButtonRefs.current.delete(stop.id) }} onClick={() => selectStop(stop.id)} aria-pressed={selectedId === stop.id}><span className="stop-icon"><MapPin size={18} /></span><span className="stop-copy"><strong>{stop.name}</strong><span>{pointLabel(stop)} <span className="dot-separator">·</span> {userLocation ? `${distanceLabel(distanceTo(userLocation, stop.coordinates))} en línea recta` : 'Sentido por confirmar'}</span>{notes[stop.id] && <span className="private-note-preview">Tu nota: {notes[stop.id]}</span>}</span><ChevronRight size={17} /></button>
              <button className={`save-stop ${favorites.includes(stop.id) ? 'is-saved' : ''}`} onClick={() => toggleFavorite(stop.id)} aria-label={`${favorites.includes(stop.id) ? 'Quitar de guardados' : 'Guardar'} ${stop.name}, ${pointLabel(stop)}`} aria-pressed={favorites.includes(stop.id)}><Bookmark size={18} fill={favorites.includes(stop.id) ? 'currentColor' : 'none'} /></button>
            </article>)}
            {referenceMatches.length > 0 && <section className="reference-results" aria-label="Lugares de referencia, no paraderos"><div className="list-caption">Lugares de referencia · no son paraderos</div>{referenceMatches.map(reference => <article className="reference-card" key={reference.id}><span className="reference-type">DESTINO DE REFERENCIA</span><h3>{reference.name}</h3><p>Ubicamos el lugar. Falta confirmar dónde subir o bajar; este punto no es un paradero ni una entrada accesible.</p><a className="text-link" href={reference.sourceUrl} target="_blank" rel="noreferrer noopener">Ver lugar en OpenStreetMap <ArrowUpRight size={14} /></a><a className="subtle-link" href={GOVERNMENT_SOURCE} target="_blank" rel="noreferrer noopener">Referencia de L1: Gobierno de SLP ↗</a></article>)}</section>}
          </div>
          <div className="panel-footer"><ShieldCheck size={16} /><span>{offlineGuide.ready ? 'Guía guardada sin conexión. El mapa necesita internet.' : offlineGuide.updateAvailable ? 'Hay una versión nueva. Cierra esta guía y vuelve a abrirla.' : 'Sin registro propio. Tu ubicación no se guarda.'}</span></div>
        </> : <div className="help-content">
          <div className="section-heading"><h2>Viaja con información clara</h2></div><p className="help-intro">Lo esencial para preparar tu viaje en la L1.</p>
          <details open><summary><Ticket size={18} /> ¿Cuánto cuesta y cómo accedo?</summary><p>El servicio se publica como gratuito. SCT ofrece un registro para obtener el QR de acceso. Consulta ahí los requisitos vigentes.</p><a className="text-link" href={OFFICIAL_QR} target="_blank" rel="noreferrer noopener">Abrir registro oficial de SCT <ArrowUpRight size={15} /></a><a className="subtle-link" href={GOVERNMENT_SOURCE} target="_blank" rel="noreferrer noopener">Fuente de gratuidad: Gobierno de SLP ↗</a></details>
          <details><summary><Clock3 size={18} /> Horarios, regreso y llegadas</summary><p>No tenemos un horario vigente de L1 confirmado por SCT. Antes de salir, confirma la primera o última salida con la Secretaría.</p><p>{feedDescription}</p><p>La guía no simula posiciones ni minutos de llegada.</p><a className="text-link" href="tel:+524448120677"><Phone size={15} /> Consultar con SCT</a></details>
          <details><summary><Navigation size={18} /> ¿Cómo identifico el sentido?</summary><p>Los puntos A y B distinguen ubicaciones del mapa; no significan ida o vuelta. Confirma el destino en el letrero de la unidad y con el operador antes de abordar.</p><p>El inventario de OSM es parcial y tiene levantamientos de septiembre de 2025. No hemos verificado en campo su operación actual. El mapa no calcula un itinerario en autobús.</p></details>
          <details><summary><Accessibility size={18} /> Accesibilidad y cambios de servicio</summary><p>No tenemos una inspección vigente de rampas, banquetas y cruces por paradero. Una unidad adaptada no garantiza que todo el acceso peatonal sea accesible.</p><p>Esta guía no recibe avisos operativos de SCT. No interpreta la ausencia de avisos como servicio normal.</p><a className="text-link" href="https://sct.slp.gob.mx/" target="_blank" rel="noreferrer noopener">Consultar canales de SCT <ArrowUpRight size={15} /></a></details>
          <details><summary><MessageSquareText size={18} /> Preparar una consulta o reporte</summary><ReportForm selected={STOPS.find(stop => stop.id === lastSelectedId)} copyText={copyText} /><a className="text-link" href="tel:+524448120677"><Phone size={15} /> Atención SCT · 444 812 0677</a></details>
          <details><summary><Info size={18} /> Fuentes y alcance de la guía</summary><p>Prototipo independiente, sin afiliación ni conexión activa con SCT. Referencias documentales consultadas el 28 de octubre de 2026; esa fecha no es una validación del servicio.</p><p>Paraderos: © colaboradores de OpenStreetMap, ODbL. Cartografía base: OpenFreeMap / OpenMapTiles / OpenStreetMap. No hay secuencia, sentidos o trazo operativo validados.</p><a className="text-link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">Atribución y licencia OSM <ArrowUpRight size={15} /></a><a className="text-link" href="https://www.google.com/maps/d/viewer?mid=1YwkNdZRe3yNWuj9GI4SlCybkmUQDs4Q" target="_blank" rel="noreferrer noopener">Mapa externo de consulta <ArrowUpRight size={15} /></a><p>Ese mapa fue publicado por Joel Centeno. Autoría institucional, licencia y vigencia pendientes de verificar; no copiamos su geometría.</p></details>
          {copyFallback && <label className="copy-fallback">Texto para copiar<textarea readOnly value={copyFallback} onFocus={event => event.target.select()} /></label>}
          <div className="help-contact"><span className="help-contact-icon"><Phone size={22} /></span><div><strong>Una duda antes de salir</strong><p>Consulta directamente al canal institucional.</p><a href="tel:+524448120677">Llamar a SCT <ArrowUpRight size={15} /></a></div></div>
        </div>}
      </aside>

      <div className="map-workspace">
        <MapBoundary><Suspense fallback={<div className="map-module-loading" role="status">Preparando el mapa…</div>}><TransitMap stops={STOPS} selected={selected} location={userLocation} vehicles={vehicles} onSelect={selectStop} /></Suspense></MapBoundary>
        <div className="map-data-badge"><span className="map-data-icon"><BusFront size={17} /></span><div><strong>Línea 1 · Universitaria</strong><span>27 puntos cartográficos · cobertura parcial</span></div></div>
        {selected ? <section className="selected-card" aria-label="Detalle del punto seleccionado">
          <div className="selected-topline"><span className="selected-type"><MapPin size={13} /> GUÍA INDEPENDIENTE · PUNTO OSM</span><button className="icon-button" onClick={() => clearSelected()} aria-label="Cerrar detalle del punto"><X size={17} /></button></div>
          <div className="selected-title"><h2 ref={detailHeadingRef} tabIndex={-1}>{selected.name}</h2><button className={`icon-button ${favorites.includes(selected.id) ? 'saved' : ''}`} onClick={() => toggleFavorite(selected.id)} aria-label={`${favorites.includes(selected.id) ? 'Quitar de guardados' : 'Guardar'} punto seleccionado`} aria-pressed={favorites.includes(selected.id)}><Bookmark size={21} fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} /></button></div>
          <div className="selected-tags"><span>{pointLabel(selected)}</span><span>Sentido por confirmar</span></div>
          {STOPS.filter(stop => stop.name === selected.name).length > 1 && <div className="point-options" aria-label="Ubicaciones de esta referencia">{STOPS.filter(stop => stop.name === selected.name).map(stop => <button key={stop.id} onClick={() => selectStop(stop.id)} aria-pressed={stop.id === selected.id} className={stop.id === selected.id ? 'active' : ''}>{pointLabel(stop)}{stop.id === selected.id && <Check size={13} />}</button>)}</div>}
          {STOPS.filter(stop => stop.name === selected.name).length > 1 && <p className="point-help">A y B distinguen ubicaciones del mapa, no ida y vuelta.</p>}
          <p className="selected-notice">Confirma el paradero y el destino con el operador. Su operación actual y accesibilidad no están verificadas.</p>
          {onUsePoint && <div className="jr-use-point"><button onClick={() => onUsePoint(selected, 'origin')}>Salir de aquí ↗</button><button onClick={() => onUsePoint(selected, 'destination')}>Ir aquí ↗</button></div>}
          <div className="arrival-box"><Clock3 size={19} /><div><strong>{arrivals.length ? `Llegada estimada: ${new Date(arrivals[0].estimatedArrivalAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}` : 'Sin estimación de llegada'}</strong><span>{arrivals.length ? 'Predicción de la fuente autorizada · hora de Valles.' : hasLive ? 'Paradas y predicciones aún no habilitadas.' : 'Necesitamos datos operativos recientes de SCT.'}</span></div></div>
          {hasLive && <div className="received-vehicles">{vehicles.map(vehicle => <p key={vehicle.id}>Unidad {vehicle.id} · Captura: {new Date(vehicle.observedAt).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' })} (Valles)</p>)}</div>}
          <div className="selected-actions"><a className="button primary" href={selected.sourceUrl} target="_blank" rel="noreferrer noopener">Ver punto en OSM <ArrowUpRight size={16} /></a><button className="button secondary" onClick={shareSelected} aria-label="Copiar enlace del punto"><Copy size={16} /> Compartir</button></div>
          <PointTools stop={selected} pointLabel={pointLabel(selected)} note={notes[selected.id] ?? ''} copyText={copyText} onNote={value => { const next = { ...notes }; if (value) next[selected.id] = value; else delete next[selected.id]; setNotes(next); setNotice(writePointNotes(next) ? value ? 'Nota guardada en este dispositivo. No se comparte en enlaces o fichas.' : 'Nota eliminada de este dispositivo.' : 'Nota disponible durante esta sesión; el navegador no permite conservarla al cerrar.') }} />
          {copyFallback && view !== 'help' && <label className="copy-fallback">Enlace para copiar<input readOnly value={copyFallback} onFocus={event => event.target.select()} /></label>}
          <div className="source-caption">OpenStreetMap · Levantamiento declarado: {selected.surveyDate ?? 'sin fecha'} · Edición del mapa: {selected.osmUpdatedAt?.slice(0, 10) ?? 'sin fecha'}. Estas fechas no confirman operación actual.</div>
          <button className="mobile-back" onClick={() => { clearSelected(); changeView('explore') }}><ArrowLeft size={14} /> Volver a la lista</button>
        </section> : <section className="map-welcome"><span className="welcome-icon"><Compass size={24} /></span><div><span className="eyebrow">TU PRÓXIMO VIAJE</span><h2>Ubica tu punto de salida.</h2><p>Explora la L1 y guarda los lugares que usas cada día.</p><div className="quick-places">{['Tecnológico', 'Hospital General IMSS', 'Zona Centro'].map(name => { const stop = STOPS.find(item => item.name === name); return stop ? <button key={name} onClick={() => selectStop(stop.id)}>{name === 'Hospital General IMSS' ? 'Hospital IMSS' : name} <ArrowUpRight size={13} /></button> : null })}</div></div></section>}
        <div className="independent-label">Una guía independiente para moverte por Valles.</div>
      </div>
    </Workspace>
    {notice && <div className="app-toast" role="status"><Check size={17} />{notice}</div>}
  </div>
}

function ReportForm({ selected, copyText }: { selected: TransitStop | undefined; copyText: (text: string, confirmation: string) => Promise<void> }) {
  const [topic, setTopic] = useState('Consulta de horario o sentido')
  const [description, setDescription] = useState('')
  return <form className="report-form" onSubmit={event => { event.preventDefault(); void copyText(`Consulta MetroRed Ciudad Valles\nLínea: L1 Universitaria\nPunto de referencia: ${selected ? `${selected.name}, ${pointLabel(selected)} (OSM; sentido por confirmar)` : 'Por indicar'}\nFecha de preparación: ${new Date().toLocaleString('es-MX')}\nMotivo: ${topic}\nDetalle: ${description.trim() || 'Por completar'}\nHora del incidente y unidad, si se conocen: por completar.`, 'Borrador copiado. Revísalo y envíalo tú por un canal oficial.') }}>
    <p>Prepara un borrador y compártelo tú con SCT. No se envía desde esta guía.</p>{selected && <p>Referencia: <strong>{selected.name}, {pointLabel(selected)}</strong>.</p>}<label htmlFor="report-topic">Motivo</label><select id="report-topic" value={topic} onChange={event => setTopic(event.target.value)}>{['Consulta de horario o sentido', 'Dificultad de acceso al paradero', 'Espera o saturación', 'Problema con el QR', 'Otro problema del servicio'].map(value => <option key={value}>{value}</option>)}</select><label htmlFor="report-detail">¿Qué ocurrió? <span>(opcional)</span></label><textarea id="report-detail" maxLength={500} rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Incluye lugar y hora. Evita datos personales." /><button className="button secondary" type="submit"><Copy size={15} /> Copiar borrador</button>
  </form>
}

class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <section className="map-module-loading" role="status"><MapPin size={28} /><strong>El mapa no está disponible</strong><p>Puedes seguir usando la lista, los guardados y la ayuda.</p><button className="button secondary" onClick={() => window.location.reload()}>Volver a cargar el mapa</button></section> : this.props.children
  }
}
