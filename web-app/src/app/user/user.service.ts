import { HttpClient, HttpContext, HttpEvent } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, Subject } from 'rxjs'
import { LocalStorageService } from '../http/local-storage.service'
import { BYPASS_TOKEN } from '../http/token.interceptor'
import { User } from '../entities/user/entities.user'

@Injectable({
  providedIn: 'root'
})
export class UserService {

  myself: any
  amAdmin: boolean

  constructor(
    private router: Router,
    private httpClient: HttpClient,
    private localStorageService: LocalStorageService
  ) { }

  signup(username: string): Observable<any>  {
    return this.httpClient.post<any>('/api/users/signups', {
      username
    },{
      context: new HttpContext().set(BYPASS_TOKEN, true)
    })
  }

  signupVerify(data: any, token: string): Observable<any> {
    return this.httpClient.post<any>('/api/users/signups/verifications', data, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      context: new HttpContext().set(BYPASS_TOKEN, true)
    })
  }

  signin(username: string, password: string): Observable<{user: User, token: string}> {
    return this.httpClient.post<any>('/auth/local/signin', {
      username,
      password,
      appVersion: 'Web Client'
    })
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

  authorize(token: string, deviceId: string): Observable<{ user: User, token: string}> {
    const body = {
      uid: deviceId,
      appVersion: 'Web Client'
    }

    const observable = this.httpClient.post<{ user: User, token: string }>('/auth/token?createDevice=false', body, {
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

  logout() {
    const observable = this.httpClient.post('/api/logout', null, { responseType: 'text' })
    observable.subscribe(() => {
      this.clearUser();
      this.router.navigate(['landing']);
    })

    return observable;
  }

  saveProfile(user: any): Observable<HttpEvent<any>> {
    const formData = new FormData();
    for (var property in user) {
      if (user[property] != null) {
        formData.append(property, user[property]);
      }
    }

    return this.httpClient.put<any>('/api/users/myself', formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  updatePassword(password: string, newPassword): Observable<any> {
    return this.httpClient.put(`/api/users/myself/password`, {
      username: this.myself.username,
      password: password,
      newPassword: newPassword,
      newPasswordConfirm: newPassword
    },{
      context: new HttpContext().set(BYPASS_TOKEN, true),
      responseType: 'text'
    });
  }

  private clearUser() {
    this.myself = null;
    this.amAdmin = null;
    this.localStorageService.removeToken();
  }
}