import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'
import { Team } from '@ngageoint/mage.web-core-lib/team'
import { Observable } from 'rxjs';
import { Event, Layer } from 'mage-web-app/filter/filter.types';
import { User } from '@ngageoint/mage.web-core-lib/user';

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
    layerId?: string;
    excludeLayerId?: string;
}

const setParams = (options: any): HttpParams => {
    let params = new HttpParams();
    for (const key of Object.keys(options)) {
        if (options[key] !== undefined && options[key] !== null) {
            params = params.set(key, String(options[key]));
        }
    }
    return params;
};

@Injectable({
    providedIn: 'root'
})
export class AdminEventsService {
    constructor(private http: HttpClient) { }

    getEvents(options: SearchOptions): Observable<PageOf<Event>> {
        const page = options.page ?? 0;
        const pageSize = options.page_size ?? 10;

        const query: any = {
            term: options.term,
            teamId: options.teamId,
            excludeTeamId: options.excludeTeamId,
            userId: options.userId,
            state: options.state,
            layerId: options.layerId,
            excludeLayerId: options.excludeLayerId,

            limit: pageSize,
            start: page,

            includePagination: true
        };

        const params = setParams(query);

        return this.http.get<PageOf<Event>>('/api/events', { params });
    }


    getEventById(eventId: string): Observable<Event> {
        return this.http.get<Event>(`/api/events/${eventId}`);
    }

    updateEvent(eventId: string, event: Partial<Event>): Observable<Event> {
        return this.http.put<Event>(`/api/events/${eventId}`, event);
    }

    deleteEvent(eventId: string): Observable<void> {
        return this.http.delete<void>(`/api/events/${eventId}`);
    }

    createEvent(eventData: Partial<Event>): Observable<Event> {
        return this.http.post<Event>('/api/events', eventData);
    }

    addTeamToEvent(eventId: string, team: Team): Observable<Event> {
        return this.http.post<Event>(`/api/events/${eventId}/teams`, team);
    }

    removeEventFromTeam(eventId: string, teamId: string): Observable<void> {
        return this.http.delete<void>(`/api/events/${eventId}/teams/${teamId}`);
    }

    getMembers(
        eventId: string,
        options: {
            page?: number;
            page_size?: number;
            term?: string;
            total?: boolean;
        }
    ): Observable<PageOf<User>> {
        const params = setParams(options);
        return this.http.get<PageOf<User>>(
            `/api/events/${eventId}/members`,
            { params }
        );
    }

    getNonMembers(
        eventId: string,
        options: {
            page?: number;
            page_size?: number;
            term?: string;
            total?: boolean;
        }
    ): Observable<PageOf<User>> {
        const params = setParams(options);
        return this.http.get<PageOf<User>>(
            `/api/events/${eventId}/nonMembers`,
            { params }
        );
    }

    getTeamsInEvent(
        eventId: string,
        options: {
            page?: number;
            page_size?: number;
            term?: string;
            total?: boolean;
            omit_event_teams?: boolean;
        }
    ): Observable<PageOf<Team>> {
        const params = setParams(options);
        return this.http.get<PageOf<Team>>(`/api/events/${eventId}/teams`, {
            params
        });
    }

    getTeamsNotInEvent(
        eventId: string,
        options: {
            page?: number;
            page_size?: number;
            term?: string;
            total?: boolean;
            omit_event_teams?: boolean;
        }
    ): Observable<PageOf<Team>> {
        const params = setParams(options);
        return this.http.get<PageOf<Team>>(
            `/api/events/${eventId}/nonTeams`,
            { params }
        );
    }

    getAllLayers(): Observable<Layer[]> {
        return this.http.get<Layer[]>('/api/layers');
    }

    getLayersForEvent(eventId: string): Observable<Layer[]> {
        return this.http.get<Layer[]>(`/api/events/${eventId}/layers`);
    }

    addLayerToEvent(eventId: string, layer: { id: number }): Observable<Event> {
        return this.http.post<Event>(`/api/events/${eventId}/layers`, layer);
    }

    removeLayerFromEvent(eventId: string, layerId: number): Observable<Event> {
        return this.http.delete<Event>(`/api/events/${eventId}/layers/${layerId}`);
    }

    createForm(eventId: string, formData: any): Observable<any> {
        return this.http.post(`/api/events/${eventId}/forms`, formData);
    }

    updateForm(eventId: string, formId: string, formData: any): Observable<any> {
        return this.http.put(`/api/events/${eventId}/forms/${formId}`, formData);
    }

    deleteForm(eventId: string, formId: string): Observable<void> {
        return this.http.delete<void>(`/api/events/${eventId}/forms/${formId}`);
    }
}
