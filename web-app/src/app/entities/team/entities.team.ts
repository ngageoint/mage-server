import { EventId } from "../event/entities.event"

export type TeamId = string

export const TeamMemberRole = { Owner: 'OWNER', Manager: 'MANAGER', Guest: 'GUEST' } as const
export type TeamMemberRole = typeof TeamMemberRole[keyof typeof TeamMemberRole]

export const TeamMemberRolePermission = { Read: 'read', Update: 'update', Delete: 'delete' } as const
export type TeamMemberRolePermission = typeof TeamMemberRolePermission[keyof typeof TeamMemberRolePermission]

export type TeamAcl = Record<string, { role: TeamMemberRole, permissions: TeamMemberRolePermission[] }>

export type Team = {
  id: TeamId
  name: string
  description?: string
  userIds: string[]
  acl: TeamAcl
  teamEventId?: EventId
}

export type TeamById = Record<string, Team>
