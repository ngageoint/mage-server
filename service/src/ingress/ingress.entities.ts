import { User } from '../entities/users/entities.users'
import { Device, DeviceId } from '../entities/devices/entities.devices'
import { MageEventId } from '../entities/events/entities.events'
import { TeamId } from '../entities/teams/entities.teams'
import { UserExpanded, UserId } from '../entities/users/entities.users'
import { RoleId } from '../entities/authorization/entities.authorization'

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
  removeSession(token: string): Promise<Session | null>
  removeSessionsForUser(userId: UserId): Promise<number>
  removeSessionsForDevice(deviceId: DeviceId): Promise<number>
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

export interface IdentityProviderHooks {
  /**
   * Indicate that a user has authenticated with the given identity provider and Mage can continue enrollment and/or
   * establish a session for the user.
   */
  admitUserFromIdentityProvider(account: IdentityProviderUser, idp: IdentityProvider): unknown
  /**
   * Indicate the given user has ended their session and logged out of the given identity provider, or the user has
   * revoked access for Mage to use the IDP for authentication.
   */
  terminateSessionsForUser(username: string, idp: IdentityProvider): unknown
  accountDisabled(username: string, idp: IdentityProvider): unknown
  accountEnabled(username: string, idp: IdentityProvider): unknown
}

export interface IdentityProviderRepository {
  findIdpById(id: IdentityProviderId): Promise<IdentityProvider | null>
  findIdpByName(name: string): Promise<IdentityProvider | null>
  /**
   * Update the IDP according to patch semantics.  Remove keys in the given update with `undefined` values from the
   * saved record.  Keys not present in the given update will have no affect on the saved record.
   */
  updateIdp(update: Partial<IdentityProvider> & Pick<IdentityProvider, 'id'>): Promise<IdentityProvider | null>
  deleteIdp(id: IdentityProviderId): Promise<IdentityProvider | null>
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
