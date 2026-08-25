/**
 * This type represents a Mage team.  This is a base type that defines
 * the properties of a persisted team that the server returns from a read
 * operation, like a team query.  This type does not necessarily reflect the
 * properties the client would send to the server API for mutation operations.
 */
export interface Team {
  /**
   * Unique ID of the team
   */
  id: string
  /**
   * Unique name for this team
   */
  name: string
  description: string
  teamEventId?: number | null | undefined
  /**
   * List of users in this team
   */
  userIds: string[]
  acl: TeamAcl
}

export interface TeamAcl {
  [userId: string]: {
    role: TeamMemberRoleType
    permissions: TeamPermissionType[];
  };
}

export const TeamMemberRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  GUEST: 'GUEST',
} as const

export type TeamMemberRoleType = typeof TeamMemberRole[keyof typeof TeamMemberRole]

export const TeamPermission = {
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const

export type TeamPermissionType = typeof TeamPermission[keyof typeof TeamPermission]
