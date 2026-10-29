export type JourneyCoordinates = readonly [longitude: number, latitude: number]
export type JourneyProvenanceKind = 'community-cartography' | 'official-catalogue' | 'device-location' | 'manual-pin'

export interface JourneyPlace {
  readonly id: string
  readonly name: string
  readonly coordinates: JourneyCoordinates
  readonly provenance: {
    readonly kind: JourneyProvenanceKind
    readonly sourceUrl?: string
    readonly capturedAt?: number
  }
}

/** Structurally compatible with the current TransitStop; no direction inferred. */
export interface JourneyStop {
  readonly id: string
  readonly name: string
  readonly coordinates: JourneyCoordinates
  readonly sourceUrl: string
  readonly verification: string
}

/** Curated deployment input, not proof acquired by reading a JSON flag. */
export interface VerifiedJourneyRoute {
  readonly lineId: string
  readonly sourceUrl: string
  readonly verifiedAt: string
  readonly validUntil?: string
  readonly directions: readonly {
    readonly id: string
    readonly headsign: string
    readonly stopIds: readonly string[]
  }[]
}

export interface JourneyOption {
  readonly id: string
  readonly lineId: string
  readonly originId: string | null
  readonly destinationId: string | null
  readonly boarding: JourneyStop
  readonly alighting: JourneyStop
  /** Geographic distances only, not walking paths, duration or bus distance. */
  readonly originDistanceMeters: number | null
  readonly destinationDistanceMeters: number | null
  readonly totalAccessMeters: number | null
  readonly connection: 'unverified' | 'verified'
  readonly confidence: 'cartographic-only' | 'route-verified'
  readonly directionId?: string
  readonly headsign?: string
  readonly routeSourceUrl?: string
  /** Published reference only: these fields never upgrade connection/confidence. */
  readonly referenceStops?: readonly string[]
  readonly referencePublishedAt?: string
  readonly requirements: readonly string[]
}

export interface JourneyPlanningInput {
  readonly origin: JourneyPlace
  readonly destination: JourneyPlace
  readonly stops: readonly JourneyStop[]
  readonly lineId?: string
  readonly verifiedRoute?: VerifiedJourneyRoute
  readonly limit?: number
  readonly now?: number
}

export type JourneyPhase = 'choosing' | 'prepared' | 'to-board' | 'aboard' | 'approaching' | 'last-leg' | 'finished'

export interface JourneyState {
  readonly phase: JourneyPhase
  readonly leg: 'outbound' | 'return'
  readonly origin: JourneyPlace | null
  readonly destination: JourneyPlace | null
  readonly selectedPlan: JourneyOption | null
  readonly originRequiresRefresh: boolean
  readonly destinationRequiresRefresh: boolean
  readonly confirmation: {
    readonly pointConfirmed: boolean
    readonly destinationConfirmed: boolean
  }
}

export type JourneyAction =
  | { readonly type: 'SET_ORIGIN'; readonly place: JourneyPlace | null }
  | { readonly type: 'SET_DESTINATION'; readonly place: JourneyPlace | null }
  | { readonly type: 'SELECT_PLAN'; readonly plan: JourneyOption }
  | { readonly type: 'START' }
  | { readonly type: 'CONFIRM_BOARDING'; readonly pointConfirmed: boolean; readonly destinationConfirmed: boolean }
  | { readonly type: 'BOARD' }
  | { readonly type: 'APPROACH' }
  | { readonly type: 'ALIGHT' }
  | { readonly type: 'FINISH' }
  | { readonly type: 'PREPARE_RETURN' }
  | { readonly type: 'RESET' }

export interface JourneyCatalogue {
  readonly places: readonly JourneyPlace[]
  readonly stops: readonly JourneyStop[]
  readonly lineId?: string
  readonly verifiedRoute?: VerifiedJourneyRoute
}

export interface JourneyStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/** IDs and manual progress only; returned for an explicit resume decision. */
export interface JourneyResumeCandidate {
  readonly schemaVersion: 1
  readonly lineId: string
  readonly originId: string | null
  readonly destinationId: string | null
  readonly boardingId: string
  readonly alightingId: string
  readonly phase: 'prepared' | 'to-board' | 'aboard' | 'approaching' | 'last-leg'
  readonly leg: 'outbound' | 'return'
  readonly savedAt: number
  readonly originRequiresRefresh: boolean
  readonly destinationRequiresRefresh: boolean
}
