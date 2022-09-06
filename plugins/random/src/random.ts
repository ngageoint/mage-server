
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
    if (typeof config !== 'string') {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'config must be a url string')
    }
    try {
      new URL(config)
    }
    catch (err) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'invalid service url')
    }
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
    let latitude: number = params?.latitude as number || 0.0
    let longitude: number = params?.longitude as number || 0.0
    const move: boolean = params?.move as boolean || false
    if (move) {
      latitude += Math.random() * .001
      longitude += Math.random() * .001
    }

    const feature: Feature = {
      type: 'Feature',
      id: "1",
      properties: {
        timestamp: new Date(),
        title: 'Random point'
      },
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    }

    const topicModule = this.topics.get(topic)
    if (!topicModule) {
      throw new Error(`unknown topic: ${topic}`)
    }
    const res: RandomResponse = {
      status: 200,
      body: { feature }
    }
    return topicModule.transformResponse(res)
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
    feature: Feature
  }
}

export interface RandomTransport {
  send(req: RandomRequest, baseUrl: URL): Promise<RandomResponse>
}

export interface RandomTopicModule {
  topicDescriptor: FeedTopic
  transformResponse(res: RandomResponse): FeedTopicContent
}
