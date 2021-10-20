import { StaticIconReference } from '@ngageoint/mage.web-core-lib/static-icon'
import { Feed, FeedExpanded, FeedPost, FeedPreview, FeedTopic, Service } from '@ngageoint/mage.web-core-lib/feed'

type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K }[keyof T];
type OptionalKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never }[keyof T];
type PickRequired<T> = Pick<T, RequiredKeys<T>>;
type PickOptional<T> = Pick<T, OptionalKeys<T>>;
type Nullable<T> = { [P in keyof T]: T[P] | null };
type NullableOptional<T> = PickRequired<T> & Nullable<PickOptional<T>>;

/**
 * TODO: account for mapStyle
 */
type FeedMetaDataKeys =
  | 'title'
  | 'summary'
  | 'itemsHaveIdentity'
  | 'itemsHaveSpatialDimension'
  | 'itemPrimaryProperty'
  | 'itemSecondaryProperty'
  | 'itemTemporalProperty'
  | 'updateFrequencySeconds'

export type FeedMetaData = Partial<Pick<Feed, FeedMetaDataKeys>> & {
  icon?: StaticIconReference
}
export type FeedMetaDataNullable = Required<NullableOptional<FeedMetaData>>

/**
 * Return a new `FeedMetaData` from the given source object omitting keys that
 * are null or undefined in the source.
 * @param source another `FeedMetaData` object, `FeedTopic`, or `Feed`
 */
export const feedMetaDataLean = <T extends FeedMetaDataNullable | FeedMetaData>(source: T): FeedMetaData => {
  const metaData: FeedMetaData = {}
  source.title && (metaData.title = source.title)
  source.summary && (metaData.summary = source.summary)
  typeof source.itemsHaveIdentity === 'boolean' && (metaData.itemsHaveIdentity = source.itemsHaveIdentity)
  typeof source.itemsHaveSpatialDimension === 'boolean' && (metaData.itemsHaveSpatialDimension = source.itemsHaveSpatialDimension)
  source.itemPrimaryProperty && (metaData.itemPrimaryProperty = source.itemPrimaryProperty)
  source.itemSecondaryProperty && (metaData.itemSecondaryProperty = source.itemSecondaryProperty)
  source.itemTemporalProperty && (metaData.itemTemporalProperty = source.itemTemporalProperty)
  typeof source.updateFrequencySeconds === 'number' && (metaData.updateFrequencySeconds = source.updateFrequencySeconds)
  // TODO: icon
  source.icon && (metaData.icon = source.icon)
  // TODO: mapStyle
  return metaData
}

export interface FeedEditState {
  originalFeed: FeedExpanded | null
  availableServices: Service[]
  selectedService: Service | null
  availableTopics: FeedTopic[]
  selectedTopic: FeedTopic | null
  fetchParameters: any | null
  itemPropertiesSchema: any | null
  feedMetaData: FeedMetaData | null
  preview: FeedPreview | null
}

export const freshEditState = (): Readonly<FeedEditState> => {
  return Object.freeze({
    originalFeed: null,
    availableServices: [],
    selectedService: null,
    availableTopics: [],
    selectedTopic: null,
    fetchParameters: null,
    itemPropertiesSchema: null,
    feedMetaData: null,
    preview: null
  })
}

export const feedPostFromEditState = (state: FeedEditState): FeedPost => {
  const post: FeedPost = {
    service: state.selectedService.id,
    topic: state.selectedTopic.id,
    ...feedMetaDataLean(state.feedMetaData || {})
  }
  if (state.originalFeed) {
    post.id = state.originalFeed.id
  }
  if (state.fetchParameters) {
    post.constantParams = state.fetchParameters
  }
  if (state.itemPropertiesSchema) {
    post.itemPropertiesSchema = state.itemPropertiesSchema
  }
  return post
}