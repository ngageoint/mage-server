import * as api from '../../app.api/teams/app.api.teams';
import { Team, TeamId, TeamRepository } from '../../entities/teams/entities.teams'
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global';
import { PageOf } from '../../entities/entities.global';
import { UserId } from '../../entities/users/entities.users'

export function SearchTeams(teamRepo: TeamRepository,permissions: api.TeamsPermissionService
): api.SearchTeams {
  return async function searchTeams(req: api.TeamSearchRequest): ReturnType<api.SearchTeams> {
    return await withPermission<PageOf<Team>,KnownErrorsOf<api.SearchTeams>>(
      permissions.ensureReadTeamsPermission(req.context),
      async (): Promise<PageOf<Team>> => {
        return await teamRepo.find<Team>(req.teamSearch)
      }
    );
  };
}

/**
 * Merges an optional explicit user id list with the members of an optional team id list into a
 * single deduped user id list. Returns `undefined`, not an empty array, when neither input narrows
 * the result at all, or when a given team id list resolves to no members - callers should treat
 * `undefined` as "unconstrained" rather than "matches no one".
 */
export async function resolveUserIsAnyOf(
  teamRepo: TeamRepository,
  userIsAnyOf?: UserId[],
  teamIsAnyOf?: TeamId[]
): Promise<UserId[] | undefined> {
  if (!teamIsAnyOf?.length) {
    return userIsAnyOf?.length ? userIsAnyOf : undefined
  }
  const teams = await teamRepo.findAllByIds(teamIsAnyOf)
  const teamUserIds = Object.values(teams).flatMap(team => team?.userIds ?? [])
  const resolved = [ ...new Set([ ...(userIsAnyOf ?? []), ...teamUserIds ]) ]
  return resolved.length ? resolved : undefined
}
