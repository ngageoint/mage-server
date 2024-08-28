import { PagingParameters, PageOf } from '../entities.global'
import { Role } from '../authorization/entities.authorization'
import { MageEventId } from '../events/entities.events'

export type UserId = string

export interface User {
  id: UserId
  username: string
  displayName: string
  /**
   * Active indicates whether an admin approved the user account.  This flag only ever changes value one time.
   */
  active: boolean
  /**
   * The enabled flag indicates whether a user can access Mage and preform any operations.  An administrator can
   * disable a user account at any time to block the user's access.
   */
  enabled: boolean
  createdAt: Date
  lastUpdated: Date
  roleId: string
  email?: string
  phones: Phone[]
  /**
   * A user's avatar is the profile picture that represents the user in list
   * views and such.
   * TODO: make this nullable rather than an empty object. that is a symptom of the mongoose schema. make sure a null value does not break clients
   */
  avatar: Avatar
  /**
   * A user's icon is to indicate the user's location on a map display.
   */
  icon: UserIcon
  recentEventIds: MageEventId[]
}

export type UserExpanded = Omit<User, 'roleId'>
  & { role: Role }

export interface Phone {
  type: string,
  number: string
}

/**
 * TODO: There is not much value to retaining the `type`, `text`, and `color` attributes.  Only the web app's user
 * admin screen uses these to set default form values, but the web app always generates a raster png from those values
 * anyway.
 */
export interface UserIcon {
  /**
   * Type defaults to {@link UserIconType.None} via database layer.
   */
  type: UserIconType
  text?: string
  color?: string
  contentType?: string
  size?: number
  relativePath?: string
}

export enum UserIconType {
  None = 'none',
  Upload = 'upload',
  Create = 'create',
}

export interface Avatar {
  contentType?: string,
  size?: number,
  relativePath?: string
}

export interface UserRepository {
  create(userAttrs: Omit<User, 'id' | 'icon' | 'avatar'>): Promise<User | UserRepositoryError>
  /**
   * Return `null` if the specified user ID does not exist.
   */
  update(userAttrs: Partial<User> & Pick<User, 'id'>): Promise<User | null | UserRepositoryError>
  findById(id: UserId): Promise<User | null>
  findAllByIds(ids: UserId[]): Promise<{ [id: string]: User | null }>
  find<MappedResult>(which?: UserFindParameters, mapping?: (user: User) => MappedResult): Promise<PageOf<MappedResult>>
  saveMapIcon(userId: UserId, icon: UserIcon, content: NodeJS.ReadableStream | Buffer): Promise<User | UserRepositoryError>
  saveAvatar(avatar: Avatar, content: NodeJS.ReadableStream | Buffer): Promise<User | UserRepositoryError>
  deleteMapIcon(userId: UserId): Promise<User | UserRepositoryError>
  deleteAvatar(userId: UserId): Promise<User | UserRepositoryError>
}

export interface UserFindParameters extends PagingParameters {
  /**
   * Search by user name, display name, email, or phone number.
   */
  nameOrContactTerm?: string | undefined
  active?: boolean | undefined
  enabled?: boolean | undefined
}

export class UserRepositoryError extends Error {
  constructor(public errorCode: UserRepositoryErrorCode, message?: string) {
    super(message)
  }
}

export enum UserRepositoryErrorCode {
  DuplicateUserName = 'DuplicateUserName',
  StorageError = 'StorageError',
}