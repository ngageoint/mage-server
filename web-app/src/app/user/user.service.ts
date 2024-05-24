import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class UserService {

  myself: any
  amAdmin: boolean

  constructor(private httpClient: HttpClient) { }

  signin(username: string, password: string): Observable<any> {
    const body = {
      username,
      password,
      appVersion: 'Web Client'
    }

    return this.httpClient.post<any>('/auth/local/signin', body)
  }

  idpSignin(strategy: string): Observable<any> {
    let subject = new Subject<any>();

    const url = "/auth/" + strategy + "/signin";
    const authWindow = window.open(url, "_blank");

    function onMessage(event: any) {
      window.removeEventListener('message', onMessage, false);

      if (event.origin !== window.location.origin) {
        return;
      }

      subject.next(event.data)

      authWindow.close();
    }

    window.addEventListener('message', onMessage, false);

    return subject.asObservable()
  }

  authorize(token: string, deviceId: string): Observable<any> {
    const body = {
      uid: deviceId,
      appVersion: 'Web Client'
    }

    const observable = this.httpClient.post<any>('/auth/token?createDevice=false', body, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    observable.subscribe((response) => {
      this.setUser(response.user)
    })

    return observable
  }

  getMyself(): Observable<any> {
    const observable = this.httpClient.get<any>('/api/users/myself')

    observable.subscribe((user: any) => {
      this.setUser(user)
    })

    return observable
  }

  setUser(user: any) {
    this.myself = user;
    // TODO don't just check for role name
    this.amAdmin = this.myself && this.myself.role && (this.myself.role.name === "ADMIN_ROLE" || this.myself.role.name === 'EVENT_MANAGER_ROLE');
  }

  getUser(id: string, options?: any) {
    options = options || {};
    const parameters: any = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    return this.httpClient.post<any>(`/api/users/${id}`, { params: parameters })
  }

  hasPermission(permission): boolean {
    return this.myself.role.permissions.includes(permission)
  }

  addRecentEvent(event: any): Observable<any> {
    return this.httpClient.post<any>(`/api/users/${this.myself.id}/events/${event.id}/recent`, {})
  }

  getRecentEventId() {
    var recentEventIds = this.myself.recentEventIds;
    return recentEventIds.length > 0 ? recentEventIds[0] : null;
  }
}