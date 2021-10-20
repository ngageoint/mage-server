
/**
 * This type represents a MAGE user account.  This is a base type that defines
 * the properties of a persisted user that the server returns from a read
 * operation, like a user query.  This type does not necessarily reflect the
 * properties the client would send to the server API for mutation operations.
 */
export interface User {

  /**
   * Unique ID of the user account
   */
  id: string
  /**
   * Unique name for this user account
   */
  username: string
  displayName: string
  /**
   * Whether an admin has activated this user account after initial sign-up
   */
  active: boolean
  /**
   * Whether this account is enabled or diabled, typically by the manual action
   * of an administrator
   */
  enabled: boolean
  /**
   * The authentication method for this user account
   */
  authentication: any
  /**
   * ISO-8601 date string
   */
  createdAt: string
  /**
   * ISO-8601 date string
   */
  lastUpdated: string
  /**
   * The authorization role of this user account that defines the actions this
   * user account has permission to perform
   */
  roleId: string
  email?: string
  /**
   * URL of the image that identifies this user account in the user feed, etc.;
   * a profile picture
   */
  avatarUrl?: string
  /**
   * Map marker icon info
   */
  icon?: UserIcon
  /**
   * URL of the map marker icon image
   */
  iconUrl?: string
  phones: UserPhone[]
  /**
   * List of events in which this user account has participated
   */
  recentEventIds: number[]
}

export interface UserPhone {
  type: string
  number: string
}

export interface UserIcon {
  /**
   * Hex color string beginning with `#`
   */
  color: string
  /**
   * A standard media type, e.g., `image/png`
   */
  contentType: string
  /**
   * Size in bytes of the icon image
   */
  size: number
  text: string
  /**
   * The source type of the icon
   */
  type: 'create' | 'upload' | 'none'
}
