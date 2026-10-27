import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Bookmark, Building2, Check, ChevronDown, ChevronRight, Compass, Download, Eye, Focus, Footprints, Info, Landmark, Leaf, List, MapPin, Maximize2, Minus, Mountain, Navigation, Plus, Search, Share2, Store, Sun, Sunset, Trash2, Utensils, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { assetUrl } from '../asset-url'
import { guideCategories, guidePlaces } from '../guide-data'
import type { GuideCategory, GuideGeometry, GuidePlace } from '../guide-data'
import type { GuideCameraState, GuideViewpoint } from './CityScene.types'
import './SpatialGuide.css'

const CityScene = lazy(() => import('./CityScene'))
const GuideMiniMap = lazy(() => import('./GuideMiniMap'))
const TerrainMap = lazy(() => import('./TerrainMap'))
const categoryColors: Record<GuideCategory, string> = { Pueblos: '#e7c68c', Plazas: '#d4e5a2', Hospedaje: '#d4b9e8', Cultura: '#edbd8e', Comida: '#e7aa91', Servicios: '#a9cbdc', Naturaleza: '#94d6be' }
const iconFor = (category: GuideCategory, size = 16) => category === 'Hospedaje' ? <BedDouble size={size} /> : category === 'Plazas' ? <Leaf size={size} /> : category === 'Cultura' ? <Landmark size={size} /> : category === 'Comida' ? <Utensils size={size} /> : category === 'Servicios' ? <Store size={size} /> : category === 'Pueblos' ? <Building2 size={size} /> : <Mountain size={size} />
const plain = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const initialPlace = () => guidePlaces.find(p => p.sceneId === 'xilitla-centro' && p.category === 'Plazas') || guidePlaces[0]
const validPlan = (values: unknown) => Array.isArray(values) ? [...new Set(values.filter((id): id is string => typeof id === 'string' && guidePlaces.some(p => p.id === id)))].slice(0, 30) : []
const readPlan = () => {
  const shared = new URLSearchParams(location.search).get('guide')
  if (shared) return validPlan(shared.split(','))
  try { return validPlan(JSON.parse(localStorage.getItem('huasteca-personal-guide-v1') || '[]')) } catch { return [] }
}

function GuideDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose); closeRef.current = onClose
  useEffect(() => { const focus = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { ref.current?.close(); requestAnimationFrame(() => focus?.isConnected && focus.focus({ preventScroll: true })) } }, [])
  return <dialog ref={ref} className="sg-dialog" onCancel={e => { e.preventDefault(); closeRef.current() }} aria-label={title}><header><span>HUASTECA · GUÍAS QUE SE VIVEN</span><button onClick={onClose} aria-label="Cerrar guía"><X size={18} /></button><h2>{title}</h2></header>{children}</dialog>
}

