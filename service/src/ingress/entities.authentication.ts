import { Device, DeviceId } from '../entities/devices/entities.devices'
import { MageEventId } from '../entities/events/entities.events'
import { TeamId } from '../entities/teams/entities.teams'
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
  removeSessionsForDevice(deviceId: DeviceId): Promise<number>
}

/**
 * An authentication protocol defines the sequence of messages between a user, a service provider (Mage), and an
 * identity provider (Google, Meta, Okta, Auth0, Microsoft, GitHub) necessary to securely inform the service provider
 * that the user is valid.  Authentication protocols are OpenID Connect, OAuth, SAML, LDAP, and Mage's own local
 * password authentication database.
 */
export interface AuthenticationProtocol {
  name: string
}

/**
 * An identity provider (IDP) is a service maintains user profiles and that Mage trusts to authenticate user
 * credentials via a specific authentication protocol.  Mage delegates user authentication to identity providers.
 * Within Mage, the identity provider implementation maps the provider's user profile/account attributes to a Mage
 * user profile.
 */
export interface IdentityProvider {
  name: string
  title: string
  protocol: AuthenticationProtocol
  protocolSettings: Record<string, any>
  enabled: boolean
  lastUpdated: Date
  enrollmentPolicy: EnrollmentPolicy
  description?: string | null
  textColor?: string | null
  buttonColor?: string | null
  icon?: Buffer | null
}

/**
 * Enrollment policy defines rules and effects to apply when a new user establishes a Mage account.
 */
export interface EnrollmentPolicy {
  assignToTeams: TeamId[]
  assignToEvents: MageEventId[]
  requireAccountApproval: boolean
  requireDeviceApproval: boolean
}



export interface IdentityProviderRepository {
  findById(): Promise<IdentityProvider | null>
  findByName(name: string): Promise<IdentityProvider | null>
}