import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Compass, Eye, Focus, HelpCircle, Layers3, MapPin, Maximize2, Minus, Mountain, MousePointer2, Pause, Pencil, Play, Plus, RotateCcw, Route, Sun, Sunset, X } from 'lucide-react'
import type { TourPackage } from '../data'
import { destinations, getDestination } from '../data'
import { destinationStories, experienceAreas } from '../experience-data'
import './ImmersiveExplorer.css'

const TerrainMap = lazy(() => import('./TerrainMap'))
const PhotoExperience = lazy(() => import('./PhotoExperience'))
const clamp = (v: number) => Math.max(0, Math.min(1, v))

interface Props {
  tour: TourPackage
  selectedId: string | null
  playing: boolean
  onPlayingChange: (playing: boolean) => void
  onSelectDestination: (id: string) => void
  onCreatePackage: (ids: string[]) => void
  onEditTour: () => void
  onPreview: () => void
}

export default function ImmersiveExplorer({ tour, selectedId, playing, onPlayingChange, onSelectDestination, onCreatePackage, onEditTour, onPreview }: Props) {
  const [mode, setMode] = useState<'explore' | 'journey'>('explore')
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState<'overview' | 'focus' | 'follow'>('overview')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [focusVersion, setFocusVersion] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [layers, setLayers] = useState(true)
  const [atmosphere, setAtmosphere] = useState<'day' | 'golden'>('day')
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const chaptersRef = useRef<HTMLDivElement>(null)
  const previousTourRef = useRef(`${tour.id}|${tour.destinationIds.join('|')}`)
  const tourKey = tour.destinationIds.join('|')
  const routeStops = useMemo(() => tour.destinationIds.map(getDestination), [tourKey])
  const mapDestinations = useMemo(() => destinations.map(d => ({ ...d, name: d.shortName })), [])
  const selected = getDestination(selectedId || tour.destinationIds[0] || 'tamul')
  const activeArea = experienceAreas.find(a => a.id === activeAreaId)
  const selectedStory = destinationStories[selected.id]
  const chapterIndex = Math.min(routeStops.length - 1, Math.round(progress * Math.max(0, routeStops.length - 1)))
  const totalDuration = Math.max(18, routeStops.length * 12)
  const currentSecond = Math.round(progress * totalDuration)
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  useEffect(() => {
    const key = `${tour.id}|${tourKey}`
    if (previousTourRef.current === key) return
    previousTourRef.current = key
    setProgress(0); setActiveAreaId(null); setFocusedId(null); setCameraMode(playing ? 'follow' : 'overview'); setFocusVersion(v => v + 1)
  }, [tour.id, tourKey])

  useEffect(() => {
    if (playing && mode !== 'journey') { setMode('journey'); setActiveAreaId(null); setCameraMode('follow'); setViewMode('3d') }
  }, [playing, mode])

  useEffect(() => {
    if (!playing || mode !== 'journey' || photoId) return
    let frame = 0, previous = 0, lastRender = 0, pending = 0
    const tick = (now: number) => {
      if (document.hidden) { previous = 0; frame = requestAnimationFrame(tick); return }
      const delta = previous ? Math.min((now - previous) / 1000, .15) : 0
      previous = now; pending += delta * speed / totalDuration
      if (now - lastRender > 32) {
        const advance = pending; pending = 0; lastRender = now
        setProgress(p => Math.min(1, p + advance))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, totalDuration, mode, photoId])

  useEffect(() => {
    if (mode !== 'journey') return
    const stop = routeStops[chapterIndex]
    if (stop && selectedId !== stop.id) onSelectDestination(stop.id)
    if (progress >= 1 && playing) onPlayingChange(false)
  }, [chapterIndex, mode, progress >= 1, tourKey, playing])

  useEffect(() => {
    const sync = () => setFullScreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  useEffect(() => {
    if (mode !== 'journey') return
    const container = chaptersRef.current
    const item = container?.children[chapterIndex] as HTMLElement | undefined
    if (!container || !item) return
    const left = item.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft - (container.clientWidth - item.clientWidth) / 2
    container.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [chapterIndex, mode, tourKey])

  const chooseArea = (id: string) => {
    const area = experienceAreas.find(a => a.id === id)
    if (!area) return
    setMode('explore'); onPlayingChange(false); setActiveAreaId(id); setFocusedId(null); setCameraMode('focus'); setViewMode('3d'); setZoom(1); setFocusVersion(v => v + 1)
    onSelectDestination(area.destinationIds[0])
  }
  const focusDestination = (id: string) => {
    onPlayingChange(false); onSelectDestination(id); setFocusedId(id); setCameraMode('focus'); setViewMode('3d'); setZoom(1); setFocusVersion(v => v + 1)
    if (!activeArea?.destinationIds.includes(id)) setActiveAreaId(null)
    if (mode === 'journey') {
      const index = routeStops.findIndex(d => d.id === id)
      if (index >= 0) setProgress(index / Math.max(1, routeStops.length - 1))
      else setMode('explore')
    }
  }
  const resetTerritory = () => { setMode('explore'); onPlayingChange(false); setActiveAreaId(null); setFocusedId(null); setCameraMode('overview'); setZoom(1); setFocusVersion(v => v + 1) }
  const seekChapter = useCallback((index: number) => {
    const next = Math.max(0, Math.min(routeStops.length - 1, index))
    setMode('journey'); setActiveAreaId(null); setFocusedId(routeStops[next].id); setProgress(next / Math.max(1, routeStops.length - 1)); onSelectDestination(routeStops[next].id)
    setCameraMode('focus'); setViewMode('3d'); setZoom(1); setFocusVersion(v => v + 1); onPlayingChange(false)
  }, [tourKey, onSelectDestination, onPlayingChange])
  const beginJourney = () => { if (mode === 'explore' || progress >= 1) setProgress(0); setMode('journey'); setActiveAreaId(null); setFocusedId(null); setCameraMode('follow'); setViewMode('3d'); setZoom(1); onPlayingChange(true) }
  const openPhoto = (id = selected.id) => { onPlayingChange(false); setPhotoId(id) }
  const photoStops = mode === 'journey' ? routeStops : activeArea ? activeArea.destinationIds.map(getDestination) : destinations
  const photoIndex = Math.max(0, photoStops.findIndex(d => d.id === photoId))
  const stepPhoto = (direction: number) => { const next = (photoIndex + direction + photoStops.length) % photoStops.length; const stop = photoStops[next]; setPhotoId(stop.id); setFocusedId(stop.id); setCameraMode('focus'); onSelectDestination(stop.id); if (mode === 'journey') setProgress(next / Math.max(1, routeStops.length - 1)) }

  return <section className={`immersive-explorer ${mode === 'journey' ? 'is-journey' : ''} ${activeArea ? 'area-focused' : ''}`} ref={stageRef} id="immersive-explorer" aria-label="Exploración inmersiva de la Huasteca">
    <div className="ix-topbar"><div className="ix-edition"><span className="ix-live" />ATLAS VIVO<span>/</span><b>HUASTECA POTOSINA</b></div><div className="ix-modes" role="group" aria-label="Modo de exploración"><button className={mode === 'explore' ? 'active' : ''} onClick={resetTerritory}><Compass size={15} />Explorar áreas</button><button className={mode === 'journey' ? 'active' : ''} onClick={() => { setMode('journey'); setActiveAreaId(null); setCameraMode('overview'); setProgress(0); onSelectDestination(routeStops[0].id); onPlayingChange(false) }}><Route size={15} />Vivir una ruta</button></div><button className={`ix-round ix-guide-button ${guideOpen ? 'active' : ''}`} onClick={() => setGuideOpen(v => !v)} aria-label="Cómo explorar" aria-expanded={guideOpen}><HelpCircle size={17} /></button></div>
    <div className="ix-scene">
      <div className="ix-map"><Suspense fallback={<div className="ix-loading"><Compass size={28} /><span>Abriendo una nueva perspectiva…</span></div>}><TerrainMap destinations={mapDestinations} routeIds={tour.destinationIds} selectedId={selectedId} onSelect={focusDestination} viewMode={viewMode} focusVersion={focusVersion} zoom={zoom} playing={playing} layers={layers} immersive areas={experienceAreas} activeAreaId={activeAreaId} onAreaSelect={chooseArea} cameraMode={cameraMode} focusedDestinationId={cameraMode === 'focus' ? focusedId : null} journeyProgress={mode === 'journey' ? progress : undefined} atmosphere={atmosphere} /></Suspense></div>
      <div className="ix-scene-vignette" />
      <div className="ix-story-heading"><div className="ix-kicker"><span />{mode === 'journey' ? `TU RECORRIDO · ${String(chapterIndex + 1).padStart(2, '0')} / ${String(routeStops.length).padStart(2, '0')}` : activeArea ? 'DENTRO DEL TERRITORIO' : 'UN TERRITORIO. MUCHAS FORMAS DE SENTIRLO.'}</div><h1>{mode === 'journey' ? tour.name : activeArea ? activeArea.title : <>El viaje empieza<br />antes de llegar<span>.</span></>}</h1><p>{mode === 'journey' ? 'Sigue la ruta. Detente donde quieras. Entra en cada historia.' : activeArea ? activeArea.description : 'Sobrevuela la sierra, sigue el agua y descubre los lugares que harán único tu próximo viaje.'}</p><div className="ix-heading-actions">{mode === 'explore' ? <button className="ix-primary" onClick={activeArea ? () => onCreatePackage(activeArea.destinationIds) : beginJourney}>{activeArea ? <Plus size={15} /> : <Play size={14} fill="currentColor" />}{activeArea ? 'Crear ruta en esta área' : 'Comenzar el recorrido'}<ArrowUpRight size={16} /></button> : <button className="ix-outline" onClick={onEditTour}><Pencil size={13} />Diseñar esta ruta</button>}{(activeArea || cameraMode !== 'overview') && <button className="ix-return" onClick={resetTerritory}><ArrowLeft size={12} />Toda la región</button>}</div><div className="ix-territory-facts"><span><Mountain size={14} />Sierra, selva y agua</span><span><MapPin size={13} />6 lugares conectados</span></div></div>

      <div className="ix-view-tools"><div className="ix-perspective"><button className={viewMode === '3d' ? 'active' : ''} onClick={() => setViewMode('3d')} aria-pressed={viewMode === '3d'}>3D</button><button className={viewMode === '2d' ? 'active' : ''} onClick={() => setViewMode('2d')} aria-pressed={viewMode === '2d'}>Cenital</button></div><button className="ix-round" title="Cambiar luz del paisaje" onClick={() => setAtmosphere(a => a === 'day' ? 'golden' : 'day')} aria-label={atmosphere === 'day' ? 'Luz de atardecer' : 'Luz de día'}>{atmosphere === 'day' ? <Sun size={16} /> : <Sunset size={16} />}</button>{document.fullscreenEnabled && <button className="ix-round" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stageRef.current?.requestFullscreen() }} aria-label={fullScreen ? 'Salir de inmersión completa' : 'Inmersión completa'}><Maximize2 size={16} /></button>}</div>

      <div className="ix-map-tools"><button aria-label="Acercar territorio" disabled={zoom >= 1.8} onClick={() => setZoom(z => Math.min(1.8, z + .15))}><Plus size={17} /></button><button aria-label="Alejar territorio" disabled={zoom <= .65} onClick={() => setZoom(z => Math.max(.65, z - .15))}><Minus size={17} /></button><span /><button aria-label="Vista regional" onClick={resetTerritory} title="Volver a toda la región"><Focus size={17} /></button><button aria-label="Alternar satélite y curvas de nivel" onClick={() => setLayers(v => !v)} aria-pressed={layers} title="Satélite / relieve"><Layers3 size={17} /></button></div>

      <aside className="ix-destination-panel" aria-label="Lugar en foco"><button className="ix-feature-photo" onClick={() => openPhoto()} aria-label={`Entrar visualmente a ${selected.name}`}><img key={selected.id} src={selected.image} alt={selected.name} /><div className="ix-photo-scrim" /><span className="ix-photo-label"><span />VENTANA AL DESTINO</span><span className="ix-photo-open"><Eye size={16} />Entrar al lugar<ArrowUpRight size={16} /></span></button><div className="ix-destination-copy"><div className="ix-place-eyebrow"><MapPin size={10} />{selected.municipality}<span>{mode === 'journey' ? `PARADA ${String(chapterIndex + 1).padStart(2, '0')}` : selected.category}</span></div><h2>{selected.shortName}</h2><p>{selectedStory?.headline || selected.experience}</p><button className="ix-link" onClick={() => openPhoto()}>Descubrir sus detalles<ArrowRight size={13} /></button></div>{activeArea && <div className="ix-area-destinations"><span>EN ESTA ÁREA</span>{activeArea.destinationIds.map(id => <button key={id} className={id === selected.id ? 'active' : ''} onClick={() => focusDestination(id)}><span>{id === selected.id ? <Check size={11} /> : <MapPin size={11} />}</span>{getDestination(id).shortName}<ChevronRight size={12} /></button>)}</div>}</aside>

      <div className="ix-orbit-hint"><MousePointer2 size={12} />Arrastra el paisaje para cambiar de perspectiva<span>COORDENADAS QUE CONECTAN HISTORIAS</span></div>
      {guideOpen && <div className="ix-guide"><button className="ix-round" aria-label="Cerrar guía" onClick={() => setGuideOpen(false)}><X size={15} /></button><span className="ix-kicker">TRES FORMAS DE DESCUBRIR</span><h3>Haz tuyo el territorio.</h3><ol><li><b>01</b><span><strong>Explora un área</strong>Toca sus límites en el mapa o elige una tarjeta.</span></li><li><b>02</b><span><strong>Acércate a un lugar</strong>La cámara te lleva hasta su paisaje. Abre su ventana visual.</span></li><li><b>03</b><span><strong>Recorre a tu ritmo</strong>Elige un capítulo, mueve el avance o deja que la ruta te guíe.</span></li></ol><small>Las áreas son agrupaciones para explorar; no representan límites administrativos.</small></div>}
    </div>

    {mode === 'explore' ? <div className="ix-areas"><div className="ix-areas-heading"><span>ELIGE QUÉ QUIERES SENTIR</span><p>Tres territorios por descubrir<ArrowDown size={12} /></p></div><div className="ix-area-grid">{experienceAreas.map((area, index) => <button key={area.id} className={`ix-area-card ${activeAreaId === area.id ? 'active' : ''}`} onClick={() => chooseArea(area.id)} aria-pressed={activeAreaId === area.id} style={{ '--area-color': area.color } as React.CSSProperties}><img src={area.image} alt="" /><span className="ix-area-number">0{index + 1}</span><span className="ix-area-card-copy"><small>{area.kicker}</small><strong>{area.title}</strong><span>{area.destinationIds.length} {area.destinationIds.length === 1 ? 'lugar para explorar' : 'lugares conectados'}</span></span><ArrowUpRight size={19} /></button>)}</div><small className="ix-area-note">Áreas de inspiración · Posiciones orientativas · Relieve con altura visual 4×</small></div> : <div className="ix-journey"><div className="ix-journey-heading"><div><span>EL RECORRIDO, A TU RITMO</span><strong>{progress >= 1 ? 'El viaje termina. La historia sigue.' : selectedStory?.headline || selected.name}</strong></div><button onClick={onPreview} className="ix-link"><Eye size={14} />Vista del viajero<ArrowUpRight size={13} /></button></div><div className="ix-chapters" ref={chaptersRef}>{routeStops.map((stop, index) => <button key={stop.id} className={`${chapterIndex === index ? 'active' : ''} ${chapterIndex > index ? 'visited' : ''}`} onClick={() => seekChapter(index)} aria-label={`Ir a parada ${index + 1}: ${stop.shortName}`} aria-current={chapterIndex === index ? 'step' : undefined}><img src={stop.image} alt="" /><span className="ix-chapter-number">{chapterIndex > index ? <Check size={11} /> : String(index + 1).padStart(2, '0')}</span><span><small>CAPÍTULO {String(index + 1).padStart(2, '0')}</small><strong>{stop.shortName}</strong><em>{stop.municipality}</em></span>{chapterIndex === index && <span className="ix-current-dot" />}</button>)}</div><div className="ix-playback"><div className="ix-player-buttons"><button className="ix-round" aria-label="Parada anterior" disabled={chapterIndex === 0} onClick={() => seekChapter(chapterIndex - 1)}><ChevronLeft size={18} /></button><button className="ix-play-button" aria-label={playing ? 'Pausar viaje' : progress >= 1 ? 'Repetir viaje' : 'Reproducir viaje'} onClick={() => playing ? onPlayingChange(false) : beginJourney()}>{playing ? <Pause size={17} fill="currentColor" /> : progress >= 1 ? <RotateCcw size={17} /> : <Play size={17} fill="currentColor" />}</button><button className="ix-round" aria-label="Parada siguiente" disabled={chapterIndex === routeStops.length - 1} onClick={() => seekChapter(chapterIndex + 1)}><ChevronRight size={18} /></button></div><span className="ix-time">{formatTime(currentSecond)}<span> / {formatTime(totalDuration)}</span></span><div className="ix-progress"><input type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} onChange={e => { setProgress(clamp(Number(e.target.value) / 1000)); onPlayingChange(false); setCameraMode('follow') }} aria-label="Avance del recorrido" aria-valuetext={`${Math.round(progress * 100)} por ciento del recorrido`} style={{ '--journey-progress': `${progress * 100}%` } as React.CSSProperties} /></div><label className="ix-speed"><span>Ritmo</span><select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Velocidad del recorrido"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><button className={`ix-camera-mode ${cameraMode === 'follow' ? 'active' : ''}`} onClick={() => { setCameraMode(m => m === 'follow' ? 'overview' : 'follow'); setFocusVersion(v => v + 1) }} aria-pressed={cameraMode === 'follow'}><Focus size={13} /><span>Seguir cámara</span></button></div><div className="ix-journey-footnote"><span>Tiempo de la experiencia visual. No representa el tiempo de traslado.</span><span>{progress >= 1 ? 'RECORRIDO COMPLETO' : `SIGUIENTE: ${routeStops[Math.min(chapterIndex + 1, routeStops.length - 1)].shortName.toUpperCase()}`}</span></div></div>}
    {photoId && destinationStories[photoId] && <Suspense fallback={<div className="ix-photo-loading"><Compass size={25} />Abriendo el destino…</div>}><PhotoExperience destination={getDestination(photoId)} story={destinationStories[photoId]} onClose={() => setPhotoId(null)} onNext={() => stepPhoto(1)} onPrevious={() => stepPhoto(-1)} onAddToPackage={() => { onCreatePackage([photoId]); setPhotoId(null) }} stepIndex={photoIndex} totalSteps={photoStops.length} /></Suspense>}
  </section>
}
