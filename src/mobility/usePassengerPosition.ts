import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserLocation } from './types'

/** Latest explicit request wins; cancellation never leaves its caller waiting. */
export function createPassengerRequestGate() {
  let generation = 0
  let pending: { id: number; resolve: (value: UserLocation | null) => void } | null = null
  const cancel = () => {
    generation++
    const previous = pending
    pending = null
    previous?.resolve(null)
  }
  return {
    begin(resolve: (value: UserLocation | null) => void) {
      cancel()
      const id = ++generation
      pending = { id, resolve }
      return id
    },
    isCurrent(id: number) { return pending?.id === id && generation === id },
    finish(id: number, value: UserLocation | null) {
      if (pending?.id !== id || generation !== id) return false
      const current = pending
      pending = null
      current.resolve(value)
      return true
    },
    cancel,
  }
}

export function usePassengerPosition() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [following, setFollowing] = useState(false)
  const [age, setAge] = useState(0)
  const mounted = useRef(false)
  const watch = useRef<number | null>(null)
  const [requestGate] = useState(createPassengerRequestGate)
  const watchGeneration = useRef(0)

  const cancelRequest = useCallback(() => {
    requestGate.cancel()
    if (mounted.current) {
      setLoading(false)
      setMessage(current => current === 'Obteniendo tu ubicación…' ? '' : current)
    }
  }, [requestGate])

  const stopFollowing = useCallback(() => {
    watchGeneration.current++
    if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current)
    watch.current = null
    if (mounted.current) setFollowing(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    // A recreated effect (including StrictMode) starts without a stale watch.
    setFollowing(false)
    setLoading(false)
    const pause = () => {
      if (document.visibilityState === 'hidden') {
        cancelRequest()
        if (watch.current !== null) {
          stopFollowing()
          setMessage('Seguimiento en pausa. Al volver, actívalo si deseas actualizar tu posición.')
        }
      }
    }
    document.addEventListener('visibilitychange', pause)
    return () => { mounted.current = false; requestGate.cancel(); stopFollowing(); document.removeEventListener('visibilitychange', pause) }
  }, [cancelRequest, requestGate, stopFollowing])

  const accept = useCallback((position: GeolocationPosition): UserLocation | null => {
    const { longitude, latitude, accuracy } = position.coords
    const ageMs = Date.now() - position.timestamp
    if (![longitude, latitude, accuracy, position.timestamp].every(Number.isFinite) || accuracy < 0 || accuracy > 500 || ageMs < -30_000 || ageMs > 120_000) {
      setMessage('La ubicación no es suficientemente reciente o precisa. Actualiza o elige un lugar.'); setLocation(null); return null
    }
    if (longitude < -99.11 || longitude > -98.91 || latitude < 21.87 || latitude > 22.12) {
      setMessage('Estás fuera de la zona urbana de Valles. Elige un lugar de salida para explorar.'); setLocation(null); return null
    }
    const result = { longitude, latitude, accuracy, capturedAt: position.timestamp }
    setLocation(result); setAge(0); setMessage(`Tu ubicación · precisión aproximada ±${Math.round(accuracy)} m. No es la posición de una unidad.`)
    return result
  }, [])

  const request = useCallback((): Promise<UserLocation | null> => new Promise(resolve => {
    if (!mounted.current) { resolve(null); return }
    cancelRequest()
    if (!navigator.geolocation) { setMessage('Tu navegador no dispone de ubicación. Elige un lugar de salida.'); resolve(null); return }
    const id = requestGate.begin(resolve)
    setLoading(true); setMessage('Obteniendo tu ubicación…')
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (!mounted.current || !requestGate.isCurrent(id)) return
        setLoading(false); requestGate.finish(id, accept(position))
      }, error => {
        if (!mounted.current || !requestGate.isCurrent(id)) return
        setLoading(false); setLocation(null)
        setMessage(error.code === 1 ? 'Ubicación no autorizada. Puedes elegir tu salida por nombre.' : 'No pudimos obtener tu ubicación. Elige tu salida por nombre o intenta otra vez.')
        requestGate.finish(id, null)
      }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 })
    } catch {
      if (requestGate.isCurrent(id)) {
        setLoading(false); setMessage('No pudimos iniciar la ubicación. Elige tu salida por nombre o intenta otra vez.')
        requestGate.finish(id, null)
      }
    }
  }), [accept, cancelRequest, requestGate])

  const startFollowing = useCallback(() => {
    if (!mounted.current || !navigator.geolocation || watch.current !== null || document.visibilityState === 'hidden') return
    cancelRequest()
    const generation = ++watchGeneration.current
    try {
      const nextWatch = navigator.geolocation.watchPosition(position => {
        if (mounted.current && generation === watchGeneration.current) accept(position)
      }, () => {
        if (mounted.current && generation === watchGeneration.current) { stopFollowing(); setMessage('Se pausó la ubicación. El viaje sigue disponible y puedes actualizar manualmente.') }
      }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
      if (generation !== watchGeneration.current) { navigator.geolocation.clearWatch(nextWatch); return }
      watch.current = nextWatch
      setFollowing(true)
    } catch {
      stopFollowing(); setMessage('No pudimos iniciar el seguimiento. El viaje sigue disponible sin ubicación.')
    }
  }, [accept, cancelRequest, stopFollowing])

  useEffect(() => {
    if (!location) return
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - location.capturedAt) / 1000))
      setAge(seconds)
      if (seconds > 120) { setLocation(null); setMessage('Actualiza tu ubicación: la última captura tiene más de dos minutos.') }
    }
    update(); const timer = window.setInterval(update, 10_000)
    return () => window.clearInterval(timer)
  }, [location])
  return { location, message, loading, following, age, request, cancelRequest, startFollowing, stopFollowing }
}
