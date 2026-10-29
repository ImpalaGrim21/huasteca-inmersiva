import { useSyncExternalStore } from 'react'

export interface OfflineGuideState {
  readonly phase: 'unsupported' | 'preparing' | 'ready' | 'update-available' | 'unavailable'
  readonly ready: boolean
  readonly updateAvailable: boolean
  readonly version?: string
  readonly files?: number
  readonly bytes?: number
}

const initial: OfflineGuideState = Object.freeze({ phase: 'unsupported', ready: false, updateAvailable: false })
let state = initial
let registrationPromise: Promise<void> | undefined
let guideRegistration: ServiceWorkerRegistration | undefined
let updatePromise: Promise<OfflineGuideUpdateResult> | undefined
let reloadRequested = false
const listeners = new Set<() => void>()
const publish = (next: OfflineGuideState) => { state = Object.freeze(next); for (const listener of listeners) listener() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getOfflineGuideState = (): OfflineGuideState => state
export const useOfflineGuideStatus = (): OfflineGuideState => useSyncExternalStore(subscribe, getOfflineGuideState, () => initial)
export const useOfflineGuideReady = (): boolean => useOfflineGuideStatus().ready
export type OfflineGuideUpdateResult = 'updated' | 'other-tabs-open' | 'unavailable'

interface WorkerStatus {
  readonly type: 'OFFLINE_STATUS'
  readonly version: string
  readonly complete: boolean
  readonly files: number
  readonly bytes: number
}

function requestStatus(worker: ServiceWorker): Promise<WorkerStatus | undefined> {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => { channel.port1.close(); resolve(undefined) }, 4000)
    channel.port1.onmessage = event => {
      clearTimeout(timeout)
      channel.port1.close()
      const result: unknown = event.data
      if (typeof result !== 'object' || result === null) { resolve(undefined); return }
      const value = result as Partial<WorkerStatus>
      resolve(value.type === 'OFFLINE_STATUS' && typeof value.version === 'string' && /^[a-f0-9]{20}$/.test(value.version) && typeof value.complete === 'boolean' && Number.isSafeInteger(value.files) && Number.isSafeInteger(value.bytes) ? value as WorkerStatus : undefined)
    }
    try { worker.postMessage({ type: 'GET_OFFLINE_STATUS' }, [channel.port2]) }
    catch { clearTimeout(timeout); channel.port1.close(); resolve(undefined) }
  })
}

/** One registration; cached bytes and version are determined only by the build. */
export function registerOfflineGuide(): Promise<void> {
  if (registrationPromise) return registrationPromise
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return Promise.resolve()
  publish({ phase: 'preparing', ready: false, updateAvailable: false })
  registrationPromise = (async () => {
    try {
      const scope = new URL(`${import.meta.env.BASE_URL}movilidad/`, location.origin)
      const registration = await navigator.serviceWorker.register(new URL('sw.js', scope), { scope: scope.pathname, updateViaCache: 'none' })
      guideRegistration = registration
      const sync = async () => {
        const worker = navigator.serviceWorker.controller
        const result = worker ? await requestStatus(worker) : undefined
        const documentVersion = document.querySelector<HTMLMetaElement>('meta[name="valles-offline-version"]')?.content
        const ready = Boolean(result?.complete && result.version === documentVersion)
        const updateAvailable = Boolean(registration.waiting)
        publish({
          phase: updateAvailable ? 'update-available' : ready ? 'ready' : registration.installing ? 'preparing' : 'unavailable',
          ready, updateAvailable,
          ...(result ? { version: result.version, files: result.files, bytes: result.bytes } : {}),
        })
      }
      const watchInstalling = () => { registration.installing?.addEventListener('statechange', () => { void sync() }); void sync() }
      registration.addEventListener('updatefound', watchInstalling)
      navigator.serviceWorker.addEventListener('controllerchange', () => { void sync() })
      watchInstalling()
      // First installation claims this document only after the complete batch.
      await navigator.serviceWorker.ready
      await sync()
    } catch { publish({ phase: 'unavailable', ready: false, updateAvailable: false }) }
  })()
  return registrationPromise
}

/** Explicit passenger action only; installing an update never invokes this. */
export function applyOfflineGuideUpdate(): Promise<OfflineGuideUpdateResult> {
  if (reloadRequested) return Promise.resolve('updated')
  if (updatePromise) return updatePromise
  updatePromise = activateOfflineGuideUpdate().catch(() => 'unavailable' as const).finally(() => { updatePromise = undefined })
  return updatePromise
}

async function activateOfflineGuideUpdate(): Promise<OfflineGuideUpdateResult> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return 'unavailable'
  const scope = new URL(`${import.meta.env.BASE_URL}movilidad/`, location.origin)
  const registration = guideRegistration ?? await navigator.serviceWorker.getRegistration(scope.href)
  if (!registration || registration.scope !== scope.href) return 'unavailable'
  const waiting = registration.waiting
  if (!waiting || waiting.state !== 'installed') return 'unavailable'
  const expected = await requestStatus(waiting)
  if (!expected?.complete) return 'unavailable'
  const previousController = navigator.serviceWorker.controller

  return new Promise<OfflineGuideUpdateResult>(resolve => {
    const channel = new MessageChannel()
    let accepted = false
    let settled = false
    let checking = false
    const finish = (result: OfflineGuideUpdateResult) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      channel.port1.close()
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged)
      waiting.removeEventListener('statechange', controllerChanged)
      resolve(result)
    }
    const checkController = async () => {
      const controller = navigator.serviceWorker.controller
      if (!accepted || settled || checking || !controller || controller === previousController || controller.state !== 'activated') return
      checking = true
      const result = await requestStatus(controller)
      checking = false
      if (settled || navigator.serviceWorker.controller !== controller) return
      if (result?.complete && result.version === expected.version) {
        reloadRequested = true
        finish('updated')
        // The old document reloads only after the accepted complete release
        // controls it. Repeated clicks and duplicate events share this guard.
        window.location.reload()
      }
    }
    const controllerChanged = () => { void checkController() }
    const timeout = window.setTimeout(() => { finish('unavailable') }, 15_000)
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
    waiting.addEventListener('statechange', controllerChanged)
    channel.port1.onmessage = event => {
      const value: unknown = event.data
      if (typeof value !== 'object' || value === null) { finish('unavailable'); return }
      const response = value as { type?: unknown; result?: unknown; version?: unknown }
      if (response.type !== 'OFFLINE_UPDATE_RESULT' || response.version !== expected.version) { finish('unavailable'); return }
      if (response.result === 'other-tabs-open') { finish('other-tabs-open'); return }
      if (response.result !== 'updated') { finish('unavailable'); return }
      accepted = true
      void checkController()
    }
    try { waiting.postMessage({ type: 'ACTIVATE_OFFLINE_UPDATE' }, [channel.port2]) }
    catch { finish('unavailable') }
  })
}

/** Compatibility for TransitMap: build-time precaching replaced URL discovery. */
export async function cacheGuideResources(_extraUrls: readonly string[] = []): Promise<void> {
  // Intentionally no request, postMessage, performance scan or cache mutation.
}
