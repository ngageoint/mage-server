import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from './team';
import { User } from '@ngageoint/mage.web-core-lib/user';

export interface SearchOptions {
    populate?: boolean;
    limit?: number;
    sort?: { [key: string]: 1 | -1 };
    omit_event_teams?: boolean;
    term?: string;
    start?: string;
    id?: string;
    with_members?: string[];
    without_members?: string[];
}

export interface membersOptions extends SearchOptions {
    page?: number;
    page_size?: number;
}

interface membersResponse {
    pageSize?: number;
    page?: number;
    items: User[];
    totalCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class TeamsService {

    constructor(private http: HttpClient) { }

    getTeams(options: SearchOptions): Observable<any> {
        let params = new HttpParams();

        if (options.populate !== undefined) {
            params = params.set('populate', String(options.populate));
        }
        if (options.limit !== undefined) {
            params = params.set('limit', String(options.limit));
        }
        if (options.sort !== undefined) {
            params = params.set('sort', JSON.stringify(options.sort));
        }
        if (options.omit_event_teams !== undefined) {
            params = params.set('omit_event_teams', String(options.omit_event_teams));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.start !== undefined) {
            params = params.set('start', options.start);
        }
        if (options.with_members && options.with_members.length) {
            for (const m of options.with_members) {
                params = params.append('with_members', m);
            }
        }
        if (options.without_members && options.without_members.length) {
            for (const m of options.without_members) {
                params = params.append('without_members', m);
            }
        }

        return this.http.get('/api/teams', { params });
    }

    createTeam(teamData: Partial<Team>): Observable<Team> {
        return this.http.post<Team>('/api/teams', teamData);
    }

    editTeam(id: string, teamData: Partial<Team>): Observable<Team> {
        return this.http.put<Team>(`/api/teams/${id}`, teamData);
    }

    getTeamById(id: string): Observable<any> {
        return this.http.get<Team>(`/api/teams/${id}`);
    }

    getMembers(options: membersOptions): Observable<membersResponse> {
        let params = new HttpParams();

        if (options.populate !== undefined) {
            params = params.set('populate', String(options.populate));
        }
        if (options.limit !== undefined) {
            params = params.set('limit', String(options.limit));
        }
        if (options.sort !== undefined) {
            params = params.set('sort', JSON.stringify(options.sort));
        }
        if (options.omit_event_teams !== undefined) {
            params = params.set('omit_event_teams', String(options.omit_event_teams));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.start !== undefined) {
            params = params.set('start', options.start);
        }
        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }

        // Always request total count for pagination
        params = params.set('total', 'true');

        return this.http.get<membersResponse>(`/api/teams/${options.id}/members`, { params });
    }

    getNonMembers(options: membersOptions): Observable<membersResponse> {
        let params = new HttpParams();

        if (options.populate !== undefined) {
            params = params.set('populate', String(options.populate));
        }
        if (options.limit !== undefined) {
            params = params.set('limit', String(options.limit));
        }
        if (options.sort !== undefined) {
            params = params.set('sort', JSON.stringify(options.sort));
        }
        if (options.omit_event_teams !== undefined) {
            params = params.set('omit_event_teams', String(options.omit_event_teams));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.start !== undefined) {
            params = params.set('start', options.start);
        }
        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }

        // Always request total count for pagination
        params = params.set('total', 'true');

        return this.http.get<membersResponse>(`/api/teams/${options.id}/nonMembers`, { params });
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
}
