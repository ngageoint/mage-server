import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthenticationConfigurationService {
  private readonly baseUrl = '/api/authentication/configuration';
  private readonly jsonHeaders = new HttpHeaders({
    'content-type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  getAllConfigurations(options?: Record<string, any>): Observable<any> {
    let params = new HttpParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get(this.baseUrl + '/', { params });
  }

  updateConfiguration(config: any): Observable<any> {
    const id = config?._id ?? config?.id;
    return this.http.put(
      `${this.baseUrl}/${encodeURIComponent(String(id))}`,
      config,
      { headers: this.jsonHeaders }
    );
  }

  deleteConfiguration(config: any): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/${encodeURIComponent(config._id)}`
    );
  }

  createConfiguration(config: any): Observable<any> {
    return this.http.post(
      this.baseUrl + '/',
      config,
      { headers: this.jsonHeaders }
    );
  }

  countUsers(id: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/count/${encodeURIComponent(id)}`
    );
  }
}