export default function SpatialGuide({ onStudio }: { onStudio: () => void }) {
  const [scope, setScope] = useState<'local' | 'region'>('local')
  const [category, setCategory] = useState<GuideCategory | 'Todos'>('Todos')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(initialPlace()?.id || '')
  const [geometry, setGeometry] = useState<GuideGeometry | null>(null)
  const [geometryError, setGeometryError] = useState(false)
  const [perspective, setPerspective] = useState<'overview' | 'pov'>('overview')
  const [viewpoint, setViewpoint] = useState<GuideViewpoint>('arrival')
  const [focusVersion, setFocusVersion] = useState(0)
  const [camera, setCamera] = useState<GuideCameraState | null>(null)
  const [preview, setPreview] = useState('')
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset'>('day')
  const [showLabels, setShowLabels] = useState(true)
  const [showPaths, setShowPaths] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [walk, setWalk] = useState({ forward: 0, right: 0 })
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 760)
  const [focusView, setFocusView] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [sceneAvailable, setSceneAvailable] = useState(true)
  const [plan, setPlan] = useState<string[]>(readPlan)
  const [planOpen, setPlanOpen] = useState(() => Boolean(new URLSearchParams(location.search).get('guide')))
  const [infoOpen, setInfoOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [shareLink, setShareLink] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const getLabelObstacles = useCallback(() => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.sg-directory,.sg-place-panel,.sg-minimap,.sg-context-heading,.sg-pov-bar,.sg-world-tools,.sg-mobile-tools-toggle') || []).filter(element => {
    const style = getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .2
  }).map(element => element.getBoundingClientRect()), [])
  const lastMode = useRef<string>('orbit')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selected = guidePlaces.find(p => p.id === selectedId) || initialPlace()
  const localPlaces = useMemo(() => guidePlaces.filter(p => p.sceneId === 'xilitla-centro' && p.category !== 'Pueblos'), [])
  const filtered = useMemo(() => guidePlaces.filter(p => (scope === 'region' || p.sceneId === 'xilitla-centro') && (category === 'Todos' || p.category === category) && plain(`${p.name} ${p.municipality} ${p.category}`).includes(plain(query))), [scope, category, query])
  const localIds = useMemo(() => filtered.map(p => p.id), [filtered])
  const regionalMarkers = useMemo(() => filtered.map(p => ({ id: p.id, name: p.name, category: p.category, image: p.image, position: [((p.lon + 99.5) / .7 - .5) * 16, ((Math.asinh(Math.tan(22.2 * Math.PI / 180)) - Math.asinh(Math.tan(p.lat * Math.PI / 180))) / (Math.asinh(Math.tan(22.2 * Math.PI / 180)) - Math.asinh(Math.tan(21.35 * Math.PI / 180))) - .5) * 20.922] as [number, number] })), [filtered])
  const notify = (message: string) => { setNotice(message); if (noticeTimer.current) clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 4000) }

  useEffect(() => {
    let cancelled = false
    fetch(assetUrl('/guide/xilitla-center.json')).then(r => { if (!r.ok) throw new Error('Guide unavailable'); return r.json() as Promise<GuideGeometry> }).then(g => { if (!cancelled) setGeometry(g) }).catch(() => { if (!cancelled) setGeometryError(true) })
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { cancelled = true; document.body.style.overflow = previousOverflow; if (noticeTimer.current) clearTimeout(noticeTimer.current) }
  }, [])

  useEffect(() => {
    if (camera?.mode === 'pov' && lastMode.current !== 'pov') setPanelOpen(false)
    if (camera) lastMode.current = camera.mode
  }, [camera?.mode])

  useEffect(() => { if (perspective === 'overview') setFocusView(false) }, [perspective])
  useEffect(() => { if (!sceneAvailable) { setPerspective('overview'); setPreview(''); setCamera(null) } }, [sceneAvailable])

  useEffect(() => {
    const release = () => setWalk({ forward: 0, right: 0 })
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && perspective === 'pov' && !document.querySelector('dialog:modal')) { setPerspective('overview'); setFocusVersion(v => v + 1); setPanelOpen(true) } }
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('blur', release); window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release); window.removeEventListener('keydown', escape) }
  }, [perspective])

  const choose = (id: string, enter = true) => {
    const place = guidePlaces.find(p => p.id === id); if (!place) return
    setSelectedId(id); setPreview(''); setViewpoint('arrival'); setFocusVersion(v => v + 1); setDirectoryOpen(false); setPanelOpen(true)
    if (scope === 'local' && place.sceneId === 'xilitla-centro') setPerspective(enter && sceneAvailable ? 'pov' : 'overview')
    else { setScope('region'); setPerspective('overview') }
  }
  const switchScope = (next: 'local' | 'region') => {
    setScope(next); setPerspective('overview'); setCategory('Todos'); setQuery(''); setPreview(''); setFocusVersion(v => v + 1); setZoom(1)
    if (next === 'local') setSelectedId(initialPlace().id)
  }
  const selectCategory = (next: GuideCategory | 'Todos') => {
    const localMatch = guidePlaces.some(p => p.sceneId === 'xilitla-centro' && (next === 'Todos' || p.category === next))
    const nextScope = next === 'Pueblos' || next === 'Naturaleza' || !localMatch ? 'region' : scope
    const matches = guidePlaces.filter(p => (nextScope === 'region' || p.sceneId === 'xilitla-centro') && (next === 'Todos' || p.category === next))
    if (!matches.some(p => p.id === selectedId) && matches[0]) setSelectedId(matches[0].id)
    setScope(nextScope); setCategory(next); setQuery(''); setDirectoryOpen(true); setPanelOpen(false); setPerspective('overview'); setPreview(''); setZoom(1); setFocusVersion(v => v + 1)
  }
  const savePlan = (next: string[]) => {
    try {
      localStorage.setItem('huasteca-personal-guide-v1', JSON.stringify(next)); setPlan(next); setShareLink('')
      const url = new URL(location.href)
      if (url.searchParams.has('guide')) { if (next.length) url.searchParams.set('guide', next.join(',')); else url.searchParams.delete('guide'); history.replaceState(null, '', url) }
      return true
    } catch { notify('No se pudo guardar. Revisa el almacenamiento de este navegador.'); return false }
  }
  const toggleSaved = (place: GuidePlace) => {
    const exists = plan.includes(place.id)
    if (savePlan(exists ? plan.filter(id => id !== place.id) : [...plan, place.id])) notify(exists ? 'Lugar retirado de tu guía.' : `${place.name} está en tu guía.`)
  }
  const downloadGuide = () => {
    const text = `MI GUÍA · HUASTECA POTOSINA\n\n${plan.map((id, i) => { const p = guidePlaces.find(place => place.id === id)!; return `${i + 1}. ${p.name}\n${p.category} · ${p.municipality}\n${p.summary}\nFuente: ${p.sourceUrl}\n${p.websiteUrl ? `Sitio del lugar: ${p.websiteUrl}\n` : ''}` }).join('\n')}\nSelección personal de lugares; no es reserva ni ruta de navegación. Consulta condiciones con cada responsable. La guía espacial representa huellas OSM con alturas y fachadas interpretativas.\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mi-guia-huasteca.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const shareGuide = async () => {
    const url = new URL(location.href); url.searchParams.set('guide', plan.join(',')); url.hash = ''; setShareLink(url.toString())
    try { await navigator.clipboard.writeText(url.toString()); notify('Enlace de tu guía copiado.') } catch { notify('Tu enlace está listo para copiar en la guía.') }
  }

  if (!selected) return <div className="sg-loading">Preparando la guía del territorio…</div>
  const inScene = scope === 'local' && selected.sceneId === 'xilitla-centro'
  const pov = inScene && sceneAvailable && perspective === 'pov'
  return <div className={`spatial-guide ${scope === 'region' ? 'sg-region' : ''} ${pov ? 'sg-in-pov' : ''} ${pov && focusView ? 'sg-focus-view' : ''} ${toolsOpen ? 'sg-tools-open' : ''} ${!sceneAvailable && scope === 'local' ? 'sg-fallback-view' : ''} ${directoryOpen ? 'sg-directory-open' : ''}`} ref={rootRef}>
    <header className="sg-header"><button className="sg-brand" onClick={() => switchScope('local')} aria-label="Huasteca, inicio de la guía"><Mountain size={29} strokeWidth={1.3} /><span>huasteca<small>GUÍAS QUE SE VIVEN</small></span></button><nav className="sg-category-nav" aria-label="Qué quieres descubrir"><button className={category === 'Todos' ? 'active' : ''} onClick={() => selectCategory('Todos')}><Compass size={14} />Descubrir</button>{guideCategories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => selectCategory(c)}>{iconFor(c, 14)}{c === 'Hospedaje' ? 'Dónde dormir' : c === 'Comida' ? 'Dónde comer' : c}</button>)}</nav><div className="sg-header-actions"><button className="sg-plan-button" onClick={() => setPlanOpen(true)}><Bookmark size={15} />Mi guía<span>{plan.length}</span></button><button className="sg-studio-button" onClick={onStudio}><Store size={14} /><span>Estudio</span><ArrowUpRight size={12} /></button></div></header>
    <div className="sg-breadcrumbs"><button onClick={() => switchScope('region')}><Compass size={12} />Huasteca Potosina</button><ChevronRight size={11} /><button className={scope === 'local' ? 'active' : ''} onClick={() => switchScope('local')}>Xilitla</button>{scope === 'local' && <><ChevronRight size={11} /><span>Centro · guía espacial</span></>}<span className="sg-live-tag"><i />{scope === 'local' ? 'EXPLORACIÓN A ESCALA HUMANA' : 'EL TERRITORIO Y SUS LUGARES'}</span></div>
    <div className="sg-world"><Suspense fallback={<div className="sg-loading"><Compass size={28} /><span>Construyendo una perspectiva del territorio…</span></div>}>{scope === 'local' ? <CityScene geometry={geometry} places={localPlaces} visibleIds={localIds} selectedId={selectedId} onSelect={choose} perspective={perspective} viewpoint={viewpoint} focusVersion={focusVersion} onCameraChange={setCamera} onPreview={setPreview} onAvailabilityChange={setSceneAvailable} getLabelObstacles={getLabelObstacles} labelLayoutKey={`${scope}|${panelOpen}|${directoryOpen}|${focusView}|${toolsOpen}`} timeOfDay={timeOfDay} showLabels={showLabels} showPaths={showPaths} zoom={zoom} walkInput={walk} /> : <TerrainMap destinations={regionalMarkers} routeIds={[]} selectedId={selectedId} onSelect={id => choose(id, false)} viewMode="3d" focusVersion={focusVersion} zoom={zoom} playing={false} layers immersive cameraMode="overview" focusedDestinationId={selectedId} atmosphere={timeOfDay === 'day' ? 'day' : 'golden'} />}</Suspense><div className="sg-world-vignette" />{geometryError && scope === 'local' && <div className="sg-geometry-error"><Info size={18} /><span>No pudimos abrir la geometría urbana.</span><button onClick={() => switchScope('region')}>Explorar la región<ArrowRight size={14} /></button></div>}</div>

    <div className="sg-context-heading"><span>{scope === 'local' ? 'UN PUEBLO. MUCHAS HISTORIAS.' : 'LUGARES PARA VIVIR LA HUASTECA.'}</span><h1>{scope === 'local' ? <>Entra en Xilitla<span>.</span></> : <>Elige tu lugar<span>.</span></>}</h1><p>{scope === 'local' ? 'La plaza, sus calles, dónde quedarte y qué descubrir.' : 'Pueblos, estancias, cultura y naturaleza en un mismo territorio.'}</p></div>

    <aside className={`sg-directory ${directoryOpen ? 'open' : ''}`} aria-label="Directorio de lugares"><div className="sg-directory-heading"><span>{scope === 'local' ? 'AQUÍ, EN EL CENTRO' : 'EN LA HUASTECA'}</span><button className="sg-small-icon" aria-label="Cerrar directorio" onClick={() => setDirectoryOpen(false)}><X size={15} /></button></div><label className="sg-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Un lugar, una historia…" aria-label="Buscar en la guía" />{query && <button aria-label="Limpiar búsqueda de guía" onClick={() => setQuery('')}><X size={12} /></button>}</label><div className="sg-list-caption"><span>{category === 'Todos' ? 'Lugares para descubrir' : category}</span><b>{filtered.length}</b></div><div className="sg-place-list">{filtered.map(place => <button className={`sg-place-row ${selectedId === place.id ? 'active' : ''}`} key={place.id} onClick={() => choose(place.id)}><span className="sg-place-icon" style={{ color: categoryColors[place.category] }}>{iconFor(place.category, 17)}</span><span><strong>{place.name}</strong><small>{place.category} · {place.municipality}</small></span>{plan.includes(place.id) ? <Check size={13} /> : <ChevronRight size={12} />}</button>)}</div>{!filtered.length && <div className="sg-no-results"><Search size={20} /><strong>No hay coincidencias aquí</strong><p>Prueba otro nombre o explora todos los lugares de la región.</p><button onClick={() => switchScope('region')}>Ver la Huasteca<ArrowRight size={13} /></button></div>}<div className="sg-directory-foot"><MapPin size={12} /><span>{scope === 'local' ? 'Traza urbana real · vistas esquemáticas' : 'Posiciones orientativas · fuentes por lugar'}</span></div></aside>

    <aside className={`sg-place-panel ${panelOpen ? 'expanded' : 'compact'}`} aria-label="Lugar seleccionado"><button className="sg-panel-handle" onClick={() => setPanelOpen(v => !v)} aria-label={panelOpen ? 'Contraer ficha del lugar' : 'Expandir ficha del lugar'}><span /><ChevronDown size={15} /></button><div className="sg-place-title"><span className="sg-place-type" style={{ color: categoryColors[selected.category] }}>{iconFor(selected.category, 13)}{selected.category}<span>{selected.municipality}</span></span><h2>{selected.name}</h2>{!panelOpen && <button className="sg-inline-link" onClick={() => setPanelOpen(true)}>Conocer este lugar<ArrowDown size={12} /></button>}</div>{panelOpen && <><div className="sg-place-preview">{inScene && preview ? <img src={preview} alt={`Vista de la maqueta desde ${selected.name}`} /> : selected.image ? <img src={selected.image} alt={selected.name} /> : <div className="sg-preview-placeholder">{iconFor(selected.category, 38)}<span>{inScene ? sceneAvailable ? 'Elige un punto de vista' : 'Plano interactivo del lugar' : 'Lugar de la región'}</span></div>}<span>{inScene ? sceneAvailable ? 'PREVISUALIZACIÓN DE LA MAQUETA 3D' : 'PLANO URBANO · VISTA 2D' : selected.image ? 'FOTOGRAFÍA DEL LUGAR' : 'FICHA DEL TERRITORIO'}</span></div><div className="sg-place-body"><p>{selected.summary}</p><div className="sg-place-highlights">{selected.highlights.slice(0, 3).map(h => <span key={h}><Check size={11} />{h}</span>)}</div>{inScene && sceneAvailable && <fieldset className="sg-viewpoints"><legend>Elige desde dónde mirar</legend>{([{ id: 'arrival', label: 'Llegada' }, { id: 'plaza', label: 'Entorno' }, { id: 'street', label: 'Calle' }] as const).map(v => <button type="button" className={viewpoint === v.id ? 'active' : ''} key={v.id} onClick={() => { setViewpoint(v.id); setPerspective('pov'); setFocusVersion(n => n + 1); setPreview('') }}><Eye size={12} />{v.label}</button>)}</fieldset>}{selected.locationNote && <p className="sg-location-note"><Info size={12} />{selected.locationNote}</p>}<a className="sg-source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.verification === 'OSM' ? 'Consultar datos cartográficos' : selected.verification === 'Documental' ? 'Consultar referencia documental' : 'Conocer su fuente oficial'}<ArrowUpRight size={12} /></a></div></>}<div className="sg-place-actions">{inScene && !sceneAvailable ? <a className="sg-primary" href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=18/${selected.lat}/${selected.lon}`} target="_blank" rel="noreferrer"><MapPin size={15} />Abrir ubicación</a> : inScene ? <button className="sg-primary" onClick={() => { if (pov) { setPerspective('overview'); setPanelOpen(true) } else { setPerspective('pov'); setFocusVersion(v => v + 1) } }}>{pov ? <ArrowLeft size={14} /> : <Eye size={15} />}{pov ? 'Volver a la vista general' : 'Explorar desde aquí'}</button> : selected.sceneId === 'xilitla-centro' ? <button className="sg-primary" onClick={() => { setScope('local'); setPerspective('pov'); setFocusVersion(v => v + 1) }}><Footprints size={15} />Entrar a la guía de Xilitla</button> : selected.websiteUrl ? <a className="sg-primary" href={selected.websiteUrl} target="_blank" rel="noreferrer">Consultar con el lugar<ArrowUpRight size={15} /></a> : <button className="sg-primary" onClick={() => notify('Puedes consultar la fuente documental en la ficha del lugar.')}><Info size={14} />Información del lugar</button>}<button className={`sg-save-place ${plan.includes(selected.id) ? 'saved' : ''}`} onClick={() => toggleSaved(selected)} aria-label={plan.includes(selected.id) ? 'Retirar lugar de mi guía' : 'Añadir lugar a mi guía'} title={plan.includes(selected.id) ? 'Guardado en tu guía' : 'Guardar en mi guía'}>{plan.includes(selected.id) ? <Check size={17} /> : <Bookmark size={17} />}</button></div></aside>

    {camera?.mode === 'flying' && inScene && <div className="sg-flight-status" role="status"><Navigation size={15} /><span>{perspective === 'pov' ? 'Entrando en tu punto de vista…' : 'Recuperando la vista general…'}</span></div>}
    {pov && <div className="sg-pov-bar"><button onClick={() => { setPerspective('overview'); setPanelOpen(true); setFocusVersion(v => v + 1) }}><ArrowLeft size={15} />Volver a Xilitla</button><span><Eye size={13} />VISTA A NIVEL DE CALLE · MAQUETA</span><button onClick={() => { if (focusView) { setFocusView(false); setPanelOpen(true) } else setPanelOpen(v => !v) }}><Info size={14} />{panelOpen && !focusView ? 'Ocultar ficha' : 'Ver ficha'}</button><button className="sg-focus-toggle" aria-pressed={focusView} onClick={() => setFocusView(v => !v)}><Maximize2 size={14} />{focusView ? 'Mostrar interfaz' : 'Despejar vista'}</button></div>}
    <button className="sg-mobile-tools-toggle" title="Ajustes de la escena" aria-label="Ajustes de la escena" aria-expanded={toolsOpen} onClick={() => setToolsOpen(v => !v)}>{toolsOpen ? <X size={18} /> : <Sun size={18} />}</button><div className={`sg-world-tools ${toolsOpen ? 'open' : ''}`}><button data-caption="Acercar" title="Acercar escena" aria-label="Acercar escena" onClick={() => setZoom(v => Math.min(1.6, v + .15))} disabled={zoom >= 1.6}><Plus size={16} /></button><button data-caption="Alejar" title="Alejar escena" aria-label="Alejar escena" onClick={() => setZoom(v => Math.max(.65, v - .15))} disabled={zoom <= .65}><Minus size={16} /></button><span /><button data-caption="Centrar" title="Restablecer vista de guía" aria-label="Restablecer vista de guía" onClick={() => { setPerspective('overview'); setZoom(1); setFocusVersion(v => v + 1) }}><Focus size={16} /></button><button data-caption="Luz" title="Alternar luz de día y atardecer" aria-label={timeOfDay === 'day' ? 'Atardecer en la guía' : 'Luz de día en la guía'} onClick={() => setTimeOfDay(v => v === 'day' ? 'sunset' : 'day')}>{timeOfDay === 'day' ? <Sun size={16} /> : <Sunset size={16} />}</button>{scope === 'local' && <button data-caption="Nombres" title="Mostrar nombres de lugares" aria-label="Mostrar nombres de lugares" aria-pressed={showLabels} onClick={() => setShowLabels(v => !v)}><MapPin size={16} /></button>}{scope === 'local' && <button data-caption="Calles" title="Resaltar calles y escalones" aria-label="Resaltar calles y escalones" aria-pressed={showPaths} onClick={() => setShowPaths(v => !v)}><Footprints size={16} /></button>}{document.fullscreenEnabled && <button className="sg-fullscreen-tool" title="Pantalla completa de guía" aria-label="Pantalla completa de guía" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void rootRef.current?.requestFullscreen().catch(() => notify('La pantalla completa no está disponible en esta vista.')) }}><Maximize2 size={16} /></button>}</div>
    {scope === 'local' && geometry && <div className="sg-minimap"><Suspense fallback={null}><GuideMiniMap geometry={geometry} places={localPlaces} selectedId={selectedId} camera={camera} onSelect={choose} /></Suspense></div>}
    {pov && <div className="sg-walk-pad" aria-label="Controles táctiles de caminata"><button aria-label="Caminar hacia adelante" onPointerDown={e => { e.preventDefault(); setWalk({ forward: 1, right: 0 }) }}><Navigation size={18} /></button><div><button aria-label="Caminar a la izquierda" onPointerDown={e => { e.preventDefault(); setWalk({ forward: 0, right: -1 }) }}><ArrowLeft size={18} /></button><span><Footprints size={15} /></span><button aria-label="Caminar a la derecha" onPointerDown={e => { e.preventDefault(); setWalk({ forward: 0, right: 1 }) }}><ArrowRight size={18} /></button></div><button aria-label="Caminar hacia atrás" onPointerDown={e => { e.preventDefault(); setWalk({ forward: -1, right: 0 }) }}><ArrowDown size={18} /></button></div>}
    <footer className="sg-statusbar"><button onClick={() => setInfoOpen(true)}><Info size={12} /><span>{scope === 'local' ? 'Huellas OSM · alturas y fachadas interpretativas' : 'Cartografía orientativa de la Huasteca'}</span></button><span>{pov ? 'ARRASTRA PARA MIRAR · WASD PARA CAMINAR · ESC PARA VOLVER' : 'ARRASTRA PARA EXPLORAR · ELIGE UN LUGAR PARA ENTRAR'}</span><button onClick={() => setInfoOpen(true)}>Fuentes y alcance<ArrowUpRight size={11} /></button></footer>
    <button className="sg-mobile-directory" onClick={() => { setDirectoryOpen(v => !v); setPanelOpen(false) }}><List size={17} />{directoryOpen ? 'Volver al paisaje' : `Explorar ${filtered.length} lugares`}<ChevronDown size={14} /></button>

    {planOpen && <GuideDialog title="Tu próxima historia en la Huasteca" onClose={() => setPlanOpen(false)}><div className="sg-plan-intro"><p>Una guía personal de lugares para descubrir, quedarte, comer y volver.</p><span>{plan.length} lugares guardados</span></div>{plan.length ? <ol className="sg-saved-list">{plan.map((id, index) => { const p = guidePlaces.find(place => place.id === id)!; return <li key={id}><span>{String(index + 1).padStart(2, '0')}</span><button onClick={() => { choose(id); setPlanOpen(false) }}><strong>{p.name}</strong><small>{p.category} · {p.municipality}</small></button><button className="sg-small-icon" onClick={() => savePlan(plan.filter(v => v !== id))} aria-label={`Quitar ${p.name} de mi guía`}><Trash2 size={15} /></button></li> })}</ol> : <div className="sg-plan-empty"><Bookmark size={30} /><h3>Los lugares hacen la historia.</h3><p>Explora el territorio y guarda los que quieres vivir.</p></div>}<div className="sg-plan-actions"><button className="sg-primary" disabled={!plan.length} onClick={shareGuide}><Share2 size={15} />Copiar enlace de mi guía</button><button className="sg-outline" disabled={!plan.length} onClick={downloadGuide}><Download size={15} />Descargar guía</button></div>{shareLink && <label className="sg-share-field">Tu enlace<input readOnly value={shareLink} onFocus={e => e.target.select()} /></label>}<p className="sg-plan-note">Tu selección se guarda en este navegador. El enlace comparte la lista de lugares; no crea una reserva ni confirma disponibilidad.</p></GuideDialog>}
    {infoOpen && <GuideDialog title="Una guía para entender el territorio" onClose={() => setInfoOpen(false)}><div className="sg-info-body"><p>Esta primera guía espacial conecta pueblos, plazas, alojamientos, cultura, comida, servicios y naturaleza. El centro de Xilitla es el primer entorno urbano explorado en 3D.</p><h3>Geografía y representación</h3><p>Calles, huellas y plaza proceden de OpenStreetMap. Las alturas, las fachadas y el mobiliario son interpretativos: la maqueta permite reconocer relaciones espaciales y explorar puntos de vista aproximados. No reproduce habitaciones, accesos verificados ni una ruta accesible.</p><p>Los puntos de llegada, entorno y calle pertenecen a esta representación. La previsualización se genera desde la misma cámara 3D. Los alojamientos mantienen sus fuentes propias; no se inventan habitaciones, inventario, precios ni reservas.</p><h3>Fuentes</h3><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL<ArrowUpRight size={13} /></a><p>La ficha de cada lugar enlaza su fuente oficial, documental o cartográfica. El mapa regional utiliza INEGI / Mapzen y NASA / Landsat, con altura visual exagerada.</p><h3>Cómo explorar</h3><p>Elige un lugar en la escena o el directorio. Entra a un punto de vista, arrastra para mirar y usa WASD o los controles táctiles para caminar. Escape o «Volver a Xilitla» recupera la vista general. La guía permite guardar lugares y compartir tu selección.</p></div></GuideDialog>}
    {notice && <div className="sg-toast" role="status"><Check size={15} />{notice}<button aria-label="Cerrar aviso de guía" onClick={() => setNotice('')}><X size={13} /></button></div>}
  </div>
}
