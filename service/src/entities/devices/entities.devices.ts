import { PagingParameters } from '../entities.global'
import { User, UserId } from '../users/entities.users'

export type DeviceId = string
export type DeviceUid = string

export interface Device {
  id: DeviceId
  /**
   * The UID originates from the client, whereas the server generates ID.
   */
  uid: DeviceUid
  description?: string | undefined
  registered: boolean
  userId: UserId
  userAgent?: string | undefined
  appVersion?: string | undefined
}

export type DeviceExpanded = Device & { user: User | null }

export interface FindDevicesSpec {
  paging: PagingParameters
}

export interface DeviceRepository {
  create(deviceAttrs: Omit<Device, 'id'>): Promise<Device>
  update(deviceAttrs: Partial<Device>): Promise<Device | null>
  removeById(id: DeviceId): Promise<Device | null>
  removeByUid(uid: DeviceUid): Promise<Device | null>
  findById(id: DeviceId): Promise<null | DeviceExpanded>
  findByUid(uid: DeviceUid): Promise<null | DeviceExpanded>
  findSome(findSpec: FindDevicesSpec): Promise<Device[]>
  countSome(findSpec: FindDevicesSpec): Promise<number>
}