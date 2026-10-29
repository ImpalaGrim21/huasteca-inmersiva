import outward from './assets/valles-movimiento-small.webp'
import aboard from './assets/valles-viaje.webp'
import returning from './assets/valles-regreso.webp'

export function JourneyArt({ moment, className = '' }: { moment: 'prepare' | 'ride' | 'return' | 'network' | 'help'; className?: string }) {
  const source = moment === 'return' || moment === 'help' ? returning : moment === 'ride' ? aboard : outward
  return <figure className={`jr-editorial-art art-${moment} ${className}`} aria-label="Arte editorial de MiRedMetro"><img src={source} alt="Ilustración original inspirada en la movilidad cotidiana de Valles; no representa un punto de abordaje real." loading="lazy" /><figcaption>VALLES / DE IDA Y VUELTA</figcaption></figure>
}
