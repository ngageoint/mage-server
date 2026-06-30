import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventAccessService {
  private readonly baseUrl = '/api/events';
  private readonly jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  update(eventId: string, userId: string, body: any): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${encodeURIComponent(eventId)}/acl/${encodeURIComponent(userId)}`,
      body,
      { headers: this.jsonHeaders }
    );
  }

  delete(eventId: string, userId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/${encodeURIComponent(eventId)}/acl/${encodeURIComponent(userId)}`,
      { headers: this.jsonHeaders }
    );
  }
}
