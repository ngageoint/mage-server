import { User, UserId } from '../users/entities.users'
import { Device, DeviceId } from '../devices/entities.devices'

export type LoginId = string

export interface Login {
  id: LoginId
  timestamp: Date
  user: User | UserId
  device?: Device | DeviceId
}

export interface LoginFilter {
  userId?: UserId
  deviceId?: DeviceId | { $in: DeviceId[] }
  startDate?: Date
  endDate?: Date
}

export interface LoginPaging {
  limit?: number
  lastLoginId?: LoginId | null
  firstLoginId?: LoginId | null
}

export interface LoginRepository {
  findMany(filter: LoginFilter, paging: LoginPaging): Promise<Login[]>
  create(attrs: Partial<Login>): Promise<Login>
  removeManyForUser(userId: UserId): Promise<void>
}
