
import { Json, JsonObject } from '../entities.json_types'
import { FeatureCollection } from 'geojson'
import { JSONSchema4 } from 'json-schema'
import { URL } from 'url'
import { RegisteredStaticIconReference, SourceUrlStaticIconReference, StaticIconId, StaticIconReference } from '../icons/entities.icons'


export const ErrInvalidServiceConfig = Symbol.for('err.feeds.invalid_service_config')

export class FeedsError<Code extends symbol, Data> extends Error {
  constructor(readonly code: Code, readonly data?: Data, message?: string) {
    super(message ? message : Symbol.keyFor(code))
  }
}

export interface InvalidServiceConfigErrorData {
  readonly invalidKeys: string[]
  readonly config: Json
}

export type InvalidServiceConfigError = FeedsError<typeof ErrInvalidServiceConfig, InvalidServiceConfigErrorData>

export const FeedServiceTypeUnregistered = Symbol.for('FeedServiceTypeUnregistered')
export type FeedServiceTypeId = string | typeof FeedServiceTypeUnregistered

export interface FeedServiceType {
  readonly id: FeedServiceTypeId
  readonly pluginServiceTypeId: string
  readonly title: string
  readonly summary: string | null
  readonly configSchema: JSONSchema4 | null

  validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError>
  /**
   * Remove data from the given service coniguration document that is sensitive
   * or otherwise unsuitable to send over the wire to a service client.
   * TODO: this might go away in favor of a marking properties on config
   * instances as secret
   * @param config
   */
  redactServiceConfig(config: Json): Json
  createConnection(config: Json): Promise<FeedServiceConnection>
}

export type RegisteredFeedServiceType = FeedServiceType & { id: string }

/**
 * A feed service ID is globally unique.
 */
export type FeedServiceId = string

export interface FeedServiceInfo {
  readonly title: string
  readonly summary: string
}

export interface FeedService {
  id: FeedServiceId
  serviceType: FeedServiceTypeId
  title: string
  summary: string | null
  config: Json
}

export interface FeedServiceConnection {
  fetchServiceInfo(): Promise<FeedServiceInfo | null>
  fetchAvailableTopics(): Promise<FeedTopic[]>
  // TODO: maybe would be valuable to implement some caching of topics or
  // require the client to pass a populated topic in case the connection needs
  // extra information to fetch topic content and avoid fetching the topic
  // information for every content fetch.  caching could also be left to the
  // plugin to implement, but mage could provide hooks for caching.
  fetchTopicContent(topic: FeedTopicId, params?: JsonObject): Promise<FeedTopicContent>
}

export interface FeedServiceTypeRepository {
  register(moduleName: string, serviceType: FeedServiceType): Promise<RegisteredFeedServiceType>
  findAll(): Promise<FeedServiceType[]>
  findById(serviceTypeId: FeedServiceTypeId): Promise<FeedServiceType | null>
}

export type FeedServiceCreateAttrs = Pick<FeedService,
  | 'serviceType'
  | 'title'
  | 'summary'
  | 'config'
  >

export interface FeedServiceRepository {
  create(feedAttrs: FeedServiceCreateAttrs): Promise<FeedService>
  findAll(): Promise<FeedService[]>
  findById(serviceId: FeedServiceId): Promise<FeedService | null>
  removeById(serviceId: FeedServiceId): Promise<FeedService | null>
}

/**
 * A topic ID is unique in the context the providing {@linkcode FeedService}.
 */
export type FeedTopicId = string

