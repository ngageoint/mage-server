import { User } from '../entities/users/entities.users'
import { Device, DeviceId } from '../entities/devices/entities.devices'
import { MageEventId } from '../entities/events/entities.events'
import { TeamId } from '../entities/teams/entities.teams'
import { UserExpanded, UserId } from '../entities/users/entities.users'
import { RoleId } from '../entities/authorization/entities.authorization'
import { PageOf, PagingParameters } from '../entities/entities.global'

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
  readSessionByToken(token: string): Promise<Session | null>
  createOrRefreshSession(userId: UserId, deviceId?: string): Promise<Session>
  deleteSession(token: string): Promise<Session | null>
  deleteSessionsForUser(userId: UserId): Promise<number>
  deleteSessionsForDevice(deviceId: DeviceId): Promise<number>
}

/**
 * An authentication protocol defines the sequence of messages between a user, a service provider (Mage), and an
 * identity provider (Google, Meta, Okta, Auth0, Microsoft, GitHub) necessary to securely inform the service provider
 * that the user is valid.  Authentication protocols are OpenID Connect, OAuth, SAML, LDAP, and Mage's own local
 * password authentication database.
 */
export type AuthenticationProtocolId = 'local' | 'ldap' | 'oauth' | 'oidc' | 'saml'

export type IdentityProviderId = string

/**
 * An identity provider (IDP) is a service that maintains user profiles and that Mage trusts to authenticate user
 * credentials using a specific authentication protocol.  Mage delegates user authentication to identity providers.
 * Within Mage, the identity provider's protocol implementation maps the provider's user profile/account attributes to
 * a Mage user profile.  This identity provider entity encapsulates the authentication protocol parameters to enable
 * communication to a specific identity provider service.
 */
export interface IdentityProvider {
  id: IdentityProviderId
  name: string
  title: string
  protocol: AuthenticationProtocolId
  protocolSettings: Record<string, any>
  enabled: boolean
  lastUpdated: Date
  userEnrollmentPolicy: UserEnrollmentPolicy
  deviceEnrollmentPolicy: DeviceEnrollmentPolicy
  textColor?: string
  buttonColor?: string
  icon?: Buffer
}

/**
 * Enrollment policy defines rules and effects to apply when a new user establishes a Mage account.
 */
export interface UserEnrollmentPolicy {
  /**
   * When true, an administrator must approve and activate new user accounts.
   */
  accountApprovalRequired: boolean
  assignRole: RoleId
  assignToTeams: TeamId[]
  assignToEvents: MageEventId[]
}

export interface DeviceEnrollmentPolicy {
  /**
   * When true, an administrator must approve and activate new devices associated with user accounts.
   */
  deviceApprovalRequired: boolean
}

/**
 * The identity provider user is the result of mapping a specific IDP account to a Mage user account.
 */
export type IdentityProviderUser = Pick<User, 'username' | 'displayName' | 'email' | 'phones'>
  & {
    idpAccountId?: string
    idpAccountAttrs?: Record<string, any>
  }

/**
 * A user ingress binding is the bridge between a Mage user and an identity provider account.  When a user attempts
 * to authenticate to Mage through an identity provider, a binding must exist between the Mage user account and the
 * identity provider for Mage to map the identity provider account to the Mage user account.
 */
export interface UserIngressBinding {
  idpId: IdentityProviderId
  created: Date
  updated: Date
  // TODO: evaluate for utility of disabling a single ingress/idp path for a user as opposed to the entire account
  // verified: boolean
  // enabled: boolean
  /**
   * The identity provider account ID is the identifier of the account native to the owning identity provider.  This is
   * only necessary if the identifier differs from the Mage account's username, especially if a Mage account has
   * multiple ingress bindings for different identity providers with different account identifiers.
   */
  idpAccountId?: string
  /**
   * Any attributes the identity provider or protocol needs to persist about the account mapping
   */
  idpAccountAttrs?: Record<string, any>
}

export type UserIngressBindings = {
  userId: UserId
  bindingsByIdp: Map<IdentityProviderId, UserIngressBinding>
}

export type IdentityProviderMutableAttrs = Omit<IdentityProvider, 'id' | 'name' | 'protocol'>

export interface IdentityProviderRepository {
  findIdpById(id: IdentityProviderId): Promise<IdentityProvider | null>
  findIdpByName(name: string): Promise<IdentityProvider | null>
  /**
   * Update the IDP according to patch semantics.  Remove keys in the given update with `undefined` values from the
   * saved record.  Keys not present in the given update will have no affect on the saved record.
   */
  updateIdp(update: Partial<IdentityProviderMutableAttrs> & Pick<IdentityProvider, 'id'>): Promise<IdentityProvider | null>
  deleteIdp(id: IdentityProviderId): Promise<IdentityProvider | null>
}

export interface UserIngressBindingsRepository {
  /**
   * Return null if the user has no persisted bindings entry.
   */
  readBindingsForUser(userId: UserId): Promise<UserIngressBindings | null>
  readAllBindingsForIdp(idpId: IdentityProviderId, paging?: PagingParameters): Promise<PageOf<UserIngressBindings>>
  /**
   * Save the given ingress binding to the bindings dictionary for the given user, creating or updating as necessary.
   * Return the modified ingress bindings.
   */
  saveUserIngressBinding(userId: UserId, binding: UserIngressBinding): Promise<UserIngressBindings | Error>
  /**
   * Return the binding that was deleted, or null if the user did not have a binding to the given IDP.
   */
  deleteBinding(userId: UserId, idpId: IdentityProviderId): Promise<UserIngressBinding | null>
  /**
   * Return the bindings that were deleted for the given user, or null if the user had no ingress bindings.
   */
  deleteBindingsForUser(userId: UserId): Promise<UserIngressBindings | null>
  /**
   * Return the number of deleted bindings.
   */
  deleteAllBindingsForIdp(idpId: IdentityProviderId): Promise<number>
}

/**
 * Return a new user object from the given identity provider account information suitable to persist as newly enrolled
 * user.  The enrollment policy for the identity provider determines the `active` flag and assigned role for the new
 * user.
 */
export function createEnrollmentCandidateUser(idpAccount: IdentityProviderUser, idp: IdentityProvider): Omit<User, 'id'> {
  const policy = idp.userEnrollmentPolicy
  const now = new Date()
  const candidate: Omit<User, 'id'> = {
    active: !policy.accountApprovalRequired,
    roleId: policy.assignRole,
    enabled: true,
    createdAt: now,
    lastUpdated: now,
    avatar: {},
    icon: {},
    recentEventIds: [],
    ...idpAccount
  }
  return candidate
}
