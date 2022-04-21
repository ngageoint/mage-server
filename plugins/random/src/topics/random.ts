import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { RandomResponse } from '../random'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'

export const topicDescriptor: FeedTopic = {
  id: 'random',
  title: 'Random',
  summary: 'Randomly generated points',
  icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.random', 'icons/random.png') },
  paramsSchema: {
    type: 'object',
    properties: {
      latitude: {
        type: 'number',
        default: 0.0
      },
      longitude: {
        type: 'number',
        default: 0.0
      },
      move: {
        type: 'boolean',
        default: false
      }
    }
  },
  itemsHaveIdentity: true,
  itemsHaveSpatialDimension: true,
  itemPrimaryProperty: 'title',
  itemSecondaryProperty: 'summary',
  itemTemporalProperty: 'timestamp',
  updateFrequencySeconds: 1,
  mapStyle: {
    icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.random', 'icons/random.png') }
  },
  itemPropertiesSchema: {
    type: 'object',
    properties: {
      title: {
        title: "Title",
        type: "string"
      },
      summary: {
        title: "Summary",
        type: "string"
      },
      timestamp: {
        title: "Date",
        type: "string",
        format: "date"
      }
    }
  },
  localization: {
    es: {
      properties: {
        title: { title: 'Título'},
        summary: { title: 'Descripción' },
        timestamp: { title: 'Marca de tiempo' }
      }
    }
  }
}

export interface RandomTopicParams {
  latitude: number,
  longitude: number,
  move?: boolean
}

export const transformResponse = (res: RandomResponse): FeedTopicContent => {
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features: [res.body.feature]
    }
  }
}
