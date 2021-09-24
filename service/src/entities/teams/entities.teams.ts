import { UserId } from '../users/entities.users'
import { MageEventId } from '../events/entities.events'

export type TeamId = string

export interface Team {
  id: TeamId
  name: string
  description?: string
  userIds: UserId[]
  acl: TeamAcl
  teamEventId?: MageEventId
}

export interface TeamAcl {
  [userId: string]: {
    role: TeamMemberRole,
    permissions: TeamMemberRolePermission[]
  }
}

export type TeamMemberRole = 'OWNER' | 'MANAGER' | 'GUEST'
export type TeamMemberRolePermission  = 'read' | 'update' | 'delete'