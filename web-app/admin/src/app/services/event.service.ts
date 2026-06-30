import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Page<T> {
  items: T[];
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly baseUrl = '/api/events';
  private readonly jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  get<T = any>(id: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  create<T = any>(event: any): Observable<T> {
    return this.http.post<T>(this.baseUrl, event, { headers: this.jsonHeaders });
  }

  update<T = any>(id: string, event: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${encodeURIComponent(id)}`, event, { headers: this.jsonHeaders });
  }

  save<T = any>(event: any): Observable<T> {
    return event?.id ? this.update<T>(event.id, event) : this.create<T>(event);
  }

  query<T = any>(params?: Record<string, any>): Observable<T[]> {
    return this.http.get<T[]>(this.baseUrl, { params: this.toParams(params) });
  }

  queryWithPagination<T = any>(params?: Record<string, any>): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.baseUrl, { params: this.toParams(params) });
  }

  count(params?: Record<string, any>): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/count`, { params: this.toParams(params) });
  }

  addTeam(eventId: string, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(eventId)}/teams`, body, { headers: this.jsonHeaders });
  }

  removeTeam(eventId: string, teamId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${encodeURIComponent(eventId)}/teams/${encodeURIComponent(teamId)}`, { headers: this.jsonHeaders });
  }

  addLayer(eventId: string, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(eventId)}/layers`, body, { headers: this.jsonHeaders });
  }

  removeLayer(eventId: string, layerId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${encodeURIComponent(eventId)}/layers/${encodeURIComponent(layerId)}`, { headers: this.jsonHeaders });
  }

  addFeed(eventId: string, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(eventId)}/feeds`, body, { headers: this.jsonHeaders });
  }

  removeFeed(eventId: string, feedId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${encodeURIComponent(eventId)}/feeds/${encodeURIComponent(feedId)}`, { headers: this.jsonHeaders });
  }

  getMembers<T = any>(eventId: string, params?: Record<string, any>): Observable<Page<T>> {
    return this.http.get<Page<T>>(`${this.baseUrl}/${encodeURIComponent(eventId)}/members`, { params: this.toParams(params) });
  }

  getNonMembers<T = any>(eventId: string, params?: Record<string, any>): Observable<Page<T>> {
    return this.http.get<Page<T>>(`${this.baseUrl}/${encodeURIComponent(eventId)}/nonMembers`, { params: this.toParams(params) });
  }

  getTeams<T = any>(eventId: string, params?: Record<string, any>): Observable<Page<T> | T[]> {
    return this.http.get<Page<T> | T[]>(`${this.baseUrl}/${encodeURIComponent(eventId)}/teams`, { params: this.toParams(params) });
  }

  getNonTeams<T = any>(eventId: string, params?: Record<string, any>): Observable<Page<T> | T[]> {
    return this.http.get<Page<T> | T[]>(`${this.baseUrl}/${encodeURIComponent(eventId)}/nonTeams`, { params: this.toParams(params) });
  }

  private toParams(params?: Record<string, any>): HttpParams {
    let p = new HttpParams();
    if (!params) return p;

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== null && v !== undefined) p = p.append(key, String(v));
        });
        return;
      }

      p = p.set(key, String(value));
    });

    return p;
  }
}
