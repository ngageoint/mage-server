import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { RandomResponse } from '../random'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'

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
        description: 'Initial position latitude',
        default: 0.0
      },
      longitude: {
        type: 'number',
        description: 'Initial position longitude',
        default: 0.0
      },
      minItems: {
        type: 'number',
        default: 1
      },
      maxItems: {
        type: 'number',
        default: 1,
        description: ''
      },
      randomOrder: {
        type: 'boolean',
        default: false,
        description: 'Randomize the order of the item list between fetches.  This will cause different feature IDs to disappear from the list when maxItems is greater than minItems.'
      },
      scatterDegrees: {
        type: 'number',
        description: 'Scatter the positions of the items randomly from the initial position within the given threshold of decimal degrees.',
        default: 0.001
      },
      titlePrefix: {
        type: 'string',
        title: 'Item Title Prefix',
        description: 'Prepend the given string to the title of each item in this feed.'
      },
      fetchDelay: {
        type: 'number',
        title: 'Fetch Delay (s)',
        description: 'Delay for the given number of seconds before returning any data.',
        default: 0.0
      }
    },
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
  latitude: number
  longitude: number
  minItems: number
  maxItems: number
  randomOrder: boolean
  scatterDegrees: number
  titlePrefix: string
  fetchDelay: number
}

export function resolveFetchParametersJson(json?: JsonObject): RandomTopicParams {
  json = json || {}
  return {
    latitude: typeof json.latitude === 'number' ? json.latitude : topicDescriptor.paramsSchema!.properties!.latitude.default as number,
    longitude: typeof json.longitude === 'number' ? json.longitude : topicDescriptor.paramsSchema!.properties!.longitude.default as number ,
    minItems: typeof json.minItems === 'number' ? json.minItems : topicDescriptor.paramsSchema!.properties!.minItems.default as number,
    maxItems: typeof json.maxItems === 'number' ? json.maxItems : topicDescriptor.paramsSchema!.properties!.maxItems.default as number,
    randomOrder: typeof json.randomOrder === 'boolean' ? json.randomOrder : topicDescriptor.paramsSchema!.properties!.randomOrder.default as boolean,
    scatterDegrees: typeof json.scatterDegrees === 'number' ? json.scatterDegrees : topicDescriptor.paramsSchema!.properties!.scatterDegrees.default as number,
    titlePrefix: typeof json.titlePrefix === 'string' ? json.titlePrefix : topicDescriptor.id,
    fetchDelay: typeof json.fetchDelay === 'number' ? json.fetchDelay : topicDescriptor.paramsSchema!.properties!.fetchDelay.default as number
  }
}

export const transformResponse = (res: RandomResponse): FeedTopicContent => {
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features: res.body.features
    }
  }
}