export interface FeedTopic {
  readonly id: FeedTopicId
  readonly title: string
  readonly summary?: string
  /**
   * This icon represents the overall topic, such as in a list of available
   * topics.  This icon may also potentially represent the content items in the
   * topic on a map or in a list if no item style assigns an icon to content
   * items.
   */
  readonly icon?: SourceUrlStaticIconReference
  /**
   * The paramters schema defines the parameters MAGE can use to fetch and
   * filter content from the topic.
   */
  readonly paramsSchema?: JSONSchema4
  /**
   * A topic's update frequency is a hint about how often a service might
   * publish new data to a topic.  A value of `undefined` indicates a topic's
   * update frequency is unknown and requires configuration in a derived
   * {@linkcode Feed}.
   */
  readonly updateFrequencySeconds?: number
  /**
   * When feed items have identity, the `id` property of the GeoJSON feature
   * items fetched from a feed will contain a persistent unique identifier for
   * the items.  The same item across mulutiple fetches will have the same
   * `id` property value.  Consumers of feed content can then present changes as
   * updates to previously fetched items, for example updating the location of
   * a moving vehicle.  A value of `undefined` indicates a topic's item identity
   * is unknown and requires configuration in a derived {@linkcode Feed}.
   */
  readonly itemsHaveIdentity?: boolean
  /**
   * Feed items with a spatial dimension will translate to GeoJSON features with
   * non-null geometries.  A value of `undefined` indicates a topic's spatial
   * dimension is unknown and requires configuration in a derived
   * {@linkcode Feed}.
   */
  readonly itemsHaveSpatialDimension?: boolean
  /**
   * Feed items with a temporal property will translate to GeoJSON features
   * that have a temporal property whose value is a numeric epoch timestamp.  A
   * value of `undefined` indicates a topic's temporal property is unknown and
   * requires configuration in a derived {@linkcode Feed}.
   */
  readonly itemTemporalProperty?: string
  /**
   * The primary property of a GeoJSON feature feed item is the main value that
   * should represent the item in a list view to the end user, as well as in
   * a popup on a map view.  A value of `undefined` indicates a topic's primary
   * property is unknown and requires configuration in a derived
   * {@linkcode Feed}.
   */
  readonly itemPrimaryProperty?: string
  /**
   * Simimlar to {@linkcode FeedTopic.itemPrimaryProperty}, the intent of the
   * secondary of a GeoJSON feature feed item is to indicate a value that
   * represents the item in a list or map view to the end user.  The secondary
   * property can add a bit of enhancing detail about the item to the primary
   * property.  A value of `undefined` indicates a topic's secondary property is
   * unknown and requires configuration in a derived {@linkcode Feed}.
   */
  readonly itemSecondaryProperty?: string
  readonly mapStyle?: MapStyle
  readonly itemPropertiesSchema?: JSONSchema4
}

export interface FeedTopicContent {
  topic: FeedTopicId
  items: FeatureCollection
  pageCursor?: Json
}

/** A feed ID is globally unique. */
export type FeedId = string

export interface Feed {
  id: FeedId
  service: FeedServiceId
  topic: FeedTopicId
  title: string
  summary?: string
  icon?: RegisteredStaticIconReference
  /**
   * The constant paramters are a subset of a topic's parameters that an
   * administrative user defines and that MAGE will apply to every fetch
   * request to the feed's source topic.  An example of a constant parameter
   * might be `apiKey`.  MAGE does not expose constant parameters to the end-
   * user consumer of the feed.
   */
  constantParams?: FeedContentParams
  /**
   * The variable parameters schema of a feed is a schema an administrative user
   * can define to advertise the parameters feed consumers can pass when
   * fetching content from a feed.  This schema could be the same as that of the
   * source  {@linkcode FeedTopic} or could be a more restrictive subset of the
   * topic schema.
   */
  variableParamsSchema?: JSONSchema4
  /**
   * A feed's update frequency is similar to the like-named property on its
   * underlying topic.  While a topic's update frequency would come from the
   * implementing plugin, a feed's update frequency would likely come from user
   * configuration based on the parameters of the feed as well as the update
   * frequency of the underlying topic.  This allows for feed service type
   * plugins that are too generic to know what an appropriate update interval
   * would be for particular service's topics.
   */
  updateFrequencySeconds?: number
  /**
   * This flag is similar to the like-named property on its source
   * {@linkcode FeedTopic}, but as with {@linkcode Feed.updateFrequency}, allows
   * configuration by an administrative user.
   */
  itemsHaveIdentity: boolean
  itemsHaveSpatialDimension: boolean
  itemTemporalProperty?: string
  /**
   * A feed that does not have a primary property (implying there is no
   * secondary as well) covers the case that a data set might provide only
   * spatial geometries, and the feed/topic context provides the implicit
   * meaning of the geometry data.
   */
  itemPrimaryProperty?: string
  itemSecondaryProperty?: string
  mapStyle?: ResolvedMapStyle
  itemPropertiesSchema?: JSONSchema4
}

