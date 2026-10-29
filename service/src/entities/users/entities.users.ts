import assert from 'node:assert'
import { PagingParameters, PageOf } from '../entities.global'
import { Role } from '../authorization/entities.authorization'
import { Authentication } from '../authentication/entities.authentication'
import { MageEventId } from '../events/entities.events'
import { FormId } from '../events/entities.events.forms'

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
  /**
   * The user icon is the icon that represents the user's location on a map view.
   */
  icon?: UserIcon | null | undefined
  /**
   * The user avatar appears in list views and user profile views.
   */
  avatar?: Avatar | null | undefined
  roleId: string
  /**
   * TODO: Invert this relationship key to keep the user account entity clean and
   * separate from the authentication/identity provider protocol.  That will also
   * allow the potential for multiple identity providers to map to one Mage account,
   * and facilitate migrating accounts from one identity provider to another.
   */
  authenticationId: string
  /**
   * A user can set a message to notify others of the user's current status.
   * TODO: A timestamp on the status message seems useful, and maybe expiration logic.
   */
  status?: string | null | undefined
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
  /**
   * TODO: This might be irrelevant after the icon is actually saved and could be
   * a candidate to remove from the model.
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

/**
 * A user's avatar is the profile picture that represents the user in list
 * views and such.
 * TODO: This can potentially be removed from the core user entity.  This
 * information is
 */
export interface Avatar {
  contentType?: string,
  size?: number,
  relativePath?: string
}



export class DuplicateUsernameError extends Error {

  username: string

  constructor(username: string) {
    super(`username ${username} already exists`)
    this.username = username
  }
}

export type UserAccountSeedSpec = Omit<User, 'id' | 'createdAt' | 'lastUpdated'>

const PreparedUserConstructorToken = Symbol()

export class UserAccountSeed implements Readonly<UserAccountSeedSpec> {

  static prepare(account: UserAccountSeedSpec): UserAccountSeed {
    return new UserAccountSeed(account, PreparedUserConstructorToken)
  }

  get username(): string { return this.#seed.username }
  get displayName(): string { return this.#seed.displayName }
  get active(): boolean { return this.#seed.active }
  get enabled(): boolean { return this.#seed.enabled }
  get email(): string | undefined { return this.#seed.email }
  get phones(): Phone[] { return this.#seed.phones }
  get icon(): UserIcon | null | undefined { return this.#seed.icon }
  get avatar(): Avatar | null | undefined { return this.#seed.avatar }
  get roleId(): string { return this.#seed.roleId }
  get authenticationId(): string { return this.#seed.authenticationId }

  #seed: UserAccountSeedSpec

  private constructor(...args: unknown[]) {
    assert(args[0] === PreparedUserConstructorToken, Error('illegal private constructor access'))
    const spec = args[1] as UserAccountSeedSpec
    this.#seed = {
      roleId: spec.roleId,
      authenticationId: spec.authenticationId,
      username: spec.username.toLowerCase(),
      displayName: spec.displayName,
      active: spec.active,
      enabled: spec.enabled,
      email: spec.email,
      ...{ icon: spec.icon },
      phones: spec.phones.map(x => ({ ...x })),
      icon: spec.icon ? { ...spec.icon } : undefined,
      avatar: spec.avatar ? { ...spec.avatar } : undefined,
    }
  }
}

export type UserCreateResult =
  | {
    user: User,
    error?: undefined
  }
  | {
    user?: undefined
    error: DuplicateUsernameError
  }


export interface UserRepository {
  findById(id: UserId): Promise<User | null>
  findAllByIds(ids: UserId[]): Promise<Record<UserId, User | null>>
  find<MappedResult>(which?: UserFindParameters, mapping?: (user: User) => MappedResult): Promise<PageOf<MappedResult>>
  createUser(account: UserAccountSeed): Promise<UserCreateResult>
}

export interface UserFindParameters extends PagingParameters {
  /**
   * Search by user name, display name, email, or phone number.
   */
  nameOrContactTerm?: string | undefined
  active?: boolean | undefined
  enabled?: boolean | undefined
}

export interface UserIconContentStore {
  readContent(user: User): Promise<NodeJS.ReadableStream | null | UserIconStoreError>
}

export class UserIconStoreError extends Error {
  constructor(readonly errorCode: UserIconStoreErrorCode, message?: string) {
    super(message)
    this.name = errorCode
  }
}

export enum UserIconStoreErrorCode {
  /**
   * The underlying storage system, e.g. file system, raised an error during
   * some I/O operation.
   */
  StorageError = 'UserIconStoreError.StorageError'
}

export interface UserPreference {
  events: { [key: number]: EventPreference }
}

export interface EventPreference {
  forms: { [key: number]: FormPreference }
}

export interface FormPreference {
  fields: { [key: string]: FieldPreference }
}

export interface FieldPreference {
  recentChoices: RecentChoice[]
}

export type RecentChoice = string

export type AddRecentFormFieldChoiceParams = {
  eventId: MageEventId
  formId: FormId
  fieldName: string
  choice: string
}

export type AddRecentFormFieldChoiceEntry = AddRecentFormFieldChoiceParams & {
  recentChoicesLimit?: number
}

export interface UserPreferenceRepository {
  getPreferences(userId: UserId): Promise<UserPreference | null>
  getEventPreferences(userId: UserId, eventId: MageEventId): Promise<EventPreference | null>
  /**
   * Record the given recent form field choices for the user in a single
   * write, rather than a separate read-modify-write round trip per choice.
   */
  addRecentFormFieldChoices(userId: UserId, choices: AddRecentFormFieldChoiceEntry[]): Promise<UserPreference>
}

