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
 *
 * KNOWN GAP: `teamIsAnyOf` is resolved via a global `teamRepo.findAllByIds()` lookup with no check
 * that the given team ids actually belong to the event the caller is scoping to (observation/location
 * search callers have a `context.mageEvent` available, but don't pass its teams in here). A team id
 * for a team that was removed from the event - or that never belonged to it - still resolves normally
 * and narrows results to that team's current membership.
 *
 * A correct fix needs the event's own team list, which isn't cheaply available yet: the event fetch
 * this event context is built from (`EventRepository.findById`) does not populate `teams`; the only
 * existing code that does is `findTeamsInEvent()` in `adapters.events.db.mongoose.ts`, which is itself
 * marked `TODO: this is misplaced; create a team repository` and isn't wired into this request path.
 * Fixing this means adding that event-team fetch (an extra DB round trip) to this function or its
 * call sites (observation read, location read/recent, and likely exports), without disturbing the
 * "team resolves to zero current members -> unconstrained" behavior documented above, which is a
 * distinct, intentional case from "team id isn't associated with this event at all".
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
