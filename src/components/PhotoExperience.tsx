import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, MapPin, Minus, Move, Plus, RotateCcw, X } from 'lucide-react'
import type { Destination } from '../data'
import type { DestinationStory } from '../experience-data'
import './PhotoExperience.css'

export interface PhotoExperienceProps {
  destination: Destination
  story: DestinationStory
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onAddToPackage: () => void
  stepIndex: number
  totalSteps: number
}

type Point = { x: number; y: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export default function PhotoExperience({ destination, story, onClose, onNext, onPrevious, onAddToPackage, stepIndex, totalSteps }: PhotoExperienceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onClose, onNext, onPrevious })
  callbacks.current = { onClose, onNext, onPrevious }
  const reducedMotion = useRef(false)
  const drag = useRef<{ pointer: number; start: Point; origin: Point } | null>(null)
  const [viewport, setViewport] = useState({ width: 1, height: 1 })
  const [naturalSize, setNaturalSize] = useState({ width: 4, height: 3 })
  const [loadedImage, setLoadedImage] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [parallax, setParallax] = useState<Point>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showHotspots, setShowHotspots] = useState(true)
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)
  const isLoaded = loadedImage === destination.image
  const availableWidth = Math.max(1, viewport.width - 40)
  const availableHeight = Math.max(1, viewport.height - 40)
  const imageRatio = naturalSize.width / naturalSize.height
  const fittedWidth = Math.min(availableWidth, availableHeight * imageRatio)
  const fittedHeight = fittedWidth / imageRatio

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => { reducedMotion.current = media.matches }
    updateMotion()
    media.addEventListener('change', updateMotion)
    return () => {
      if (dialog?.open) dialog.close()
      document.body.style.overflow = previousOverflow
      media.removeEventListener('change', updateMotion)
      requestAnimationFrame(() => {
        if (previousFocus?.isConnected && !document.querySelector('dialog:modal')) previousFocus.focus({ preventScroll: true })
      })
    }
  }, [])

  useLayoutEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setParallax({ x: 0, y: 0 })
    setActiveHotspot(null)
    drag.current = null
    setIsDragging(false)
    const dialog = dialogRef.current
    if (dialog?.open && !dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLButtonElement>('.photo-destination-nav button:not(:disabled), .photo-close')?.focus({ preventScroll: true })
    }
  }, [destination.id])

  const constrainedOffset = (next: Point, scale = zoom): Point => ({
    x: clamp(next.x, -Math.max(18, (fittedWidth * scale - viewport.width) / 2 + 24), Math.max(18, (fittedWidth * scale - viewport.width) / 2 + 24)),
    y: clamp(next.y, -Math.max(18, (fittedHeight * scale - viewport.height) / 2 + 24), Math.max(18, (fittedHeight * scale - viewport.height) / 2 + 24)),
  })

  const changeZoom = (amount: number) => {
    const nextZoom = clamp(Math.round((zoom + amount) * 10) / 10, 1, 1.8)
    setZoom(nextZoom)
    setParallax({ x: 0, y: 0 })
    setOffset(nextZoom === 1 ? { x: 0, y: 0 } : constrainedOffset(offset, nextZoom))
  }

  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setParallax({ x: 0, y: 0 })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || drag.current || (event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: offset }
    setParallax({ x: 0, y: 0 })
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (current?.pointer === event.pointerId) {
      setOffset(constrainedOffset({ x: current.origin.x + event.clientX - current.start.x, y: current.origin.y + event.clientY - current.start.y }))
      return
    }
    if (!current && zoom === 1 && event.pointerType === 'mouse' && !reducedMotion.current) {
      const box = event.currentTarget.getBoundingClientRect()
      setParallax({ x: ((event.clientX - box.left) / box.width - 0.5) * 12, y: ((event.clientY - box.top) / box.height - 0.5) * 8 })
    }
  }

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    setIsDragging(false)
  }

  const imageStyle = {
    width: fittedWidth,
    height: fittedHeight,
    transform: `translate(-50%, -50%) translate(${offset.x + parallax.x}px, ${offset.y + parallax.y}px) scale(${zoom})`,
    '--photo-zoom': zoom,
  } as CSSProperties

  return <dialog
    ref={dialogRef}
    className="photo-dialog"
    aria-labelledby="photo-destination-title"
    aria-describedby="photo-experience-description"
    onCancel={event => { event.preventDefault(); callbacks.current.onClose() }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || totalSteps < 2) return
      if (event.key === 'ArrowRight') { event.preventDefault(); callbacks.current.onNext() }
      if (event.key === 'ArrowLeft') { event.preventDefault(); callbacks.current.onPrevious() }
    }}
  >
    <div className="photo-shell">
      <header className="photo-header">
        <button className="photo-back" type="button" onClick={onClose}><ArrowLeft size={17} /><span>Volver al territorio</span></button>
        <div className="photo-brand">HUASTECA<span>INMERSIVA</span></div>
        <div className="photo-header-end"><span>Fotografía interactiva</span><button className="photo-icon-button photo-close" type="button" onClick={onClose} aria-label="Cerrar fotografía interactiva" autoFocus><X size={20} /></button></div>
      </header>

      <main className="photo-main">
        <section className="photo-visual" aria-label={`Fotografía interactiva de ${destination.name}`}>
          <div
            ref={viewportRef}
            className={`photo-viewport ${isDragging ? 'photo-is-dragging' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            onLostPointerCapture={() => { drag.current = null; setIsDragging(false) }}
            onPointerLeave={() => { if (!drag.current) setParallax({ x: 0, y: 0 }) }}
          >
            <div className="photo-ambient" style={{ backgroundImage: `url("${destination.image}")` }} aria-hidden="true" />
            <div className="photo-ambient-shade" aria-hidden="true" />
            <div className="photo-frame-label"><span />VENTANA AL DESTINO</div>
            {!isLoaded && <p className="photo-loading" role="status">Abriendo una ventana a {destination.shortName}…</p>}

            <div key={destination.id} className={`photo-transform ${isLoaded ? 'photo-is-loaded' : ''}`} style={imageStyle}>
              <img
                className="photo-main-image"
                src={destination.image}
                alt={`${destination.name}, ${destination.municipality}, Huasteca Potosina`}
                draggable={false}
                onLoad={event => {
                  setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
                  setLoadedImage(destination.image)
                }}
              />
              {showHotspots && isLoaded && story.hotspots.map((hotspot, index) => <div
                key={hotspot.id}
                className={`photo-hotspot-anchor ${activeHotspot === hotspot.id ? 'photo-hotspot-active' : ''} ${hotspot.x > 0.52 ? 'photo-popover-left' : ''} ${hotspot.y > 0.5 ? 'photo-popover-above' : ''}`}
                style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
              >
                <button className="photo-hotspot" type="button" aria-label={`Descubrir ${hotspot.label}`} aria-expanded={activeHotspot === hotspot.id} aria-controls={`photo-detail-${hotspot.id}`} onClick={() => setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id)}><span>{String(index + 1).padStart(2, '0')}</span></button>
                {activeHotspot !== hotspot.id && <span className="photo-hotspot-hint" aria-hidden="true">{hotspot.label}</span>}
                {activeHotspot === hotspot.id && <div id={`photo-detail-${hotspot.id}`} className="photo-hotspot-popover" role="region" aria-label={hotspot.label}>
                  <div><strong>{hotspot.label}</strong><button type="button" aria-label={`Cerrar detalle ${hotspot.label}`} onClick={() => setActiveHotspot(null)}><X size={13} /></button></div>
                  <p>{hotspot.text}</p>
                </div>}
              </div>)}
            </div>

            <div className="photo-view-controls" role="group" aria-label="Controles de la fotografía">
              <button className="photo-icon-button" type="button" onClick={() => { setShowHotspots(!showHotspots); setActiveHotspot(null) }} aria-label={showHotspots ? 'Ocultar puntos de interés' : 'Mostrar puntos de interés'} aria-pressed={showHotspots}>{showHotspots ? <Eye size={17} /> : <EyeOff size={17} />}</button>
              <span className="photo-control-divider" />
              <button className="photo-icon-button" type="button" disabled={zoom <= 1} onClick={() => changeZoom(-0.2)} aria-label="Alejar fotografía"><Minus size={17} /></button>
              <output className="photo-zoom-value" aria-label="Nivel de acercamiento">{Math.round(zoom * 100)}%</output>
              <button className="photo-icon-button" type="button" disabled={zoom >= 1.8} onClick={() => changeZoom(0.2)} aria-label="Acercar fotografía"><Plus size={17} /></button>
              <span className="photo-control-divider" />
              <button className="photo-icon-button" type="button" onClick={resetView} aria-label="Restablecer encuadre"><RotateCcw size={16} /></button>
            </div>
          </div>

          <footer className="photo-viewer-footer">
            <span className="photo-gesture-hint"><Move size={14} />Arrastra para explorar el encuadre</span>
            <nav className="photo-destination-nav" aria-label="Recorrer destinos">
              <button className="photo-icon-button" type="button" disabled={totalSteps < 2} onClick={onPrevious} aria-label="Ver destino anterior"><ArrowLeft size={18} /></button>
              <span className="photo-step-number" aria-live="polite">{String(stepIndex + 1).padStart(2, '0')}<span>/</span>{String(totalSteps).padStart(2, '0')}</span>
              <button className="photo-icon-button" type="button" disabled={totalSteps < 2} onClick={onNext} aria-label="Ver destino siguiente"><ArrowRight size={18} /></button>
            </nav>
          </footer>
        </section>

        <aside className="photo-story" key={destination.id}>
          <div className="photo-story-content">
            <span className="photo-kicker"><MapPin size={12} />{destination.municipality} · San Luis Potosí</span>
            <h1 id="photo-destination-title">{destination.name}</h1>
            <span className="photo-destination-category">{destination.category}</span>
            <div className="photo-story-rule" />
            <span className="photo-small-label">EL LUGAR, DE CERCA</span>
            <h2>{story.headline}</h2>
            <p id="photo-experience-description" className="photo-story-body">{story.body}</p>
            <ul className="photo-highlights">{story.highlights.map(highlight => <li key={highlight}><span />{highlight}</li>)}</ul>
            <div className="photo-discovery-note"><span className="photo-discovery-dot">+</span><p>Hay detalles que merecen una pausa.<br /><strong>Toca los puntos sobre la fotografía.</strong></p></div>
          </div>
          <div className="photo-story-actions">
            <button className="photo-add-button" type="button" onClick={onAddToPackage}><Plus size={17} />Crear paquete con este lugar<ArrowRight size={17} /></button>
            <button className="photo-territory-button" type="button" onClick={onClose}>Volver al territorio</button>
            <span className="photo-authentic-note">Paisaje real · Fotografía con puntos de interés</span>
          </div>
        </aside>
      </main>
    </div>
  </dialog>
}
