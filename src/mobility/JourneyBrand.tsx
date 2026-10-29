export function JourneyMark({ compact = false }: { compact?: boolean }) {
  return <span className={`jr-wordmark${compact ? ' compact' : ''}`}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 37V13a5 5 0 0 1 9-3l7 12 7-12a5 5 0 0 1 9 3v24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /><circle cx="8" cy="37" r="4" /><circle cx="24" cy="22" r="3.5" /><circle cx="40" cy="37" r="4" /></svg>{!compact && <span>mi<span className="jr-brand-light">red</span>metro<small>CIUDAD VALLES</small></span>}</span>
}

export function JourneyArrow({ direction = 'right' }: { direction?: 'right' | 'left' | 'up' }) {
  return <svg className={`jr-arrow ${direction}`} viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 14h19M15 5l9 9-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" /></svg>
}

export function JourneyLine({ className = '' }: { className?: string }) {
  return <svg className={`jr-line-art ${className}`} viewBox="0 0 400 100" fill="none" aria-hidden="true"><path d="M-10 77h81c25 0 24-51 49-51h58c21 0 25 51 48 51h52c22 0 27-51 50-51h83" stroke="currentColor" strokeWidth="2" /><path d="M-10 86h85c25 0 24-51 49-51h50c21 0 25 51 48 51h60c22 0 27-51 50-51h79" stroke="currentColor" strokeOpacity=".3" strokeWidth="1" />{[71,178,278,328].map((x, index) => <circle key={x} cx={x} cy={index === 0 || index === 2 ? 77 : 26} r="5" fill="var(--jr-paper)" stroke="currentColor" strokeWidth="2" />)}</svg>
}
