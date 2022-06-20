import { PagingParameters, PageOf } from '../entities.global'
import { Role } from '../authorization/entities.authorization'
import { Authentication } from '../authentication/entities.authentication'

export type UserId = string

export interface User {
  id: UserId
  username: string
  displayName: string
  active: boolean
  enabled: boolean
  createdAt: Date
  lastUpdated: Date
  email?: string
  phones: Phone[]
  roleId: string
  authenticationId: string
  // TODO: the rest of the properties
}

export type UserExpanded = Omit<User, 'roleId' | 'authenticationId'>
  & {
    role: Role
    authentication: Authentication
  }

export interface Phone {
  type: string,
  number: string
}

/**
 * A user's icon is what appears on the map to mark the user's location.
 */
export interface UserIcon {
  type: UserIconType
  text: string
  color: string
  contentType?: string
  size?: number
  relativePath?: string
}

export enum UserIconType {
  None = 'none',
  Upload = 'upload',
  Create = 'create',
}

/**
 * A user's avatar is the profile picture that represents the user in list
 * views and such.
 */
export interface Avatar {
  contentType?: string,
  size?: number,
  relativePath?: string
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>
  findAllByIds(ids: UserId[]): Promise<{ [id: string]: User | null }>
  find<MappedResult>(which?: UserFindParameters, mapping?: (user: User) => MappedResult): Promise<PageOf<MappedResult>>
}

export interface UserFindParameters extends PagingParameters {
  /**
   * Search by user name, display name, email, or phone number.
   */
  nameOrContactTerm?: string | undefined
  active?: boolean | undefined
  enabled?: boolean | undefined
}
