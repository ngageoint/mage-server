
import mongoose, { Model, SchemaOptions } from 'mongoose'
import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { FeedServiceType, FeedService, FeedServiceTypeId, RegisteredFeedServiceType, FeedRepository, Feed, FeedServiceId } from '../../entities/feeds/entities.feeds'
import { FeedServiceTypeRepository, FeedServiceRepository } from '../../entities/feeds/entities.feeds'
import { FeedServiceDescriptor } from '../../app.api/feeds/app.api.feeds'
import { EntityIdFactory } from '../../entities/entities.global'


export const FeedsModels = {
  FeedServiceTypeIdentity: 'FeedServiceTypeIdentity',
  FeedService: 'FeedService',
  Feed: 'Feed',
}

export type FeedServiceTypeIdentity = Pick<FeedServiceType, 'pluginServiceTypeId'> & {
  id: string
  moduleName: string
}
export type FeedServiceTypeIdentityDocument = FeedServiceTypeIdentity & mongoose.Document
export type FeedServiceTypeIdentityModel = Model<FeedServiceTypeIdentityDocument>
export const FeedServiceTypeIdentitySchema = new mongoose.Schema({
  pluginServiceTypeId: { type: String, required: true },
  moduleName: { type: String, required: true }
})
export function FeedServiceTypeIdentityModel(conn: mongoose.Connection, collection?: string): FeedServiceTypeIdentityModel {
  return conn.model(FeedsModels.FeedServiceTypeIdentity, FeedServiceTypeIdentitySchema, collection || 'feed_service_types')
}

export type FeedServiceDocument = Omit<FeedServiceDescriptor, 'serviceType'> & mongoose.Document & {
  serviceType: mongoose.Types.ObjectId
}
export type FeedServiceModel = Model<FeedServiceDocument>
export const FeedServiceSchema = new mongoose.Schema(
  {
    serviceType: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: FeedsModels.FeedServiceTypeIdentity },
    title: { type: String, required: true },
    summary: { type: String, required: false },
    config: { type: Object, required: false },
  },
  {
    toJSON: {
      getters: true,
      versionKey: false,
      transform: (doc: FeedServiceDocument, json: any & FeedService, options: SchemaOptions): void => {
        delete json._id
        json.serviceType = doc.serviceType.toHexString()
      }
    }
  })
export function FeedServiceModel(conn: mongoose.Connection, collection?: string): FeedServiceModel {
  return conn.model(FeedsModels.FeedService, FeedServiceSchema, collection || 'feed_services')
}

export type FeedDocument = Omit<Feed, 'service' | 'icon'> & mongoose.Document & {
  service: mongoose.Types.ObjectId,
  icon?: string
}
export type FeedModel = Model<FeedDocument>
export const FeedSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    service: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: FeedsModels.FeedService },
    topic: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: false },
    icon: { type: String, required: false },
    constantParams: { type: mongoose.Schema.Types.Mixed, required: false },
    variableParamsSchema: { type: mongoose.Schema.Types.Mixed, required: false },
    updateFrequencySeconds: { type: Number, required: false },
    itemsHaveIdentity: { type: Boolean, required: true },
    itemsHaveSpatialDimension: { type: Boolean, required: true },
    itemTemporalProperty: { type: String, required: false },
    itemPrimaryProperty: { type: String, required: false },
    itemSecondaryProperty: { type: String, required: false },
    mapStyle: { type: mongoose.Schema.Types.Mixed, required: false },
    itemPropertiesSchema: { type: mongoose.Schema.Types.Mixed, required: false },
    localization: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  {
    toJSON: {
      getters: true,
      versionKey: false,
      transform: (doc: FeedDocument, json: any & Feed, options: SchemaOptions): void => {
        delete json._id
        json.service = doc.service.toHexString()
        if (doc.icon) {
          json.icon = { id: doc.icon }
        }
      }
    }
  })
export function FeedModel(conn: mongoose.Connection, collection?: string): FeedModel {
  return conn.model(FeedsModels.Feed, FeedSchema, collection || 'feeds')
}

