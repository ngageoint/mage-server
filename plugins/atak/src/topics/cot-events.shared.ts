import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { AtakRequest, AtakResponse, AtakTopicModule } from '../atak'
import { CotEvent, parseCotEvent } from '../cot/parse'

export interface CotEventsTopicOptions {
  id: string
  title: string
  summary: string
  path: string
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
 * Builds a "CoT Events" feed topic for a given TAK server flavor. The CoT
 * parsing and GeoJSON translation are identical regardless of which server
 * the events came from - only the request path differs per flavor.
 */
export function makeCotEventsTopic(options: CotEventsTopicOptions): AtakTopicModule {
  const topicDescriptor: FeedTopic = {
    id: options.id,
    title: options.title,
    summary: options.summary,
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
     * Limited to CoT fields confirmed present on a real sample event.
     * CoT's optional <detail> extensions (callsign, course, speed) are
     * left out until confirmed present on a given source's actual data.
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

  return {
    topicDescriptor,
    createContentRequest(params?: JsonObject): AtakRequest {
      return {
        method: 'get',
        path: options.path
      }
    },
    transformResponse(res: AtakResponse, req: AtakRequest): FeedTopicContent {
      const rawEvents = Array.isArray(res.body) ? res.body : []

      const features: Feature[] = []
      for (const rawEvent of rawEvents) {
        if (typeof rawEvent !== 'string') {
          console.warn(`atak ${options.id}: skipping non-string entry in response`, rawEvent)
          continue
        }
        const event = parseCotEvent(rawEvent)
        if (!event) {
          console.warn(`atak ${options.id}: skipping unparseable CoT event`, rawEvent)
          continue
        }
        features.push(geoJsonFromCotEvent(event))
      }

      return {
        topic: topicDescriptor.id,
        items: {
          type: 'FeatureCollection',
          features
        }
      }
    }
  }
}
