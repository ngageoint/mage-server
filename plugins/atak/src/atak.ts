
import { FeedServiceType, FeedServiceConnection, FeedServiceTypeId, FeedTopic, FeedServiceInfo, InvalidServiceConfigError, FeedTopicId, FeedsError, ErrInvalidServiceConfig, FeedServiceTypeUnregistered, FeedTopicContent } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { Json, JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import * as CotEvents from './topics/cot-events'
import { URL } from 'url'

/**
 * ATAK devices exchange situational awareness data as Cursor-on-Target (CoT)
 * events. This service type connects to a TAK Server's Marti API to pull
 * those events in as a MAGE feed. Both a real Gov TAK Server and an
 * OpenTAKServer instance (via its Marti-compatibility layer) speak the same
 * API, so one service type covers both - the admin just points baseUrl at
 * whichever server they have.
 */
export class TakServerServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:atak:feeds:service_type'

  readonly id: FeedServiceTypeId = FeedServiceTypeUnregistered
  readonly pluginServiceTypeId: string = TakServerServiceType.SERVICE_TYPE_ID
  readonly title: string = 'TAK Server'
  readonly summary: string = 'Cursor-on-Target (CoT) events from TAK Server'
  readonly configSchema: JSONSchema4 = {
    type: 'object',
    title: 'TAK Server',
    properties: {
      baseUrl: { type: 'string', title: 'Base URL', description: 'GovTAK or OpenTAK Server' },
      port: { type: 'integer', title: 'Port', description: 'Port for TAK Server' },
      username: { type: 'string', title: 'Username', description: 'Server username' },
      password: { type: 'string', title: 'Password', description: 'Server password' }
    },
    required: ['baseUrl']
  }

  constructor(readonly transport: AtakTransport) { }

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'config must be an object')
    }
    const { baseUrl, port } = config as unknown as AtakServiceConfig
    if (typeof baseUrl !== 'string') {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'config.baseUrl must be a url string')
    }
    try {
      new URL(baseUrl)
    }
    catch (err) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'invalid service url')
    }
    if (port !== undefined && (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['port'], config }, 'config.port must be an integer between 1 and 65535')
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
  port?: number
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
  readonly url: URL
  readonly auth?: AtakAuth

  constructor(readonly topics: Map<FeedTopicId, AtakTopicModule>, config: AtakServiceConfig, readonly transport: AtakTransport) {
    if (config.port) {
      const url = new URL(config.baseUrl)
      url.port = String(config.port)
      this.baseUrl = url.toString()
      this.url = url
    }
    else {
      this.baseUrl = config.baseUrl
      this.url = new URL(config.baseUrl)
    }
    this.auth = config.username && config.password ? { username: config.username, password: config.password } : undefined
  }

  async fetchServiceInfo(): Promise<FeedServiceInfo> {
    return {
      title: 'TAK Server',
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
    if (topicModule.fetchContent) {
      return await topicModule.fetchContent(this.transport, this.url, this.auth, params)
    }
    if (topicModule.createContentRequest && topicModule.transformResponse) {
      const req = topicModule.createContentRequest(params)
      const res = await this.transport.send(req, this.url, this.auth)
      return topicModule.transformResponse(res, req)
    }
    throw new Error(`topic module for ${topic} defines neither fetchContent nor createContentRequest/transformResponse`)
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
  createContentRequest?(params?: JsonObject): AtakRequest
  transformResponse?(res: AtakResponse, req: AtakRequest): FeedTopicContent
  fetchContent?(transport: AtakTransport, baseUrl: URL, auth: AtakAuth | undefined, params?: JsonObject): Promise<FeedTopicContent>
}
