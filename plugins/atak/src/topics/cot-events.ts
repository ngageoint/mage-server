import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { AtakRequest, AtakResponse } from '../atak'

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

interface CotPoint {
  lat: number
  lon: number
  hae: number
  ce: number
  le: number
}

interface CotEvent {
  uid: string
  type: string
  time: string
  start: string
  stale: string
  point: CotPoint
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

export const createContentRequest = (params?: JsonObject): AtakRequest => {
  return {
    method: 'get',
    path: '/Marti/api/cot'
  }
}

/**
 * Marti's docs list this endpoint's response as `application/json`, an
 * array of strings, with no sample body or further schema. Working theory,
 * unconfirmed (see mage-notes/TRACKING.md, 2026-09-28): each string is a
 * serialized CoT XML <event> document, meaning this would still need an
 * XML-parsing step per array element despite the JSON content-type. Left
 * unimplemented until that's verified against a real response - returns no
 * items for now rather than parse against a guessed shape.
 */
export const transformResponse = (res: AtakResponse, req: AtakRequest): FeedTopicContent => {
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features: []
    }
  }
}
