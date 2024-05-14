import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class UserService {

  myself: any

  constructor(private httpClient: HttpClient) { }

  signin(username: string,  password: string): Observable<any> {
    const body = {
      username,
      password,
      appVersion: 'Web Client'
    }

    return this.httpClient.post<any>('/auth/local/signin', body)
  }

  authorize(token: string, deviceId: string): Observable<any> {
    const body = {
      uid: deviceId,
      appVersion: 'Web Client'
    }

    return this.httpClient.post<any>('/auth/token?createDevice=false', body, {
      headers: { 'Authorization': `Bearer ${token}`}
    })
  }

  addRecentEvent(event: any): Observable<any> {
    return this.httpClient.post<any>(`/api/users/${this.myself.id}/events/${event.id}/recent`, {})
  }
}