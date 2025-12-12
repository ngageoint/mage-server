import { HttpClient, HttpContext, HttpEvent } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs'
import { LocalStorageService } from '../http/local-storage.service'
import { BYPASS_TOKEN } from '../http/token.interceptor'
import { User } from 'core-lib-src/user'

@Injectable({
  providedIn: 'root'
})
export class UserService {
  amAdmin: boolean

  private _myself = new BehaviorSubject<any>(null)
  myself: any
  myself$ = this._myself.asObservable()

  constructor(
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

  ldapSignin(username: string, password: string): Observable<any> {
    return this.httpClient.post<any>('/api/ldap/signin', {
      username,
      password,
      appVersion: 'Web Client'
    },{
      context: new HttpContext().set(BYPASS_TOKEN, true)
    })
  }

  authorize(token: string, deviceId: string): Observable<{ user: User, token: string}> {
    return this.httpClient
      .post<{ user: User, token: string }>('/auth/token?createDevice=false', {
        uid: deviceId,
        appVersion: 'Web Client'
      },{
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .pipe(
        tap((response: any) => {
          this.setUser(response.user)
        })
      )
  }

  getMyself(): Observable<any> {
    return this.httpClient
      .get<any>('/api/users/myself')
      .pipe(
        tap((user: any) => {
          this.setUser(user)
        })
      )
  }

  setUser(user: any) {
    this._myself.next(user)
    this.myself = user
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

  logout(): Observable<string> {
    return this.httpClient
      .post('/api/logout', null, { responseType: 'text' })
      .pipe(
        tap(() => {
          this.clearUser()
        })
      )
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