/**
 * TODO: This could move outside of feeds to be used for other map-able
 * elements.
 */
export interface MapStyle {
  stroke?: HexRgb
  strokeOpacity?: number
  strokeWidth?: number
  fill?: HexRgb
  fillOpacity?: number
  icon?: SourceUrlStaticIconReference
}

export type ResolvedMapStyle = Omit<MapStyle, 'icon'> & {
  icon?: RegisteredStaticIconReference
}

/**
 * HexRgb is the typical hexadecimal, 24-bit color string.
 */
export type HexRgb = string

export type FeedCreateAttrs = Omit<Feed, 'id'> & Partial<Pick<Feed, 'id'>>

export interface FeedRepository {
  create(attrs: FeedCreateAttrs): Promise<Feed>
  findById(id: FeedId): Promise<Feed | null>
  findAllByIds(feedIds: FeedId[]): Promise<{ [id: string]: Feed | null }>
  findAll(): Promise<Feed[]>
  findFeedsForService(service: FeedServiceId): Promise<Feed[]>
  put(feed: Feed): Promise<Feed | null>
  removeById(feedId: FeedId): Promise<Feed | null>
  removeByServiceId(serviceId: FeedServiceId): Promise<Feed[]>
}

type OptionalPropertyOf<T extends object> = Exclude<{
  [K in keyof T]: T extends Record<K, T[K]> ? never : K
}[keyof T], undefined>

export type FeedOverrideTopicNullableKeys = OptionalPropertyOf<Feed>

export type FeedCreateMinimal = Partial<Omit<Feed, 'id' | FeedOverrideTopicNullableKeys>> & Pick<Feed, 'topic' | 'service'>
  & {
    [nullable in FeedOverrideTopicNullableKeys]?: FeedCreateUnresolved[nullable] | null
  }

export type FeedUpdateMinimal = Omit<FeedCreateMinimal, 'service' | 'topic' | 'id'> & Pick<Feed, 'id'>

export type FeedCreateUnresolved = Omit<FeedCreateAttrs, 'icon' | 'mapStyle'> & {
  icon?: StaticIconReference,
  mapStyle?: MapStyle | ResolvedMapStyle,
  unresolvedIcons: URL[]
}

/**
 * This is a factory function to build the attributes for creating a feed by
 * merging a minimal set of client input attributes with those of the source
 * topic.  Attributes that are not present or have an `undefined` value in the
 * input will receive the corresponding value from the topic. Keys with a `null`
 * value (where allowed) explicitly instruct that the resulting feed will not
 * receive the correspondingvalues from the topic and be absent in the resulting
 * create attributes.
 *
 * The `Unresolved` qualification indicates that the input and result attributes
 * may contain URLs of icons that are not yet registered with MAGE's icon
 * repository.  Any unresolved URLs will be in the `unresolvedIcons` array.
 */
