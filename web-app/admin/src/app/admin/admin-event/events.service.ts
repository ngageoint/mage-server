import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, Layer } from 'src/app/filter/filter.types';
import { Team } from '../admin-teams/team';
import { User } from '@ngageoint/mage.web-core-lib/user';

export interface SearchOptions {
    term?: string;
    teamId?: string;
    excludeTeamId?: string;
    id?: string;
    page?: number;
    page_size?: number;
    userId?: string;
}

interface EventsResponse {
    pageSize?: number;
    page?: number;
    items: Event[];
    totalCount?: number;
}

export interface PagedResponse<T> {
    pageSize?: number;
    pageIndex?: number;
    items: T[];
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
            params = params.set('start', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('limit', String(options.page_size));
        }
        if (options.teamId !== undefined) {
            params = params.set('teamId', options.teamId);
        }
        if (options.excludeTeamId !== undefined) {
            params = params.set('excludeTeamId', options.excludeTeamId);
        }
        if (options.userId !== undefined) {
            params = params.set('userId', options.userId);
        }

        params = params.set('includePagination', 'true');

        return this.http.get<EventsResponse>('/api/events', { params });
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

    addTeamToEvent(eventId: string, team: Team): Observable<Event> {
        return this.http.post<Event>(`/api/events/${eventId}/teams`, team);
    }

    removeEventFromTeam(eventId: string, teamId: string): Observable<void> {
        return this.http.delete<void>(`/api/events/${eventId}/teams/${teamId}`);
    }

    getMembers(eventId: string, options: {
        page?: number;
        page_size?: number;
        term?: string;
        total?: boolean;
    }): Observable<PagedResponse<User>> {
        let params = new HttpParams();

        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.total !== undefined) {
            params = params.set('total', String(options.total));
        }

        return this.http.get<PagedResponse<User>>(`/api/events/${eventId}/members`, { params });
    }

    getNonMembers(eventId: string, options: {
        page?: number;
        page_size?: number;
        term?: string;
        total?: boolean;
    }): Observable<PagedResponse<User>> {
        let params = new HttpParams();

        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.total !== undefined) {
            params = params.set('total', String(options.total));
        }

        return this.http.get<PagedResponse<User>>(`/api/events/${eventId}/nonMembers`, { params });
    }

    getTeamsInEvent(eventId: string, options: {
        page?: number;
        page_size?: number;
        term?: string;
        total?: boolean;
        omit_event_teams?: boolean;
    }): Observable<PagedResponse<Team>> {
        let params = new HttpParams();

        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.total !== undefined) {
            params = params.set('total', String(options.total));
        }
        if (options.omit_event_teams !== undefined) {
            params = params.set('omit_event_teams', String(options.omit_event_teams));
        }

        return this.http.get<PagedResponse<Team>>(`/api/events/${eventId}/teams`, { params });
    }

    getTeamsNotInEvent(eventId: string, options: {
        page?: number;
        page_size?: number;
        term?: string;
        total?: boolean;
        omit_event_teams?: boolean;
    }): Observable<PagedResponse<Team>> {
        let params = new HttpParams();

        if (options.page !== undefined) {
            params = params.set('page', String(options.page));
        }
        if (options.page_size !== undefined) {
            params = params.set('page_size', String(options.page_size));
        }
        if (options.term !== undefined) {
            params = params.set('term', options.term);
        }
        if (options.total !== undefined) {
            params = params.set('total', String(options.total));
        }
        if (options.omit_event_teams !== undefined) {
            params = params.set('omit_event_teams', String(options.omit_event_teams));
        }

        return this.http.get<PagedResponse<Team>>(`/api/events/${eventId}/nonTeams`, { params });
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

    createForm(eventId: string, formData: FormData): Observable<any> {
        return this.http.post(`/api/events/${eventId}/forms`, formData);
    }
}
