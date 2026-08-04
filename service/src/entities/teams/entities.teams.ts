import { UserId } from '../users/entities.users'
import { MageEventId } from '../events/entities.events'
import { PageOf, PagingParameters } from '../entities.global'

export type TeamId = string

export interface Team {
  id: TeamId
  name: string
  description?: string
  userIds: UserId[]
  acl: TeamAcl
  /**
   * If a `Team` has a `teamEventId`, the team is the implicit _event team_
   * that MAGE creates for each event.  When an event manager or administrator
   * adds participant users to an event individually, as opposed to an entire
   * team, MAGE places the users in the event's _event team_.
   */
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

export interface TeamRepository {
  findById(id: TeamId): Promise<Team | null>
  findAllByIds(ids: TeamId[]): Promise<{ [id: string]: Team | null }>
  find<MappedResult>(which?: TeamFindParameters, mapping?: (team: Team) => MappedResult): Promise<PageOf<MappedResult>>
}

export interface TeamFindParameters extends PagingParameters {
  /**
   * Search for teams whose name or description matches the given term.
   */
  searchTerm?: string | undefined,
  /**
   * If `true`, exclude teams that exist only to group users directly into events.
   * If omitted, the default is `false`.
   */
  omitEventTeams?: boolean | undefined,
  /**
   * Include only teams that contain the given member user IDs.
   */
  withMembers?: string[] | undefined,
  /**
   * Include only teams that do not contain the given member user IDs.
   */
  withoutMembers?: string[] | undefined
}
