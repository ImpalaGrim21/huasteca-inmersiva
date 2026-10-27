import type { GuideGeometry, GuidePlace } from '../guide-data'

export interface GuideCameraState {
  position: [number, number, number]
  target: [number, number, number]
  yaw: number
  mode: 'orbit' | 'flying' | 'pov'
  fov: number
}

export type GuideViewpoint = 'arrival' | 'plaza' | 'street'

export interface CitySceneProps {
  geometry: GuideGeometry | null
  places: GuidePlace[]
  visibleIds?: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  perspective: 'overview' | 'pov'
  viewpoint: GuideViewpoint
  focusVersion: number
  onCameraChange: (state: GuideCameraState) => void
  onPreview: (imageUrl: string) => void
  onAvailabilityChange?: (available: boolean) => void
  getLabelObstacles?: () => { left: number; top: number; right: number; bottom: number }[]
  labelLayoutKey?: string
  timeOfDay: 'day' | 'sunset'
  showLabels: boolean
  showPaths: boolean
  zoom: number
  walkInput: { forward: number; right: number }
}
