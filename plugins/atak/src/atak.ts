
import { FeedServiceType, FeedServiceConnection, FeedServiceTypeId, FeedTopic, FeedServiceInfo, InvalidServiceConfigError, FeedTopicId, FeedsError, ErrInvalidServiceConfig, FeedServiceTypeUnregistered, FeedTopicContent } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { Json, JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import * as MartiCotEvents from './topics/cot-events'
import * as OpenTakCotEvents from './topics/cot-events.opentak'
import { URL } from 'url'

export interface AtakBaseServiceConfig {
  baseUrl: string
}

export interface TakGovServiceConfig extends AtakBaseServiceConfig {
  username?: string
  password?: string
}

export interface TakOpenServiceConfig extends AtakBaseServiceConfig {
  token?: string
}

export type AtakAuth =
  | { type: 'basic', username: string, password: string }
  | { type: 'token', token: string }

function validateBaseUrlConfig(config: Json): InvalidServiceConfigError | null {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return new FeedsError(ErrInvalidServiceConfig, { invalidKeys: [], config }, 'config must be an object')
  }
  const { baseUrl } = config as unknown as AtakBaseServiceConfig
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

const martiTopics: Map<FeedTopicId, AtakTopicModule> = new Map<FeedTopicId, AtakTopicModule>([
  [ MartiCotEvents.topicDescriptor.id, MartiCotEvents ]
])

const openTakTopics: Map<FeedTopicId, AtakTopicModule> = new Map<FeedTopicId, AtakTopicModule>([
  [ OpenTakCotEvents.topicDescriptor.id, OpenTakCotEvents ]
])

/**
 * ATAK devices exchange situational awareness data as Cursor-on-Target (CoT)
 * events. This service type connects to a real Gov TAK Server's Marti API
 * to pull those events in as a MAGE feed. Requires mTLS client certs in
 * production; HTTP Basic Auth is supported as an interim/testing option.
 */
export class TakGovServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:atak:feeds:service_type:gov'

  readonly id: FeedServiceTypeId = FeedServiceTypeUnregistered
  readonly pluginServiceTypeId: string = TakGovServiceType.SERVICE_TYPE_ID
  readonly title: string = 'TAK Gov Server'
  readonly summary: string = 'Cursor-on-Target (CoT) events from a Gov TAK Server (Marti API)'
  readonly configSchema: JSONSchema4 = {
    type: 'object',
    title: 'TAK Gov Server',
    properties: {
      baseUrl: { type: 'string', title: 'Base URL', description: 'Base URL of the Gov TAK Server' },
      username: { type: 'string', title: 'Username', description: 'Gov TAK Server Username' },
      password: { type: 'string', title: 'Password', description: 'Gov TAK Server Password' }
    },
    // Consider what we should define as required
    required: ['baseUrl']
  }

  constructor(readonly transport: AtakTransport) { }

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    return validateBaseUrlConfig(config)
  }

  redactServiceConfig(config: JsonObject): JsonObject {
    const { password, ...rest } = config as unknown as TakGovServiceConfig
    return password ? { ...rest, password: '●●●●●●●●' } : rest
  }

  async createConnection(config: Json): Promise<FeedServiceConnection> {
    const { baseUrl, username, password } = config as unknown as TakGovServiceConfig
    const auth: AtakAuth | undefined = username && password
      ? { type: 'basic', username, password }
      : undefined
    return new AtakConnection(martiTopics, baseUrl, auth, this.transport, {
      title: this.title,
      summary: this.summary
    })
  }
}

/**
 * OpenTAKServer is an open-source TAK Server that exposes its own native
 * REST API (distinct from its separate Marti-compatibility layer), secured
 * with token authentication instead of client certs.
 */
export class TakOpenServiceType implements FeedServiceType {

  static readonly SERVICE_TYPE_ID = 'urn:mage:atak:feeds:service_type:opentak'

  readonly id: FeedServiceTypeId = FeedServiceTypeUnregistered
  readonly pluginServiceTypeId: string = TakOpenServiceType.SERVICE_TYPE_ID
  readonly title: string = 'TAK OpenTAK Server'
  readonly summary: string = 'Cursor-on-Target (CoT) events from an OpenTAKServer instance'
  readonly configSchema: JSONSchema4 = {
    type: 'object',
    title: 'TAK OpenTAK Server',
    properties: {
      baseUrl: { type: 'string', title: 'Base URL', description: 'Base URL of the OpenTAKServer instance' },
      token: { type: 'string', title: 'Token', description: 'OpenTAKServer authentication token' }
    },
    // Consider what we should define as required
    required: ['baseUrl']
  }

  constructor(readonly transport: AtakTransport) { }

  async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
    return validateBaseUrlConfig(config)
  }

  redactServiceConfig(config: JsonObject): JsonObject {
    const { token, ...rest } = config as unknown as TakOpenServiceConfig
    return token ? { ...rest, token: '●●●●●●●●' } : rest
  }

  async createConnection(config: Json): Promise<FeedServiceConnection> {
    const { baseUrl, token } = config as unknown as TakOpenServiceConfig
    const auth: AtakAuth | undefined = token ? { type: 'token', token } : undefined
    return new AtakConnection(openTakTopics, baseUrl, auth, this.transport, {
      title: this.title,
      summary: this.summary
    })
  }
}

export class AtakConnection implements FeedServiceConnection {

  constructor(
    readonly topics: Map<FeedTopicId, AtakTopicModule>,
    readonly baseUrl: string,
    readonly auth: AtakAuth | undefined,
    readonly transport: AtakTransport,
    private readonly serviceInfo: FeedServiceInfo
  ) { }

  async fetchServiceInfo(): Promise<FeedServiceInfo> {
    return this.serviceInfo
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
