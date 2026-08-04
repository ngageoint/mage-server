import { User, UserId } from "../users/entities.users"

export type DeviceId = string

export type Device = {
  id: DeviceId
  uid: string
  description: string
  registered: boolean
  user: User | UserId | undefined
  userAgent: string
  appVersion: string
}

export interface DeviceReadOptions {
  populateUser?: boolean
}

export interface DevicesRepository {
  getDeviceById(deviceId: DeviceId, options?: DeviceReadOptions): Promise<Device | null>
}
