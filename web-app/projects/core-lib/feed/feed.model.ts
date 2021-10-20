import { Feature, FeatureCollection } from 'geojson';
import { RegisteredStaticIconReference, SourceUrlStaticIconReference, StaticIconReference } from '@ngageoint/mage.web-core-lib/static-icon'

export interface Feed {
  id: string;
  service: string;
  topic: string;
  title: string;
  summary?: string;
  icon?: RegisteredStaticIconReference;
  mapStyle?: RegisteredMapStyle;
  itemTemporalProperty?: string;
  itemPrimaryProperty?: string;
  itemSecondaryProperty?: string;
  itemsHaveSpatialDimension?: boolean;
  itemsHaveIdentity?: boolean;
  constantParams?: any;
  variableParamsSchema?: any;
  updateFrequencySeconds?: number;
  itemPropertiesSchema?: any;
}

export interface MapStyle {
  icon?: SourceUrlStaticIconReference
}

export interface RegisteredMapStyle {
  icon?: RegisteredStaticIconReference;
}

export type StyledFeature = Feature & { style: MapStyle }
export interface FeedContent {
  items: FeatureCollection
}

export interface ServiceType {
  /**
   * Well-known identifier that the feed plugin creator assigns
   */
  pluginServiceTypeId: string
  /**
   * The unique identifier MAGE server generates to reference the service type
   */
  id: string
  title: string
  summary: string
  configSchema: any
}

export interface Service {
  id: string;
  title: string;
  serviceType: ServiceType | string
  summary: string | null
  config: any
}

export interface FeedTopic {
  id: string;
  title: string;
  summary?: string;
  icon?: SourceUrlStaticIconReference;
  paramsSchema?: any;
  updateFrequencySeconds?: number;
  itemsHaveIdentity?: boolean;
  itemsHaveSpatialDimension?: boolean;
  itemTemporalProperty?: string;
  itemPrimaryProperty?: string;
  itemSecondaryProperty?: string;
  itemPropertiesSchema?: any;
  mapStyle?: MapStyle
}

export type FeedExpanded = Omit<Feed, 'service' | 'topic'> & {
  service: Service,
  topic: FeedTopic
}

export interface FeedContent {
  feed: string
  variableParams?: any
  items: FeatureCollection
}

export interface FeedPreview {
  feed: Feed
  content?: FeedContent
}

export type FeedPost = Partial<Omit<Feed, 'service' | 'topic' | 'icon'>> & Pick<Feed, 'service' | 'topic'> & {
  icon?: StaticIconReference
}
