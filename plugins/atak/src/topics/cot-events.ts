import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { URL } from 'url'
import { AtakAuth, AtakTransport } from '../atak'
import { CotEvent, parseCotEvent } from '../cot/parse'

export const topicDescriptor: FeedTopic = {
  id: 'cot-events',
  title: 'ATAK CoT Events',
  summary: 'Live Cursor-on-Target events (unit positions, points of interest) from a connected ATAK/TAK server.',
  icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.atak', 'icons/cot_feed_icon.png') },
  paramsSchema: {
    type: 'object',
    properties: {}
  },
  itemsHaveIdentity: true,
  itemsHaveSpatialDimension: true,
  itemPrimaryProperty: 'type',
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
      uid:   { title: 'Unit ID', type: 'string' },
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
const fetchDevicePosition = async (transport: AtakTransport, baseUrl: URL, auth: AtakAuth | undefined, uid: string): Promise<Feature | null> => {
  const res = await transport.send({ method: 'get', path: `/Marti/api/cot/xml/${uid}` }, baseUrl, auth)
  if (typeof res.body !== 'string' || res.body.length === 0) {
    return null
  }
  const event = parseCotEvent(res.body)
  if (!event) {
    console.warn('atak cot-events: skipping unparseable CoT event for uid', uid, res.body)
    return null
  }
  return geoJsonFromCotEvent(event)
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
  const endpoints = await fetchClientEndpoints(transport, baseUrl, auth)
  const positions = await Promise.allSettled(
    endpoints.map(x => fetchDevicePosition(transport, baseUrl, auth, x.uid))
  )
  const features: Feature[] = []
  for (const result of positions) {
    if (result.status === 'fulfilled' && result.value) {
      features.push(result.value)
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
