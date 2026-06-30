import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TeamService {
  constructor(private http: HttpClient) {}

  create(body: any): Observable<any> {
    return this.http.post('/api/teams', body);
  }

  update(id: string, body: any): Observable<any> {
    return this.http.put(`/api/teams/${encodeURIComponent(id)}`, body);
  }

  count(): Observable<any> {
    return this.http.get('/api/teams/count');
  }

  addUser(teamId: string, userId: string): Observable<any> {
    return this.http.post(`/api/teams/${encodeURIComponent(teamId)}/users`, { id: userId });
  }

  removeUser(teamId: string, userId: string): Observable<any> {
    return this.http.delete(
      `/api/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`
    );
  }

  getMembers(teamId: string, query?: Record<string, any>): Observable<any> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return this.http.get(`/api/teams/${encodeURIComponent(teamId)}/members`, { params });
  }

  getNonMembers(teamId: string, query?: Record<string, any>): Observable<any> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return this.http.get(`/api/teams/${encodeURIComponent(teamId)}/nonMembers`, { params });
  }
}