export const FeedCreateUnresolved = (topic: FeedTopic, feedMinimal: Readonly<FeedCreateMinimal>): FeedCreateUnresolved => {
  type NonNullableCreateAttrs = Omit<FeedCreateAttrs, FeedOverrideTopicNullableKeys>
  const nonNullable: NonNullableCreateAttrs = {
    service: feedMinimal.service,
    topic: topic.id,
    title: feedMinimal.title || topic.title,
    itemsHaveIdentity: feedMinimal.itemsHaveIdentity === undefined ? topic.itemsHaveIdentity || false : feedMinimal.itemsHaveIdentity,
    itemsHaveSpatialDimension: feedMinimal.itemsHaveSpatialDimension === undefined ? topic.itemsHaveSpatialDimension || false : feedMinimal.itemsHaveSpatialDimension,
  }
  const nullable: { [key in FeedOverrideTopicNullableKeys]?: FeedCreateUnresolved[key] } = {
    summary: feedMinimal.summary === null ? undefined : feedMinimal.summary || topic.summary,
    constantParams: feedMinimal.constantParams || undefined,
    variableParamsSchema: feedMinimal.variableParamsSchema || undefined,
    itemPropertiesSchema: feedMinimal.itemPropertiesSchema === null ? undefined : feedMinimal.itemPropertiesSchema || topic.itemPropertiesSchema,
    itemPrimaryProperty: feedMinimal.itemPrimaryProperty === null ? undefined : feedMinimal.itemPrimaryProperty || topic.itemPrimaryProperty,
    itemSecondaryProperty: feedMinimal.itemSecondaryProperty === null ? undefined : feedMinimal.itemSecondaryProperty || topic.itemSecondaryProperty,
    itemTemporalProperty: feedMinimal.itemTemporalProperty === null ? undefined : feedMinimal.itemTemporalProperty || topic.itemTemporalProperty,
    updateFrequencySeconds: feedMinimal.updateFrequencySeconds === null ? undefined : feedMinimal.updateFrequencySeconds || topic.updateFrequencySeconds,
    mapStyle: feedMinimal.mapStyle === null ? undefined :
      feedMinimal.mapStyle ? { ...feedMinimal.mapStyle } :
      topic.mapStyle ? { ...topic.mapStyle } : undefined
  }
  if (feedMinimal.icon !== null) {
    if (feedMinimal.icon) {
      nullable.icon = feedMinimal.icon
    }
    else if (topic.icon) {
      nullable.icon = topic.icon
    }
  }
  const unresolvedIcons: URL[] = []
  let icon = nullable.icon || { sourceUrl: null }
  if (icon.sourceUrl) {
    unresolvedIcons.push(icon.sourceUrl)
  }
  icon = nullable.mapStyle?.icon || { sourceUrl: null }
  if (icon.sourceUrl) {
    unresolvedIcons.push(icon.sourceUrl)
  }
  const unresolvedAttrs = {
    ...nonNullable,
    ...nullable,
    unresolvedIcons
  }
  for (const key in unresolvedAttrs) {
    const attr = key as keyof typeof unresolvedAttrs
    if (typeof unresolvedAttrs[attr] === 'undefined') {
      delete unresolvedAttrs[attr]
    }
  }
  return unresolvedAttrs
}

const resolvedMapStyle = (unresolved: MapStyle | ResolvedMapStyle, icons: { [iconUrl: string]: StaticIconId }): ResolvedMapStyle => {
  const { icon, ...rest } = unresolved
  if (!icon) {
    return rest
  }
  const resolved: ResolvedMapStyle = rest
  if (icon.sourceUrl) {
    const id = icons[String(icon.sourceUrl)]
    if (id) {
      resolved.icon = { id }
    }
  }
  else {
    resolved.icon = { ...icon }
  }
  return resolved
}

export const FeedCreateAttrs = (unresolved: FeedCreateUnresolved, icons: { [iconUrl: string]: StaticIconId }): FeedCreateAttrs => {
  icons = icons || {}
  const { unresolvedIcons, icon, mapStyle, ...rest } = unresolved
  const resolved = rest as FeedCreateAttrs
  if (mapStyle) {
    resolved.mapStyle = resolvedMapStyle(mapStyle, icons)
  }
  if (icon) {
    if (icon.sourceUrl) {
      const id = icons[String(icon.sourceUrl)]
      if (id) {
        resolved.icon = { id }
      }
    }
    else {
      resolved.icon = { ...icon }
    }
  }
  return resolved
}

export type FeedContentParams = JsonObject

export interface FeedContent extends FeedTopicContent {
  readonly feed: FeedId
  readonly variableParams?: FeedContentParams
}
