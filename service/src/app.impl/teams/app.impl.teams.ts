import * as api from '../../app.api/teams/app.api.teams';
import { TeamRepository } from '../../entities/teams/entities.teams';
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global';
import { PageOf } from '../../entities/entities.global';

export function SearchTeams(teamRepo: TeamRepository,permissions: api.TeamsPermissionService
): api.SearchTeams {
  return async function searchTeams(req: api.TeamSearchRequest): ReturnType<api.SearchTeams> {
    return await withPermission<PageOf<api.TeamSearchResult>,KnownErrorsOf<api.SearchTeams>>(
      permissions.ensureReadTeamsPermission(req.context),
      async (): Promise<PageOf<api.TeamSearchResult>> => {
        return await teamRepo.find<api.TeamSearchResult>(req.teamSearch)
      }
    );
  };
}
