import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { Team } from './team.model'
import { PageOf, PagingParameters } from 'core-lib-src/paging'
import { User } from 'core-lib-src/user'

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  constructor(private http: HttpClient) { }

  createTeam(teamData: Partial<Team>): Observable<Team> {
    return this.http.post<Team>('/api/teams', teamData);
  }

  editTeam(id: string, teamData: Partial<Team>): Observable<Team> {
    return this.http.put<Team>(`/api/teams/${id}`, teamData);
  }

  getTeamById(id: string): Observable<Team> {
    return this.http.get<Team>(`/api/teams/${id}`);
  }

  getMembers(spec: TeamMemberSearch): Observable<PageOf<User>> {
    return this.#searchUsersByTeamRelationship('members', spec)
  }

  getNonMembers(spec: TeamMemberSearch): Observable<PageOf<User>> {
    return this.#searchUsersByTeamRelationship('nonMembers', spec)
  }

  #searchUsersByTeamRelationship(rel: 'members' | 'nonMembers', spec: TeamMemberSearch): Observable<PageOf<User>> {
    const params = new HttpParams()
      .set('page', String(spec.pageIndex))
      .set('page_size', String(spec.pageSize))
    if (spec.includeTotalCount) {
      params.set('total', true)
    }
    if (spec.term) {
      params.set('term', spec.term);
    }
    return this.http.get<PageOf<User>>(`/api/teams/${spec.teamId}/${rel}`, { params });
  }

  deleteTeam(id: string): Observable<any> {
    return this.http.delete(`/api/teams/${id}`);
  }

  addUserToTeam(teamId: string, user: User): Observable<any> {
    return this.http.post(`/api/teams/${teamId}/users`, user);
  }

  removeMember(teamId: string, userId: string): Observable<any> {
    return this.http.delete(`/api/teams/${teamId}/users/${userId}`);
  }

  /**
   * Updates a user's role in a team.
   *
   * @param teamId - The ID of the team
   * @param userId - The ID of the user
   * @param role - The new role for the user ('OWNER', 'MANAGER', or 'GUEST')
   * @returns Observable that will emit the updated team
   */
  updateUserRole(teamId: string, userId: string, role: string): Observable<Team> {
    return this.http.put<Team>(`/api/teams/${teamId}/acl/${userId}`, { role });
  }

  search(which: TeamSearch): Observable<PageOf<TeamSearchResult>> {
    const queryParams: SearchQueryParams = {
      page_size: String(which.pageSize),
      page: String(which.pageIndex),
    }
    if (typeof which.term === 'string') {
      queryParams.term = which.term
    }
    if (typeof which.includeTotalCount === 'boolean') {
      queryParams.total = which.includeTotalCount ? 'true' : 'false'
    }
    return this.http.get<PageOf<TeamSearchResult>>('/api/next-teams/search', {
      params: queryParams
    })
  }
}

export interface TeamSearch extends PagingParameters {
  /**
   * Return teams whose name and/or description contain the given term.
   */
  term?: string | null | undefined
  /**
   * Return only teams that have the given users IDs as members.
   */
  members?: Array<User['id']>
  /**
   * When `true`, exclude teams that are coupled to a specific event and
   * exist only to capture direct event membership.
   */
  omitEventTeams?: boolean
}

export interface TeamMemberSearch extends TeamSearch {
  teamId: Team['id']
}

export type TeamSearchResult = Pick<Team, 'id' | 'name' | 'description' | 'acl'>

type SearchQueryParams = {
  page_size: string,
  page: string,
  term?: string,
  total?: 'true' | 'false'
}
