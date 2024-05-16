import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminSettingsService {

  constructor(
    private httpClient: HttpClient
  ) { }

  getSettings(): Observable<any> {
    return this.httpClient.get<any>('/api/settings/')
  }

  updateSettings(type: string, settings: any): Observable<any> {
    return this.httpClient.post<any>(`/api/settings/${type}`, settings)
  }

}