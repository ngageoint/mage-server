import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthenticationService {

  constructor(
    private httpClient: HttpClient
  ) { }

  getAllConfigurations(options?: any): Observable<any> {
    options = options || {};
    return this.httpClient.get<any>('/api/authentication/configuration/', { params: options })
  }

  updateConfiguration(config): Observable<any> {
    return this.httpClient.put<any>(`/api/authentication/configuration/${config._id}`, config)
  }

  deleteConfiguration(config): Observable<any> {
    return this.httpClient.delete<any>(`/api/authentication/configuration/${config._id}`)
  }

  createConfiguration(config): Observable<any> {
    return this.httpClient.post<any>('/api/authentication/configuration', config)
  }

  countUsers(id): Observable<any> {
    return this.httpClient.get<any>(`/api/authentication/configuration/count/${id}`)
  }

}