export class MongooseFeedServiceTypeRepository implements FeedServiceTypeRepository {

  readonly registeredServiceTypes = new Map<string, RegisteredFeedServiceType>()

  constructor(readonly model: FeedServiceTypeIdentityModel) {}

  async register(moduleName: string, serviceType: FeedServiceType): Promise<RegisteredFeedServiceType> {
    let identity = await this.model.findOne({ moduleName, pluginServiceTypeId: serviceType.pluginServiceTypeId })
    if (!identity) {
      identity = await this.model.create({
        moduleName,
        pluginServiceTypeId: serviceType.pluginServiceTypeId
      })
    }
    let identified = this.registeredServiceTypes.get(identity.id)
    if (!identified) {
      identified = Object.create(serviceType, {
        id: {
          value: identity.id,
          writable: false
        }
      }) as RegisteredFeedServiceType
      this.registeredServiceTypes.set(identity.id, identified)
    }
    return identified
  }

  async findById(id: FeedServiceTypeId): Promise<FeedServiceType | null> {
    if (typeof id !== 'string') {
      return null
    }
    return this.registeredServiceTypes.get(id) || null
  }

  async findAll(): Promise<FeedServiceType[]> {
    return Array.from(this.registeredServiceTypes.values())
  }
}

export class MongooseFeedServiceRepository extends BaseMongooseRepository<FeedServiceDocument, FeedServiceModel, FeedService> implements FeedServiceRepository {
  constructor(model: FeedServiceModel) {
    super(model)
  }
}

export class MongooseFeedRepository extends BaseMongooseRepository<FeedDocument, FeedModel, Feed> implements FeedRepository {

  constructor(model: FeedModel, private readonly idFactory: EntityIdFactory) {
    super(model, { entityToDocStub: e => ({ ...e, icon: e.icon?.id  }) })
  }

  async create(attrs: Partial<Feed>): Promise<Feed> {
    const _id = await this.idFactory.nextId()
    const service = mongoose.Types.ObjectId(attrs.service)
    const seed = Object.assign(attrs, { _id, service })
    return await super.create(seed)
  }

  async put(feed: Feed): Promise<Feed | null> {
    type CompleteUpdate = Required<Omit<Feed, 'id' | 'service' | 'topic'>>
    const explicit: { [K in keyof CompleteUpdate]: CompleteUpdate[K] | undefined } = {
      title: feed.title,
      summary: feed.summary,
      icon: feed.icon,
      constantParams: feed.constantParams,
      variableParamsSchema: feed.variableParamsSchema,
      itemsHaveIdentity: feed.itemsHaveIdentity,
      itemsHaveSpatialDimension: feed.itemsHaveSpatialDimension,
      itemPropertiesSchema: feed.itemPropertiesSchema,
      itemPrimaryProperty: feed.itemPrimaryProperty,
      itemSecondaryProperty: feed.itemSecondaryProperty,
      itemTemporalProperty: feed.itemTemporalProperty,
      mapStyle: feed.mapStyle,
      updateFrequencySeconds: feed.updateFrequencySeconds,
      localization: feed.localization
    }
    return await super.update({ ...explicit, id: feed.id })
  }

  async findFeedsForService(service: FeedServiceId): Promise<Feed[]> {
    const docs = await this.model.find({ service })
    return docs.map(x => x.toJSON())
  }

  /**
   * TODO: this exists primarily to support removing a service along with all
   * its associated feeds.  this might indicate that a service should be an
   * aggregate root (domain-driven design concept) because a feed should not
   * exist without its service, and removing a feed and its services should be
   * a transactionally consistent operation.  this would mean removing the
   * feed repository and accessing feeds through their parent service, while
   * the service respository is responsible for persisting and loading services
   * along with all their feeds.
   * @param service
   */
  async removeByServiceId(service: FeedServiceId): Promise<Feed[]> {
    const removed = await this.findFeedsForService(service)
    await this.model.remove({ service })
    return removed
  }
}
