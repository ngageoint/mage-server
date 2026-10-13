import mongoose, { PopulatedDoc } from 'mongoose'
import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { Login, LoginFilter, LoginPaging, LoginRepository } from '../../entities/logins/entities.logins'
import { User } from '../../entities/users/entities.users'
import { UserDocument } from '../users/adapters.users.db.mongoose'
import { UserJson, UserModelInstance } from '../../models/user'
import { DeviceDocument } from '../devices/adapters.devices.db.mongoose'

/**
 * Mongoose adapter for the Login entity: owns the LoginSchema/LoginModel and
 * implements LoginRepository against it. models/login.js bridges the legacy
 * callback API onto this repository for callers (models/user.js, api/user.js)
 * not yet migrated to the new architecture.
 */

const Schema = mongoose.Schema

export const LoginModelName = 'Login'

export type LoginDocument = Omit<Login, 'id' | 'user' | 'device'> & {
  userId: PopulatedDoc<UserDocument> | null
  deviceId: PopulatedDoc<DeviceDocument> | null
}

export type LoginModel = mongoose.Model<LoginDocument>

export const LoginSchema = new Schema<LoginDocument, LoginModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' }
  },
  {
    versionKey: false
  }
)

LoginSchema.index({ userId: 1 })
LoginSchema.index({ deviceId: 1 })
LoginSchema.index({ userId: 1, deviceId: 1 })
LoginSchema.index({ _id: 1, userId: 1, deviceId: 1 })

export function LoginModel(conn: mongoose.Connection, collection?: string): LoginModel {
  return (conn.models[LoginModelName] as LoginModel) || conn.model<LoginDocument, LoginModel>(LoginModelName, LoginSchema, collection)
}

function objectIdForDate(date: Date): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(Math.floor(date.valueOf() / 1000).toString(16) + '0000000000000000')
}

export class MongooseLoginRepository extends BaseMongooseRepository<LoginDocument, LoginModel, Login> implements LoginRepository {

  constructor(model: LoginModel) {
    super(model, {
      entityToDocStub: attrs => {
        const stub: Partial<LoginDocument> = {}
        if (attrs.user) {
          stub.userId = (typeof attrs.user === 'string' ? attrs.user : attrs.user.id) as any
        }
        if (attrs.device) {
          stub.deviceId = (typeof attrs.device === 'string' ? attrs.device : attrs.device.id) as any
        }
        return stub
      },
      docToEntity: doc => {
        let user: User | string | undefined = doc.userId?._id.toHexString()
        if (doc.populated('userId') && doc.userId) {
          const userJson = (doc.userId as UserModelInstance).toJSON<UserJson>()
          user = {
            ...userJson,
            id: userJson.id.toHexString(),
            roleId: userJson.role ? userJson.role.id : userJson.roleId,
            authenticationId: userJson.authentication ? userJson.authentication.id : userJson.authenticationId
          }
        }

        let device: string | undefined = doc.deviceId?._id.toHexString()
        if (doc.populated('deviceId') && doc.deviceId) {
          device = (doc.deviceId as any).toJSON()
        }

        return {
          id: doc._id.toHexString(),
          timestamp: doc._id.getTimestamp(),
          user: user as User | string,
          device
        }
      }
    })
  }

  async findMany(filter: LoginFilter, paging: LoginPaging): Promise<Login[]> {
    const conditions: any = {}

    if (filter.userId) {
      conditions.userId = filter.userId
    }
    if (filter.deviceId) {
      conditions.deviceId = filter.deviceId
    }
    if (filter.startDate) {
      conditions._id = { $gte: objectIdForDate(filter.startDate) }
    }
    if (filter.endDate) {
      conditions._id = conditions._id || {}
      conditions._id.$lte = objectIdForDate(filter.endDate)
    }
    if (paging.lastLoginId) {
      conditions._id = conditions._id || {}
      conditions._id.$lt = new mongoose.Types.ObjectId(paging.lastLoginId)
    }
    if (paging.firstLoginId) {
      conditions._id = conditions._id || {}
      conditions._id.$gt = new mongoose.Types.ObjectId(paging.firstLoginId)
    }

    const queryOptions = {
      limit: paging.limit || 10,
      sort: {
        _id: paging.firstLoginId ? 1 : -1
      }
    }

    const docs = await this.model.find(conditions, null, queryOptions).populate([{ path: 'userId' }, { path: 'deviceId' }]).exec()
    const logins = docs.map(this.entityForDocument)
    return paging.firstLoginId ? logins.reverse() : logins
  }

  async removeManyForUser(userId: string): Promise<void> {
    await this.model.deleteMany({ userId })
  }
}
