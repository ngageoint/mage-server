import crypto from 'crypto'
import mongoose, { Schema } from 'mongoose'
import { UserDocumentExpanded } from '../adapters/users/adapters.users.db.mongoose'
import { UserId } from '../entities/users/entities.users'

export interface SessionDocument {
  token: string
  expirationDate: Date
  userId?: mongoose.Types.ObjectId | undefined
  deviceId?: mongoose.Types.ObjectId | undefined
}
export type SessionDocumentExpanded = SessionDocument & {
  userId: UserDocumentExpanded
  deviceId?: mongoose.Document
}
export type SessionModel = mongoose.Model<SessionDocument>

const SessionSchema = new Schema<SessionDocument, SessionModel>(
  {
    token: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    expirationDate: { type: Date, required: true },
  },
  { versionKey: false }
)

// TODO: index token
SessionSchema.index({ token: 1 })
SessionSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

export interface SessionRepository {
  readonly model: SessionModel
  createOrRefreshSession(userId: UserId, deviceId?: string): Promise<SessionDocumentExpanded>
  removeSession(token: string): Promise<void>
  removeSessionsForUser(userId: UserId): Promise<number>
  removeSessionForDevice(deviceId: string): Promise<number>
}

const populateSessionUserRole: mongoose.PopulateOptions = {
  path: 'userId',
  populate: 'roleId'
}

export function createSessionRepository(conn: mongoose.Connection, collectionName: string, sessionTimeoutSeconds: number): SessionRepository {
  const model = conn.model('Token', SessionSchema, collectionName)
  return Object.freeze({
    model,
    async createOrRefreshSession(userId: UserId, deviceId?: string): Promise<mongoose.HydratedDocument<SessionDocumentExpanded>> {
      const seed = crypto.randomBytes(20)
      const token = crypto.createHash('sha256').update(seed).digest('hex')
      const query: any = { userId: new mongoose.Types.ObjectId(userId) }
      if (deviceId) {
        query.deviceId = new mongoose.Types.ObjectId(deviceId)
      }
      const now = Date.now()
      const update = {
        token,
        expirationDate: new Date(now + sessionTimeoutSeconds * 1000)
      }
      return await model.findOneAndUpdate(query, update,
        { upsert: true, new: true, populate: populateSessionUserRole })
    },
    async removeSession(token: string): Promise<void> {
      await model.deleteOne({ token })
    },
    async removeSessionsForUser(userId: UserId): Promise<number> {
      const { deletedCount } = await model.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
      return deletedCount
    },
    async removeSessionForDevice(deviceId: string): Promise<number> {
      const { deletedCount } = await model.deleteMany({ deviceId: new mongoose.Types.ObjectId(deviceId) })
      return deletedCount
    }
  })
}
