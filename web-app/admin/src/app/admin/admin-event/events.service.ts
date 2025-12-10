import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event } from 'src/app/filter/filter.types';
import { Team } from '../admin-teams/team';

export interface SearchOptions {
    term?: string;
    teamId?: string;
    excludeTeamId?: string;
    feedId?: string;
    excludeFeedId?: string;
    id?: string;
    page?: number;
    page_size?: number;
    userId?: string;
    state?: string;
}

interface EventsResponse {
    pageSize?: number;
    page?: number;
    items: Event[];
    totalCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class EventsService {

    constructor(private http: HttpClient) { }

    getEvents(options: SearchOptions): Observable<EventsResponse> {
        let params = new HttpParams();

        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }
        if (options.state !== undefined) {
            params = params.set('state', options.state);
        }
        if (options.teamId !== undefined) {
            params = params.set('teamId', options.teamId);
        }
        if (options.excludeTeamId !== undefined) {
            params = params.set('excludeTeamId', options.excludeTeamId);
        }
        if (options.feedId !== undefined) {
            params = params.set('feedId', options.feedId);
        }
        if (options.excludeFeedId !== undefined) {
            params = params.set('excludeFeedId', options.excludeFeedId);
        }
        if (options.userId !== undefined) {
            params = params.set('userId', options.userId);
        }

        params = params.set('includePagination', 'true');

        return this.http.get<EventsResponse>('/api/events', { params });
    }

    addTeamToEvent(eventId: string, team: Team): Observable<Event> {
        return this.http.post<Event>(`/api/events/${eventId}/teams`, team);
    }

    removeEventFromTeam(eventId: string, teamId: string): Observable<void> {
        return this.http.delete<void>(`/api/events/${eventId}/teams/${teamId}`);
    }
}
