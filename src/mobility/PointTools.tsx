import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Copy, Download, MessageSquareText, PencilLine, X } from 'lucide-react'
import type { TransitStop } from './types'
import { buildPointCard, cleanPointNote, operatorQuestion } from './travel-tools'
import type { TravelIntent } from './travel-tools'

interface Props {
  stop: TransitStop
  pointLabel: string
  note: string
  onNote: (value: string) => void
  copyText: (value: string, confirmation: string) => Promise<void>
}

export default function PointTools({ stop, pointLabel, note, onNote, copyText }: Props) {
  const [draft, setDraft] = useState(note)
  const [showQuestion, setShowQuestion] = useState(false)
  const guideUrl = new URL(`?punto=${encodeURIComponent(stop.id)}`, location.href).href
  const cardText = () => buildPointCard(stop, pointLabel, guideUrl)
  useEffect(() => { setDraft(note) }, [stop.id, note])

  function downloadCard() {
    const url = URL.createObjectURL(new Blob([cardText()], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `MiRedMetro-${stop.id}.txt`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="point-tools">
    <button className="button ask-operator" onClick={() => setShowQuestion(true)}><MessageSquareText size={17} /> Preguntar al operador <ArrowRight size={16} /></button>
    <details className="point-tool-details"><summary><Copy size={15} /> Llevar esta referencia conmigo</summary><p>Copia o descarga una ficha de texto con el lugar, la fuente y lo que falta confirmar. No incluye tu ubicación ni tu nota privada.</p><div className="point-tool-actions"><button className="button secondary" onClick={() => { void copyText(cardText(), 'Ficha copiada con fuente y enlace. Tu nota privada no se compartió.') }}><Copy size={15} /> Copiar ficha</button><button className="button secondary" onClick={downloadCard}><Download size={15} /> Descargar TXT</button></div></details>
    <details className="point-tool-details"><summary><PencilLine size={15} /> Mi referencia personal{note && <span>Guardada</span>}</summary><label htmlFor="point-note">Una pista para reconocer este punto</label><input id="point-note" value={draft} onChange={event => setDraft(event.target.value)} maxLength={140} placeholder="Ej. junto al quiosco. Evita datos personales." /><p>Sólo en este dispositivo. Es una nota tuya, no una validación del paradero.</p><button className="button secondary" onClick={() => onNote(cleanPointNote(draft))}>{note ? 'Actualizar nota' : 'Guardar nota'}</button></details>
    {showQuestion && <OperatorQuestion stop={stop} onClose={() => setShowQuestion(false)} />}
  </div>
}

function OperatorQuestion({ stop, onClose }: { stop: TransitStop; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [intent, setIntent] = useState<TravelIntent | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal()
    return () => { dialog.current?.close(); previousFocus.current?.focus() }
  }, [])
  useEffect(() => { heading.current?.focus() }, [intent])
  return <dialog className="operator-dialog" ref={dialog} aria-labelledby="operator-title" onCancel={onClose} onClose={onClose}>
    <div className="operator-dialog-top"><span>MiRedMetro · Consulta en persona</span><button className="icon-button" onClick={onClose} aria-label="Cerrar consulta al operador"><X size={21} /></button></div>
    {!intent ? <><span className="eyebrow">ELIGE QUÉ NECESITAS CONFIRMAR</span><h2 id="operator-title" ref={heading} tabIndex={-1}>¿Cómo usarás este punto?</h2><p className="operator-intro">{stop.name}. Prepararemos una pregunta para mostrar o leer al operador.</p><div className="intent-options"><button onClick={() => setIntent('board')}><strong>Quiero subir aquí</strong><span>Confirmar dónde abordar y el destino.</span><ArrowRight size={19} /></button><button onClick={() => setIntent('arrive')}><strong>Quiero llegar aquí</strong><span>Preguntar si pasa y dónde bajar.</span><ArrowRight size={19} /></button><button onClick={() => setIntent('return')}><strong>Necesito regresar desde aquí</strong><span>Consultar el punto y la última salida.</span><ArrowRight size={19} /></button></div></> : <><span className="eyebrow">PUEDES MOSTRAR ESTA PANTALLA</span><h2 id="operator-title" ref={heading} tabIndex={-1}>{operatorQuestion(stop.name, intent)}</h2><p className="operator-caveat">Es una pregunta para confirmar el viaje, no un itinerario. El servicio y el sentido de este punto del mapa siguen por verificar.</p><button className="button secondary" onClick={() => setIntent(null)}><ArrowLeft size={16} /> Cambiar mi consulta</button></>}
    <div className="operator-dialog-footer">Guía independiente · Línea 1 Universitaria · Ciudad Valles</div>
  </dialog>
}
