import { HttpClient, HttpContext, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { BYPASS_TOKEN, SUPPRESS_AUTH_DIALOG } from '../http/token.interceptor';
import { User } from 'core-lib-src/user';
import { SessionService } from 'mage-web-app/http/session.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private httpClient: HttpClient,
    private sessionService: SessionService
  ) {}

  signup(username: string): Observable<any> {
    return this.httpClient.post<any>(
      '/api/users/signups',
      {
        username
      },
      {
        context: new HttpContext().set(BYPASS_TOKEN, true)
      }
    );
  }

  signupVerify(data: any, token: string): Observable<any> {
    return this.httpClient.post<any>('/api/users/signups/verifications', data, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      context: new HttpContext().set(BYPASS_TOKEN, true)
    });
  }

  signin(
    username: string,
    password: string
  ): Observable<{ user: User; token: string }> {
    return this.httpClient.post<any>('/auth/local/signin', {
      username,
      password,
      appVersion: 'Web Client'
    });
  }

  idpSignin(strategy: string): Observable<any> {
    const subject = new Subject<any>();

    const url = '/auth/' + strategy + '/signin';
    const authWindow = window.open(url, '_blank');

    function onMessage(event: any) {
      window.removeEventListener('message', onMessage, false);

      if (event.origin !== window.location.origin) {
        return;
      }

      subject.next(event.data);
      subject.complete();

      authWindow?.close();
    }

    window.addEventListener('message', onMessage, false);

    return subject.asObservable();
  }

  ldapSignin(username: string, password: string): Observable<any> {
    return this.httpClient.post<any>(
      '/auth/ldap/signin',
      {
        username,
        password,
        appVersion: 'Web Client'
      },
      {
        context: new HttpContext().set(BYPASS_TOKEN, true)
      }
    );
  }

  authorize(
    token: string,
    deviceId: string | null
  ): Observable<{ user: User; token: string }> {
    return this.httpClient
      .post<{ user: User; token: string }>(
        '/auth/token?createDevice=false',
        {
          uid: deviceId,
          appVersion: 'Web Client'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      .pipe(
        tap((response: any) => {
          this.sessionService.setToken(response?.token);
          this.sessionService.setUser(response?.user);
        })
      );
  }

  getMyself(options?: { suppressAuthDialog?: boolean }): Observable<any> {
    return this.httpClient.get<any>('/api/users/myself', {
      context: new HttpContext().set(SUPPRESS_AUTH_DIALOG, options?.suppressAuthDialog ?? false)
    }).pipe(
      tap((user: any) => {
        this.sessionService.setUser(user);
      })
    );
  }

  getUser(id: string, options?: any) {
    options = options || {};
    const parameters: any = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    return this.httpClient.get<any>(`/api/users/${id}`, { params: parameters });
  }

  getAllUsers(options: any = {}): Observable<any> {
    const params = new HttpParams({
      fromObject: {
        page_size: options.pageSize ?? 10,
        page: options.pageIndex ?? 0,
        term: options.term ?? '',
        total: options.includeTotalCount !== false ? 'true' : 'false',
        ...(typeof options.active === 'boolean' && { active: options.active }),
        ...(typeof options.enabled === 'boolean' && {
          enabled: options.enabled
        })
      }
    });

    return this.httpClient.get('/api/next-users/search', { params });
  }

  createUser(user: any): Observable<any> {
    return this.saveUser('/api/users', 'POST', user);
  }

  updateUser(id: string, user: any): Observable<any> {
    return this.saveUser(`/api/users/${id}`, 'PUT', user);
  }

  deleteUser(userId: string): Observable<void> {
    return this.httpClient.delete<void>(`/api/users/${userId}`);
  }

  getRoles(): Observable<any[]> {
    return this.httpClient.get<any[]>('/api/roles');
  }

  updateUserPassword(userId: string, auth: any): Observable<any> {
    return this.httpClient.put(`/api/users/${userId}/password`, auth, { responseType: 'text' });
  }

  private saveUser(url: string, method: 'POST' | 'PUT', user: any): Observable<any> {
    const formData = new FormData();
    Object.keys(user).forEach((k) => {
      if (user[k] !== null && user[k] !== undefined) {
        formData.append(k, user[k]);
      }
    });

    return method === 'POST'
      ? this.httpClient.post<any>(url, formData)
      : this.httpClient.put<any>(url, formData);
  }

  addRecentEvent(event: any): Observable<any> {
    return this.httpClient.post<any>(
      `/api/users/${this.sessionService.user.id}/events/${event.id}/recent`,
      {}
    );
  }

  getRecentEventId() {
    const recentEventIds = this.sessionService.user?.recentEventIds
    return recentEventIds?.length > 0 ? recentEventIds[0] : null
  }

  logout(): Observable<string> {
    return this.httpClient
      .post('/api/logout', null, { responseType: 'text' })
      .pipe(
        tap(() => {
          this.sessionService.clearSession()
        })
      )
  }

  saveProfile(user: any): Observable<HttpEvent<any>> {
    const formData = new FormData();
    for (const property in user) {
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
      username: this.sessionService.user?.username,
      password: password,
      newPassword: newPassword,
      newPasswordConfirm: newPassword
    }, {
      context: new HttpContext().set(BYPASS_TOKEN, true),
      responseType: 'text'
    })
  }
}
