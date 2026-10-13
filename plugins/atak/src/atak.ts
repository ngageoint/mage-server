
import { FeedServiceType, FeedServiceConnection, FeedServiceTypeId, FeedTopic, FeedServiceInfo, InvalidServiceConfigError, FeedTopicId, FeedsError, ErrInvalidServiceConfig, FeedServiceTypeUnregistered, FeedTopicContent } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { Json, JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import * as CotEvents from './topics/cot-events'
import { URL } from 'url'

/**
 * ATAK devices exchange situational awareness data as Cursor-on-Target (CoT)
 * events. This service type connects to a TAK Server's Marti API to pull
 * those events in as a MAGE feed.
 */
export class AtakServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:atak:feeds:service_type'

  readonly id: FeedServiceTypeId = FeedServiceTypeUnregistered
  readonly pluginServiceTypeId: string = AtakServiceType.SERVICE_TYPE_ID
  readonly title: string = 'ATAK / TAK Server'
  readonly summary: string = 'Cursor-on-Target (CoT) events from TAK Server'
  readonly configSchema: JSONSchema4 = {
    type: 'object',
    title: 'TAK Server',
    properties: {
      baseUrl: { type: 'string', title: 'Base URL', description: 'Base URL of the TAK Server' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password' }
    },
    required: ['baseUrl']
  }

  constructor(readonly transport: AtakTransport) { }

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'config must be an object')
    }
    const { baseUrl } = config as unknown as AtakServiceConfig
    if (typeof baseUrl !== 'string') {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'config.baseUrl must be a url string')
    }
    try {
      new URL(baseUrl)
    }
    catch (err) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'invalid service url')
    }
    return null
  }

  redactServiceConfig(config: JsonObject): JsonObject {
    const { password, ...rest } = config as unknown as AtakServiceConfig
    return password ? { ...rest, password: '●●●●●●●●' } : rest
  }

  async createConnection(config: Json): Promise<FeedServiceConnection> {
    return new AtakConnection(topics, config as unknown as AtakServiceConfig, this.transport)
  }
}

export interface AtakServiceConfig {
  baseUrl: string
  username?: string
  password?: string
}

export interface AtakAuth {
  username: string
  password: string
}

const topics: Map<string, AtakTopicModule> = new Map<FeedTopicId, AtakTopicModule>([
  [ CotEvents.topicDescriptor.id, CotEvents ]
])

export class AtakConnection implements FeedServiceConnection {

  readonly baseUrl: string
  readonly auth?: AtakAuth

  constructor(readonly topics: Map<FeedTopicId, AtakTopicModule>, config: AtakServiceConfig, readonly transport: AtakTransport) {
    this.baseUrl = config.baseUrl
    this.auth = config.username && config.password ? { username: config.username, password: config.password } : undefined
  }

  async fetchServiceInfo(): Promise<FeedServiceInfo> {
    return {
      title: 'ATAK / TAK Server',
      summary: 'Cursor-on-Target (CoT) events from a connected TAK Server'
    }
  }

  async fetchAvailableTopics(): Promise<FeedTopic[]> {
    return Array.from(this.topics.values()).map(x => x.topicDescriptor)
  }

  async fetchTopicContent(topic: string, params?: JsonObject | undefined): Promise<FeedTopicContent> {
    const topicModule = this.topics.get(topic)
    if (!topicModule) {
      throw new Error(`unknown topic: ${topic}`)
    }
    const req = topicModule.createContentRequest(params)
    const res = await this.transport.send(req, new URL(this.baseUrl), this.auth)
    return topicModule.transformResponse(res, req)
  }
}

export interface AtakRequest {
  method: 'get'
  path: string
  queryParams?: Record<string, string>
}

export interface AtakResponse {
  status: number
  body: Json
}

export interface AtakTransport {
  send(req: AtakRequest, baseUrl: URL, auth?: AtakAuth): Promise<AtakResponse>
}

export interface AtakTopicModule {
  topicDescriptor: FeedTopic
  createContentRequest(params?: JsonObject): AtakRequest
  transformResponse(res: AtakResponse, req: AtakRequest): FeedTopicContent
}
