import type { ApprovedSctSource } from './integration/sct'

/** Set only after reviewing SCT/operator permission and pinning the expected agency. */
export const approvedSctSource: ApprovedSctSource | undefined = undefined
/** OSM stop IDs are not yet mapped to an SCT-verified operational catalogue. */
export const verifiedSctStopIds: readonly string[] = []
