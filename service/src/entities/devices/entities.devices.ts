import { PageOf, PagingParameters } from '../entities.global'
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
  /**
   * A registered device is one that has received approval from an administrator to access the Mage server.
   */
  registered: boolean
  /**
   * The device's `userId` is the user that owns the device.  If the user ID is null, multiple users may access Mage
   * with the device.
   */
  userId?: UserId | null
  userAgent?: string | undefined
  appVersion?: string | undefined
}

/**
 * The related user entry will have only the user's ID and display name, but no other attributes.
 */
export type DeviceExpanded = Device & { user: Pick<User, 'id' | 'displayName'> | null }

export interface FindDevicesSpec {
  where: {
    /**
     * If present and `true` or `false`, match only devices with that value for the `registered` property.  Otherwise,
     * match any device regardless of registered status.
     */
    registered?: boolean | null | undefined
    /**
     * Match only devices whose `userAgent`, `description`, or `uid` contain the given search term.
     */
    containsSearchTerm?: string | null | undefined
    /**
     * Match devices whose `userId` is in the given array.  This constraint is independent of `containsSearchTerm`, but
     * subject to the `registered` constraint.
     */
    userIdIsAnyOf?: UserId[]
  }
  /**
   * If `true`, return {@link DeviceExpanded results}
   */
  expandUser?: boolean | undefined
  paging: PagingParameters
}

export interface DeviceRepository {
  create(deviceAttrs: Omit<Device, 'id'>): Promise<Device>
  update(deviceAttrs: Partial<Device> & Pick<Device, 'id'>): Promise<Device | null>
  removeById(id: DeviceId): Promise<Device | null>
  findById(id: DeviceId): Promise<null | Device>
  findByUid(uid: DeviceUid): Promise<null | Device>
  findSome(findSpec: FindDevicesSpec & { expandUser: false | undefined | never }): Promise<PageOf<Device>>
  findSome(findSpec: FindDevicesSpec & { expandUser: true }): Promise<PageOf<DeviceExpanded>>
  countSome(findSpec: FindDevicesSpec): Promise<number>
}