import _ from 'lodash'
import mongoose from 'mongoose'
import { Device, DeviceExpanded, DeviceRepository, DeviceUid, FindDevicesSpec } from '../../entities/devices/entities.devices'
import { pageOf, PageOf } from '../../entities/entities.global'
import { BaseMongooseRepository, DocumentMapping, pageQuery } from '../base/adapters.base.db.mongoose'
import { UserDocument } from '../users/adapters.users.db.mongoose'

const Schema = mongoose.Schema

export type DeviceDocument = Omit<Device, 'id' | 'userId'> & {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId | null
}
export type DeviceDocumentPopulated = Omit<DeviceDocument, 'userId'> & {
  userId: { _id: UserDocument['_id'], displayName?: UserDocument['displayName'] | null }
}
export type DeviceModel = mongoose.Model<DeviceDocument>

// TODO cascade delete from userId when user is deleted.
export const DeviceSchema = new Schema<DeviceDocument, DeviceModel>(
  {
    uid: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: false },
    registered: { type: Boolean, required: true, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userAgent: { type: String, required: false },
    appVersion: { type: String, required: false }
  },
  {
    versionKey: false
  }
)

export const docToEntity: DocumentMapping<DeviceDocument | DeviceDocumentPopulated, Device | DeviceExpanded> = function docToEntity(doc) {
  const baseEntity: Partial<Device & DeviceExpanded> = {
    id: doc._id.toHexString(),
    uid: doc.uid,
    registered: doc.registered,
    userAgent: doc.userAgent,
    appVersion: doc.appVersion,
    description: doc.description,
  }
  const userAttrs = doc.userId
  if (userAttrs instanceof mongoose.Types.ObjectId) {
    baseEntity.userId = userAttrs.toHexString()
  }
  else if (userAttrs) {
    baseEntity.userId = userAttrs._id.toHexString()
    baseEntity.user = userAttrs.displayName ? {
      id: userAttrs._id.toHexString(),
      displayName: userAttrs.displayName
    } : null
  }
  return baseEntity as Device
}

export class DeviceMongooseRepository extends BaseMongooseRepository<DeviceDocument, DeviceModel, Device> implements DeviceRepository {

  constructor(model: DeviceModel) {
    super(model, { docToEntity })
  }

  async findByUid(uid: DeviceUid): Promise<Device | null> {
    return await this.model.findOne({ uid }).then(x => x ? docToEntity(x) : null)
  }

  async findSome(findSpec: FindDevicesSpec): Promise<PageOf<DeviceExpanded>> {
    const filter = dbFilterForFindSpec(findSpec)
    const baseQuery = this.model.find(filter, null, { sort: 'userAgent _id' }).lean()
    const maybePopulateQuery = findSpec.expandUser ?
      baseQuery.populate({
        path: 'userId', select: 'displayName' ,
        transform: (doc, _id) => (doc ? doc : { _id })
      }) :
      baseQuery
    const counted = await pageQuery(maybePopulateQuery, findSpec.paging)
    const devices = Array.prototype.map.call(await counted.query, docToEntity) as DeviceExpanded[]
    return pageOf(devices, findSpec.paging, counted.totalCount)
  }

  async countSome(findSpec: FindDevicesSpec): Promise<number> {
    const filter = dbFilterForFindSpec(findSpec)
    return await this.model.count(filter)
  }
}

function dbFilterForFindSpec(findSpec: FindDevicesSpec): mongoose.FilterQuery<DeviceDocument> {
  const filter: mongoose.FilterQuery<DeviceDocument> = {}
  const where = findSpec.where
  if (typeof where.containsSearchTerm === 'string') {
    const searchRegex = new RegExp(_.escapeRegExp(where.containsSearchTerm), 'i')
    filter.$or = [
      { uid: searchRegex },
      { userAgent: searchRegex },
      { description: searchRegex },
    ]
  }
  if (Array.isArray(where.userIdIsAnyOf) && where.userIdIsAnyOf.length) {
    const userIdFilter = { $in: where.userIdIsAnyOf }
    if (Array.isArray(filter.$or)) {
      filter.$or.push({ userId: userIdFilter })
    }
    else {
      filter.userId = userIdFilter
    }
  }
  if (typeof where.registered === 'boolean') {
    filter.registered = where.registered
  }
  return filter
}