import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { AtakRequest, AtakResponse } from '../atak'
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

/**
 * TEMPORARY (see mage-notes/TRACKING.md, 2026-10-16): hardcoded to a known
 * test uid to prove the pipeline against a live OpenTAKServer instance.
 * /Marti/api/cot/sa is an unimplemented stub on OpenTAKServer - it reads
 * its query params but always returns an empty 200. The real multi-device
 * design (discover uids via clientEndPoints, then fetch each one's position)
 * is still pending.
 */
export const createContentRequest = (params?: JsonObject): AtakRequest => {
  return {
    method: 'get',
    path: '/Marti/api/cot/xml/MAGE-TEST-UID-1'
  }
}

/**
 * This endpoint returns a single raw CoT XML <event> document as plain
 * text, confirmed against a live OpenTAKServer instance (see
 * mage-notes/TRACKING.md, 2026-10-16) - not the JSON array previously
 * assumed here.
 */
export const transformResponse = (res: AtakResponse, req: AtakRequest): FeedTopicContent => {
  const features: Feature[] = []

  if (typeof res.body === 'string' && res.body.length > 0) {
    const event = parseCotEvent(res.body)
    if (event) {
      features.push(geoJsonFromCotEvent(event))
    }
    else {
      console.warn('atak cot-events: skipping unparseable CoT event', res.body)
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
