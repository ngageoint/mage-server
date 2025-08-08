import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from './team';

export interface SearchOptions {
    populate?: boolean;
    limit?: number;
    sort?: { [key: string]: 1 | -1 };
    omit_event_teams?: boolean;
    term?: string;
    start?: string;
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

        return this.http.get('/api/teams', { params });
    }

    createTeam(teamData: Partial<Team>): Observable<Team> {
        return this.http.post<Team>('/api/teams', teamData);
    }
}
