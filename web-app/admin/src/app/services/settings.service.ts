import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export type SettingsType = string;

export interface SettingsResponse {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly baseUrl = '/api/settings';

  constructor(private http: HttpClient) {}

  get(type: SettingsType, params?: Record<string, any>): Observable<SettingsResponse> {
    const httpParams = this.toParams(params);
    return this.http.get<SettingsResponse>(`${this.baseUrl}/${encodeURIComponent(type)}`, {
      params: httpParams
    });
  }

  update(type: SettingsType, body: any): Observable<SettingsResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<SettingsResponse>(
      `${this.baseUrl}/${encodeURIComponent(type)}`,
      body,
      { headers }
    );
  }

  private toParams(params?: Record<string, any>): HttpParams {
    let p = new HttpParams();
    if (!params) return p;

    for (const key of Object.keys(params)) {
      const val = params[key];
      if (val === undefined || val === null) continue;
      p = p.set(key, String(val));
    }
    return p;
  }
}
