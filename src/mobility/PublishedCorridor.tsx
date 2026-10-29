import { useMemo, useState } from 'react'
import reference from './data/l1-published-reference.json'
import type { JourneyOption } from './journey'

const nameAliases: Record<string, string> = {
  'Tecnológico': 'Tecnológico Nacional de México', 'Plaza Nobel': 'Plaza Punto Novel',
  'CBTis': 'CBTIS', 'Mujeres en Solidaridad': 'Mujeres Solidaridad',
}
const indexFor = (name: string) => reference.orderedNames.indexOf(nameAliases[name] ?? name)

/** A named corridor diagram, never substituted for a street polyline or an operational direction. */
export default function PublishedCorridor({ plan, onChooseName, expanded = false }: { plan?: JourneyOption; onChooseName?: (name: string) => void; expanded?: boolean }) {
  const [showAll, setShowAll] = useState(expanded)
  const indices = useMemo(() => plan ? [indexFor(plan.boarding.name), indexFor(plan.alighting.name)] : [], [plan])
  const hasSegment = indices.length === 2 && indices.every(index => index >= 0)
  const start = hasSegment ? Math.min(...indices) : 0
  const end = hasSegment ? Math.max(...indices) : reference.orderedNames.length - 1
  const names = showAll || !hasSegment ? reference.orderedNames : reference.orderedNames.slice(start, end + 1)
  return <section className={`jr-corridor${expanded ? ' expanded' : ''}`} aria-label="Secuencia publicada de referencia de la Línea 1">
    <div className="jr-corridor-heading"><span className="jr-line-ticket">L1</span><div><span className="jr-kicker">ENTIENDE EL CORREDOR</span><h2>{hasSegment ? 'Referentes entre tus dos puntos' : 'Una línea, distintos momentos del día.'}</h2></div></div>
    <p className="jr-corridor-caption">Orden nominal publicado en septiembre de 2025. Es un esquema de referencia; no valida los sentidos, los puntos de abordaje ni la operación actual.</p>
    <ol className="jr-corridor-stops">{names.map(name => {
      const originalIndex = reference.orderedNames.indexOf(name)
      const boarding = Boolean(plan && originalIndex === indices[0])
      const alighting = Boolean(plan && originalIndex === indices[1])
      return <li key={name} className={`${boarding ? 'boarding' : ''}${alighting ? ' alighting' : ''}`}><span className="jr-corridor-node" /><span className="jr-corridor-number">{String(originalIndex + 1).padStart(2, '0')}</span>{onChooseName ? <button onClick={() => onChooseName(name)}>{name}</button> : <strong>{name}</strong>}{boarding && <small>Tu punto de subida a consultar</small>}{alighting && <small>Tu punto de bajada a consultar</small>}</li>
    })}</ol>
    {hasSegment && <button className="jr-text-button" onClick={() => setShowAll(value => !value)}>{showAll ? 'Ver sólo los referentes entre mis puntos' : 'Ver todos los nombres publicados'} <span aria-hidden="true">{showAll ? '−' : '+'}</span></button>}
    <details className="jr-corridor-source"><summary>Fuente, fecha y límites de esta referencia</summary><p>La nota anuncia 32 estaciones y enumera 19 nombres. Puede haber puntos omitidos o cambios posteriores. El orden inverso de regreso y los lados A/B no están validados. Algunos nombres requieren conciliación con el catálogo.</p><a href={reference.sourceUrl} target="_blank" rel="noreferrer noopener">Líder Empresarial · 09-09-2025 ↗</a></details>
  </section>
}
