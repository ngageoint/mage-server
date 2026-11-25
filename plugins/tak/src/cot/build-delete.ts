import XMLBuilder from 'fast-xml-builder'

// How long the delete notice itself stays current - not a delay before
// anything happens, just the same stale convention every CoT event uses.
// Matches OpenTAKServer's own internal delete events (marker_api.py).
const DELETE_NOTICE_TTL_MS = 10 * 60 * 1000

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' })

// The TAK-standard "delete" CoT type, not an OpenTAKServer invention - real
// TAK clients and OpenTAKServer's own marker/casevac/EUD code all send this
// exact shape to tell a uid's consumers to forget it, rather than relying on
// an inferred removal from an expired stale timestamp on the original type.
export function buildDeleteCotEventXml(uid: string, markerType: string): string {
  const now = new Date()
  const stale = new Date(now.getTime() + DELETE_NOTICE_TTL_MS)

  return builder.build({
    event: {
      '@_version': '2.0',
      '@_uid': uid,
      '@_type': 't-x-d-d',
      '@_how': 'h-g-i-g-o',
      '@_time': now.toISOString(),
      '@_start': now.toISOString(),
      '@_stale': stale.toISOString(),
      // Irrelevant for a delete directive - the uid is what's being removed.
      point: {
        '@_lat': 0,
        '@_lon': 0,
        '@_hae': 0,
        '@_ce': 9999999,
        '@_le': 9999999
      },
      detail: {
        link: { '@_relation': 'p-p', '@_uid': uid, '@_type': markerType }
      }
    }
  })
}
