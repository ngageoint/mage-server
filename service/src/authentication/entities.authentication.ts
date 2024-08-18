import { Device, DeviceId } from '../entities/devices/entities.devices'
import { UserExpanded, UserId } from '../entities/users/entities.users'

export interface Session {
  token: string
  expirationDate: Date
  user: UserId
  device?: DeviceId | null
}

export type SessionExpanded = Omit<Session, 'user' | 'device'> & {
  user: UserExpanded
  device: Device
}

export interface SessionRepository {
  findSessionByToken(token: string): Promise<Session | null>
  createOrRefreshSession(userId: UserId, deviceId?: string): Promise<Session>
  removeSession(token: string): Promise<void>
  removeSessionsForUser(userId: UserId): Promise<number>
  removeSessionForDevice(deviceId: DeviceId): Promise<number>
}