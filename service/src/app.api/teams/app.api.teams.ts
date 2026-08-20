import { AppResponse, AppRequest, AppRequestContext } from '../app.api.global'
import { PermissionDeniedError } from '../app.api.errors'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { Team } from '../../entities/teams/entities.teams'


export interface TeamSearchRequest extends AppRequest {
  teamSearch: PagingParameters & {
    /**
     * Find teams whose name or description match the given search term.
     */
    searchTerm?: string | undefined,
    omitEventTeams?: boolean | undefined,
    withMembers?: string[],
    withoutMembers?: string[]
  }
}

export interface SearchTeams {
  (req: TeamSearchRequest): Promise<AppResponse<PageOf<Team>, PermissionDeniedError>>
}

export interface TeamsPermissionService {
  ensureReadTeamsPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}
