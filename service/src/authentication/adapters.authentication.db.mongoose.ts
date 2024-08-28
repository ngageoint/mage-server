import crypto from 'crypto'
import mongoose, { Schema } from 'mongoose'
import { UserDocumentExpanded } from '../adapters/users/adapters.users.db.mongoose'
import { UserId } from '../entities/users/entities.users'
import { Session, SessionRepository } from './entities.authentication'

export interface SessionDocument {
  token: string
  expirationDate: Date
  userId: mongoose.Types.ObjectId
  deviceId?: mongoose.Types.ObjectId | undefined
}
export type SessionDocumentExpanded = SessionDocument & {
  userId: UserDocumentExpanded
}
export type SessionModel = mongoose.Model<SessionDocument>

const SessionSchema = new Schema<SessionDocument, SessionModel>(
  {
    token: { type: String, required: true },
    expirationDate: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
  },
  { versionKey: false }
)

// TODO: index token
SessionSchema.index({ token: 1 })
SessionSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

const populateSessionUserRole: mongoose.PopulateOptions = {
  path: 'userId',
  populate: 'roleId'
}

export function createSessionRepository(conn: mongoose.Connection, collectionName: string, sessionTimeoutSeconds: number): SessionRepository {
  const model = conn.model('Token', SessionSchema, collectionName)
  return Object.freeze({
    model,
    async findSessionByToken(token: string): Promise<Session | null> {
      const doc = await model.findOne({ token }).lean()
      if (!doc) {
        return null
      }
      return {
        token: doc.token,
        expirationDate: doc.expirationDate,
        user: doc.userId.toHexString(),
        device: doc.deviceId?.toHexString(),
      }
    },
    async createOrRefreshSession(userId: UserId, deviceId?: string): Promise<mongoose.HydratedDocument<Session>> {
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
    async removeSessionsForDevice(deviceId: string): Promise<number> {
      const { deletedCount } = await model.deleteMany({ deviceId: new mongoose.Types.ObjectId(deviceId) })
      return deletedCount
    }
  })
}
