import { JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { URL } from 'url'
import { AtakAuth, AtakTransport } from '../atak'
import { CotEvent, parseCotEvent } from '../cot/parse'

/**
 * A conventional (non-standard) JSON Schema extension, supported by the
 * admin UI's ajsf-material select widget, that maps each `enum` value to a
 * human-readable label (mirrors the same pattern in nga-msi's ports.ts).
 */
interface EnumSchema extends JSONSchema4 {
  enumNames?: string[]
}

/**
 * The 2nd segment of a CoT type code (e.g. the "f" in a-f-G-U-C) is the
 * event's standard identity/affiliation.
 */
const affiliationsSchema = (): JSONSchema4 => ({
  title: 'Affiliations',
  type: 'array',
  items: {
    title: 'Affiliation',
    type: 'string',
    enum: [ 'f', 'h', 'n', 'u', 'a', 's', 'j', 'k', 'p' ],
    enumNames: [ 'Friend', 'Hostile', 'Neutral', 'Unknown', 'Assumed Friend', 'Suspect', 'Joker', 'Faker', 'Pending' ]
  } as EnumSchema,
  description: 'Only include points with one of the selected affiliations. Leave empty to include all.'
})

export interface CotEventsTopicParams {
  connectedOnly?: boolean
  uidOrCallsignContains?: string
  affiliations?: string[]
  startAfter?: string
  startBefore?: string
}

export const topicDescriptor: FeedTopic = {
  id: 'cot-events',
  title: 'ATAK CoT Events',
  summary: 'Live Cursor-on-Target events (unit positions, points of interest) from a connected ATAK/TAK server.',
  icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.atak', 'icons/cot_feed_icon.png') },
  paramsSchema: {
    type: 'object',
    properties: {
      connectedOnly: {
        title: 'Connected Devices Only',
        type: 'boolean',
        description: 'Exclude devices whose last known status is not Connected.'
      },
      uidOrCallsignContains: {
        title: 'Unit ID or Callsign Contains',
        type: 'string'
      },
      affiliations: affiliationsSchema(),
      startAfter: {
        title: 'Start After',
        type: 'string',
        description: 'ISO 8601 timestamp. Only include points whose CoT start time is at or after this.'
      },
      startBefore: {
        title: 'Start Before',
        type: 'string',
        description: 'ISO 8601 timestamp. Only include points whose CoT start time is at or before this.'
      }
    }
  },
  itemsHaveIdentity: true,
  itemsHaveSpatialDimension: true,
  itemPrimaryProperty: 'callsign',
  itemSecondaryProperty: 'uid',
  updateFrequencySeconds: 30,
  mapStyle: {
    icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.atak', 'icons/cot_map_icon.png') }
  },
  /**
   * Limited to CoT fields confirmed present on a real sample event (see
   * mage-notes/TRACKING.md, 2026-09-25/2026-09-28). CoT's optional <detail>
   * extensions (callsign, course, speed) are left out until confirmed
   * present on this source's actual data.
   */
  itemPropertiesSchema: {
    type: 'object',
    properties: {
      uid:      { title: 'Unit ID', type: 'string' },
      callsign: { title: 'Callsign', type: 'string' },
      type:  { title: 'CoT Type', type: 'string', description: 'CoT type code, e.g. a-h-A-M-F-U-M' },
      time:  { title: 'Time', type: 'string' },
      start: { title: 'Start', type: 'string' },
      stale: { title: 'Stale At', type: 'string' },
      hae:   { title: 'Altitude (HAE, m)', type: 'number' },
      ce:    { title: 'Circular Error (m)', type: 'number' },
      le:    { title: 'Linear Error (m)', type: 'number' }
    }
  }
}

const geoJsonFromCotEvent = (x: CotEvent): Feature => {
  return {
    type: 'Feature',
    id: x.uid,
    properties: {
      uid: x.uid,
      callsign: x.callsign ?? x.uid,
      type: x.type,
      time: x.time,
      start: x.start,
      stale: x.stale,
      hae: x.point.hae,
      ce: x.point.ce,
      le: x.point.le
    },
    geometry: {
      type: 'Point',
      coordinates: [ x.point.lon, x.point.lat ]
    }
  }
}

interface ClientEndpoint {
  uid: string
  callsign?: string
  lastEventTime?: string
  lastStatus?: string
  username?: string
}

interface ClientEndpointsResponse {
  data: ClientEndpoint[]
}

/**
 * /Marti/api/clientEndPoints lists every device/unit the TAK server knows
 * about (confirmed live against OpenTAKServer, see mage-notes/TRACKING.md,
 * 2026-10-19), but not their current position - that requires a separate
 * per-uid request below.
 */
const fetchClientEndpoints = async (transport: AtakTransport, baseUrl: URL, auth: AtakAuth | undefined): Promise<ClientEndpoint[]> => {
  const res = await transport.send({ method: 'get', path: '/Marti/api/clientEndPoints' }, baseUrl, auth)
  const body = res.body as unknown as ClientEndpointsResponse
  return Array.isArray(body?.data) ? body.data : []
}

/**
 * /Marti/api/cot/xml/<uid> returns a single raw CoT XML <event> document as
 * plain text for that one device (confirmed live against OpenTAKServer, see
 * mage-notes/TRACKING.md, 2026-10-16).
 */
const fetchDeviceEvent = async (transport: AtakTransport, baseUrl: URL, auth: AtakAuth | undefined, uid: string): Promise<CotEvent | null> => {
  const res = await transport.send({ method: 'get', path: `/Marti/api/cot/xml/${uid}` }, baseUrl, auth)
  if (typeof res.body !== 'string' || res.body.length === 0) {
    return null
  }
  const event = parseCotEvent(res.body)
  if (!event) {
    console.warn('atak cot-events: skipping unparseable CoT event for uid', uid, res.body)
    return null
  }
  return event
}

/**
 * Only clientEndPoints fields (uid, callsign, lastStatus) are known before
 * the per-device fetch, so this filter runs first to skip devices that
 * don't need fetching at all.
 */
const matchesEndpointParams = (endpoint: ClientEndpoint, params: CotEventsTopicParams): boolean => {
  if (params.connectedOnly && endpoint.lastStatus !== 'Connected') {
    return false
  }
  if (params.uidOrCallsignContains) {
    const needle = params.uidOrCallsignContains.toLowerCase()
    const haystack = `${endpoint.uid} ${endpoint.callsign ?? ''}`.toLowerCase()
    if (!haystack.includes(needle)) {
      return false
    }
  }
  return true
}

/**
 * Affiliation and start-time filters need the actual CoT event, so they run
 * after the per-device fetch.
 */
const matchesEventParams = (event: CotEvent, params: CotEventsTopicParams): boolean => {
  if (params.affiliations?.length) {
    const affiliation = event.type.split('-')[1]?.toLowerCase()
    if (!affiliation || !params.affiliations.some(a => a.toLowerCase() === affiliation)) {
      return false
    }
  }
  const start = new Date(event.start).getTime()
  if (params.startAfter && start < new Date(params.startAfter).getTime()) {
    return false
  }
  if (params.startBefore && start > new Date(params.startBefore).getTime()) {
    return false
  }
  return true
}

/**
 * The real multi-device design (see mage-notes/TRACKING.md, 2026-10-19):
 * /Marti/api/cot and /cot/sa are unimplemented stubs on OpenTAKServer, so
 * there's no single bulk "everyone's position" request. Instead, discover
 * the device roster via clientEndPoints, then fetch each device's position
 * individually. A device whose position fetch fails or can't be parsed is
 * skipped rather than failing the whole topic fetch.
 */
export const fetchContent = async (transport: AtakTransport, baseUrl: URL, auth: AtakAuth | undefined, params?: JsonObject): Promise<FeedTopicContent> => {
  const topicParams = (params ?? {}) as CotEventsTopicParams
  const allEndpoints = await fetchClientEndpoints(transport, baseUrl, auth)
  const endpoints = allEndpoints.filter(x => matchesEndpointParams(x, topicParams))
  const events = await Promise.allSettled(
    endpoints.map(x => fetchDeviceEvent(transport, baseUrl, auth, x.uid))
  )
  const features: Feature[] = []
  for (const result of events) {
    if (result.status === 'fulfilled' && result.value && matchesEventParams(result.value, topicParams)) {
      features.push(geoJsonFromCotEvent(result.value))
    }
    else if (result.status === 'rejected') {
      console.warn('atak cot-events: failed to fetch device position', result.reason)
    }
  }
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features
    }
  }
}
