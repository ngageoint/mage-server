import { UserJson, UserModelInstance } from '../../models/user'
import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import mongoose, { Model, PopulatedDoc, Schema } from 'mongoose'
import { UserDocument } from '../users/adapters.users.db.mongoose'
import { Device, DeviceId, DeviceReadOptions, DevicesRepository } from '../../entities/devices/entities.devices'

export type DeviceDocument = Omit<Device, | 'userId'> & mongoose.Document<mongoose.Types.ObjectId> & {
  userId: PopulatedDoc<UserDocument> | null
}

export type DeviceModel = Model<DeviceDocument>
export const DeviceModelName = 'Device'

const DeviceSchema = new mongoose.Schema<any>({
  uid: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: false },
  registered: { type: Boolean, required: true, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userAgent: { type: String, required: false },
  appVersion: { type: String, required: false }
},{
  versionKey: false
})

export function DeviceModel(conn: mongoose.Connection, collection?: string): DeviceModel {
  return conn.model(DeviceModelName, DeviceSchema, collection || 'devices') as any
}

export class MongooseDeviceRepository extends BaseMongooseRepository<DeviceDocument, DeviceModel, Device> implements DevicesRepository {
  constructor(
    model: mongoose.Model<DeviceDocument>
  ) {
    super(model, {
      docToEntity: doc => {
        const deviceJson = doc.toJSON<Device>()
        if (doc.userId) {
          const userId = doc.userId._id.toHexString()
          if (doc.populated('userId')) {
            const userJson = (doc.userId as UserModelInstance).toJSON<UserJson>()
            deviceJson.user = {
              ...userJson,
              id: userId,
              roleId: userJson.role ? userJson.role.id : userJson.roleId,
              authenticationId: userJson.authentication ? userJson.authentication.id : userJson.authenticationId
            }
          }
          else {
            doc.user = userId
          }
        }
        return deviceJson
      }
    })
  }

  getDeviceById(deviceId: DeviceId, options?: DeviceReadOptions): Promise<Device | null> {
    let query = this.model.findById<DeviceDocument>(deviceId);
    if (options?.populateUser) {
      query = query.populate('userId')
    }

    return query.exec()
  }
}
