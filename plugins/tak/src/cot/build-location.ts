import XMLBuilder from 'fast-xml-builder'
import { UserLocation } from '../entities/user-location'

/**
 * A live position report goes stale much faster than an observation marker -
 * much shorter TTL than build.ts's STALE_TTL_MS.
 */
const STALE_TTL_MS = 5 * 60 * 1000

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export interface BuiltLocationCotEvent {
  uid: string
  xml: string
}

/**
 * Builds a CoT XML `<event>` document for a MAGE user's reported location,
 * for writing to a TAK server as a live unit position (`a-*`), not an
 * observation marker (`b-*`). Unlike `buildCotEventXml`, there's no
 * geometry-type guard - `UserLocation.geometry` is always a Point - and no
 * form/callsign ambiguity, since the caller already resolved the user's
 * display name.
 */
export function buildLocationCotEventXml(location: UserLocation, callsign: string, eventName: string): BuiltLocationCotEvent {
  const [ lon, lat ] = location.geometry.coordinates
  const uid = `MAGE-user-${location.userId}`
  const now = new Date()
  const stale = new Date(now.getTime() + STALE_TTL_MS)
  const { speed, bearing, battery_level: batteryLevel, altitude, accuracy } = location.properties

  const detail: Record<string, unknown> = {
    // Required for OpenTAKServer to treat this connection's uid as a known
    // device (EUD) - same finding as the observation path (build.ts).
    takv: { '@_device': 'MAGE', '@_platform': 'MAGE', '@_os': '', '@_version': '1.0.0' },
    contact: { '@_callsign': callsign },
    // Multiple MAGE events can push to the same TAK server - without this, a
    // TAK operator has no way to tell which event a position came from.
    remarks: `MAGE event: ${eventName}`
  }
  if (speed != null || bearing != null) {
    detail.track = {
      ...(speed != null ? { '@_speed': speed } : {}),
      ...(bearing != null ? { '@_course': bearing } : {})
    }
  }
  if (batteryLevel != null) {
    detail.status = { '@_battery': batteryLevel }
  }

  const xml = builder.build({
    event: {
      '@_version': '2.0',
      '@_uid': uid,
      '@_type': 'a-f-G-U-C',
      // Machine-reported GPS, not human-entered - distinct from the
      // observation path's 'h-g-i-g-o'.
      '@_how': 'm-g',
      '@_time': now.toISOString(),
      '@_start': now.toISOString(),
      '@_stale': stale.toISOString(),
      point: {
        '@_lat': lat,
        '@_lon': lon,
        '@_hae': altitude ?? 0,
        '@_ce': accuracy ?? 9999999,
        '@_le': 9999999
      },
      detail
    }
  })

  return { uid, xml }
}
