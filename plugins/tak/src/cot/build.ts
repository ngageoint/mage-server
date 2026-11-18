import XMLBuilder from 'fast-xml-builder'
import { Point } from 'geojson'
import { Observation } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'

/**
 * How long a pushed CoT marker stays valid on TAK clients before it's
 * considered stale. Fixed for now; could become admin-configurable later.
 */
const STALE_TTL_MS = 60 * 60 * 1000

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export interface BuiltCotEvent {
  uid: string
  xml: string
  callsign: string
}

/**
 * Builds a CoT XML `<event>` document for the given MAGE observation, for
 * writing to a TAK server. Returns null if the observation's geometry isn't
 * a Point - CoT events are fundamentally point-based, so non-Point
 * observations aren't eligible to push.
 *
 * Returns the event's `uid` alongside the XML so callers (the push
 * controller's tracking store) don't need their own copy of the
 * `MAGE-<id>` naming convention to know what they just sent.
 *
 * Uses the observation's first form entry for the callsign, since a marker
 * needs a single label - but flattens every form entry's fields into
 * remarks, since that's free text with no reason to drop data from entries
 * after the first.
 */
export function buildCotEventXml(observation: Observation, eventName: string): BuiltCotEvent | null {
  if (observation.geometry.type !== 'Point') {
    return null
  }
  const [ lon, lat ] = (observation.geometry as Point).coordinates
  const uid = `MAGE-${observation.id}`
  const formEntry = observation.formEntries[0]
  const form = formEntry ? observation.mageEvent.formFor(formEntry.formId) : null
  const callsignField = form?.primaryFeedField
  const callsignValue = callsignField ? formEntry?.[callsignField] : undefined
  const callsign = callsignValue != null && callsignValue !== '' ? String(callsignValue) : observation.id
  const formFields = observation.formEntries.flatMap(entry =>
    Object.entries(entry)
      .filter(([ key ]) => key !== 'id' && key !== 'formId')
      .map(([ key, value ]) => `${key}: ${value}`)
  )
  // Multiple MAGE events can push to the same TAK server - without this, a
  // TAK operator has no way to tell which event a marker came from.
  const remarks = [ `MAGE event: ${eventName}`, ...formFields ].join('\n')
  const now = new Date()
  const stale = new Date(now.getTime() + STALE_TTL_MS)

  const xml = builder.build({
    event: {
      '@_version': '2.0',
      '@_uid': uid,
      '@_type': 'b-m-p-s-m',
      '@_how': 'h-g-i-g-o',
      '@_time': now.toISOString(),
      '@_start': now.toISOString(),
      '@_stale': stale.toISOString(),
      point: {
        '@_lat': lat,
        '@_lon': lon,
        '@_hae': 0,
        '@_ce': 9999999,
        '@_le': 9999999
      },
      detail: {
        // Required for OpenTAKServer to treat this connection's uid as a
        // known device (EUD) - without a <takv> + <contact callsign> pair,
        // the event is accepted and routed in memory but fails to persist
        // (foreign key violation: sender_uid not in euds). Confirmed via a
        // live smoke test against a real OpenTAKServer instance.
        takv: { '@_device': 'MAGE', '@_platform': 'MAGE', '@_os': '', '@_version': '1.0.0' },
        contact: { '@_callsign': callsign },
        remarks
      }
    }
  })

  return { uid, xml, callsign }
}
