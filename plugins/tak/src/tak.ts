
import { FeedServiceType, FeedServiceConnection, FeedServiceTypeId, FeedTopic, FeedServiceInfo, InvalidServiceConfigError, FeedTopicId, FeedsError, ErrInvalidServiceConfig, FeedServiceTypeUnregistered, FeedTopicContent } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { Json, JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import * as CotEvents from './topics/cot-events'
import { URL } from 'url'

/**
 * TAK devices exchange situational awareness data as Cursor-on-Target (CoT)
 * events. This service type connects to a TAK Server's Marti API to pull
 * those events in as a MAGE feed. Both a real Gov TAK Server and an
 * OpenTAKServer instance (via its Marti-compatibility layer) speak the same
 * API, so one service type covers both - the admin just points baseUrl at
 * whichever server they have.
 */
export class TakServerServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:tak:feeds:service_type'

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
      cotPort: { type: 'integer', title: 'CoT Port', description: 'TCP port for sending MAGE events to the TAK server' },
      username: { type: 'string', title: 'Username', description: 'Server username' },
      password: { type: 'string', title: 'Password', description: 'Server password' }
    },
    required: ['baseUrl']
  }

  constructor(readonly transport: TakTransport) { }

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'config must be an object')
    }
    const { baseUrl, port, cotPort } = config as unknown as TakServiceConfig
    if (typeof baseUrl !== 'string') {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'config.baseUrl must be a url string')
    }
    try {
      new URL(baseUrl)
    }
    catch (err) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['baseUrl'], config }, 'invalid service url')
    }
    if (port !== undefined && !isValidPort(port)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['port'], config }, 'config.port must be an integer between 1 and 65535')
    }
    if (cotPort !== undefined && !isValidPort(cotPort)) {
      return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['cotPort'], config }, 'config.cotPort must be an integer between 1 and 65535')
    }
    return null
  }

  redactServiceConfig(config: JsonObject): JsonObject {
    const { password, ...rest } = config as unknown as TakServiceConfig
    return password ? { ...rest, password: '●●●●●●●●' } : rest
  }

  async createConnection(config: Json): Promise<FeedServiceConnection> {
    return new TakConnection(topics, config as unknown as TakServiceConfig, this.transport)
  }
}

const isValidPort = (port: number): boolean => Number.isInteger(port) && port >= 1 && port <= 65535

export interface TakServiceConfig {
  baseUrl: string
  port?: number
  cotPort?: number
  username?: string
  password?: string
}

export interface TakAuth {
  username: string
  password: string
}

const topics: Map<string, TakTopicModule> = new Map<FeedTopicId, TakTopicModule>([
  [ CotEvents.topicDescriptor.id, CotEvents ]
])

export class TakConnection implements FeedServiceConnection {

  readonly baseUrl: string
  readonly url: URL
  readonly auth?: TakAuth

  constructor(readonly topics: Map<FeedTopicId, TakTopicModule>, config: TakServiceConfig, readonly transport: TakTransport) {
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

export interface TakRequest {
  method: 'get'
  path: string
  queryParams?: Record<string, string>
}

export interface TakResponse {
  status: number
  body: Json
}

export interface TakTransport {
  send(req: TakRequest, baseUrl: URL, auth?: TakAuth): Promise<TakResponse>
}

export interface TakTopicModule {
  topicDescriptor: FeedTopic
  createContentRequest?(params?: JsonObject): TakRequest
  transformResponse?(res: TakResponse, req: TakRequest): FeedTopicContent
  fetchContent?(transport: TakTransport, baseUrl: URL, auth: TakAuth | undefined, params?: JsonObject): Promise<FeedTopicContent>
}
