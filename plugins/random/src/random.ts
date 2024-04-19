
import { FeedServiceType, FeedServiceConnection, FeedServiceTypeId, FeedTopic, FeedServiceInfo, InvalidServiceConfigError, FeedTopicId, FeedsError, ErrInvalidServiceConfig, FeedServiceTypeUnregistered, FeedTopicContent } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { Json, JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import * as Random from './topics/random'
import * as Errors from './topics/errors'
import { URL } from 'url'
import querystring from 'querystring'
import { Feature } from "geojson"

export class RandomServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:random:feeds:service_type'

  readonly id: FeedServiceTypeId = FeedServiceTypeUnregistered
  readonly pluginServiceTypeId: string = RandomServiceType.SERVICE_TYPE_ID
  readonly title: string = 'Random Points'
  readonly summary: string = 'Feed that returns features with random GeoJSON points'
  readonly configSchema: JSONSchema4 = {}

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    return null
  }

  redactServiceConfig(config: JsonObject): JsonObject {
    return config
  }

  async createConnection(config: Json): Promise<FeedServiceConnection> {
    return new RandomConnection(topics, config as string)
  }
}

const topics: Map<string, RandomTopicModule> = new Map<FeedTopicId, RandomTopicModule>([
  [ Random.topicDescriptor.id, Random ],
  [ Errors.topicDescriptor.id, Errors ]
])

export class RandomConnection implements FeedServiceConnection {

  constructor(readonly topics: Map<FeedTopicId, RandomTopicModule>, readonly baseUrl: string) {}

  async fetchServiceInfo(): Promise<FeedServiceInfo> {
    return {
      title: 'Random GeoJson Service',
      summary: 'Provide random geojson points'
    }
  }

  async fetchAvailableTopics(): Promise<FeedTopic[]> {
    return Array.from(this.topics.values()).map(x => x.topicDescriptor)
  }

  async fetchTopicContent(topic: string, params?: JsonObject | undefined): Promise<FeedTopicContent> {
    const typedParams = Random.resolveFetchParametersJson(params)
    const itemIds: string[] = Array.from({ length: typedParams.maxItems }).map((_, index) => String(index))
    const itemCount = Math.trunc(Math.random() * (typedParams.maxItems - typedParams.minItems + 1)) + typedParams.minItems
    const { latitude, longitude } = typedParams
    const features: Feature[] = Array.from({ length: itemCount }).map(_ => {
      const coordinates = [
        typedParams.scatterDegrees * (Math.random() * 2 - 1) + longitude,
        typedParams.scatterDegrees * (Math.random() * 2 - 1) + latitude
      ]
      const nextId = typedParams.randomOrder ? itemIds.splice(Math.trunc(Math.random() * itemIds.length), 1)[0] : itemIds.shift()
      const titlePrefix = typeof params?.titlePrefix === 'string' ? params.titlePrefix : 'Wut'
      return {
        type: 'Feature',
        id: nextId,
        properties: {
          timestamp: new Date(),
          title: `${titlePrefix} random point ${nextId}`
        },
        geometry: {
          type: 'Point',
          coordinates
        }
      }
    })
    const topicModule = this.topics.get(topic)
    if (!topicModule) {
      throw new Error(`unknown topic: ${topic}`)
    }
    const res: RandomResponse = {
      status: 200,
      body: { features }
    }
    const delay = typedParams.fetchDelay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(topicModule.transformResponse(res))
      }, Math.trunc(delay * 1000))
    })
  }
}

export interface RandomRequest {
  method: 'get'
  path: string
  queryParams?: querystring.ParsedUrlQuery
  body?: Json
}

export interface RandomResponse {
  status: number
  body: {
    features: Feature[]
  }
}

export interface RandomTransport {
  send(req: RandomRequest, baseUrl: URL): Promise<RandomResponse>
}

export interface RandomTopicModule {
  topicDescriptor: FeedTopic
  transformResponse(res: RandomResponse): FeedTopicContent
}
