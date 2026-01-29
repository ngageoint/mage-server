import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpRequest,
  HttpEvent
} from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/http/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private myselfSubject = new BehaviorSubject<any | null>(null);
  private isAdminSubject = new BehaviorSubject<boolean>(false);

  myself$ = this.myselfSubject.asObservable();
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private localStorage: LocalStorageService
  ) {}

  signup(username: string): Observable<any> {
    return this.http.post('/api/users/signups', { username });
  }

  signupVerify(data: any, token: string): Observable<any> {
    return this.http.post('/api/users/signups/verifications', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  signin(data: any): Observable<any> {
    data.appVersion = 'Web Client';
    return this.http.post('/auth/local/signin', this.toFormParams(data));
  }

  ldapSignin(data: any): Observable<any> {
    data.appVersion = 'Web Client';
    return this.http.post('/auth/ldap/signin', data);
  }

  authorize(token: string, uid: string, newUser = false): Observable<any> {
    const body = this.toFormParams({ uid, appVersion: 'Web Client' });

    return this.http
      .post<any>('/auth/token?createDevice=false', body, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        tap((res) => {
          if (res?.device?.registered) {
            this.setUser(res.user);
            this.localStorage.setToken(res.token);
          }
        }),
        map((res) => (res?.device?.registered ? res : null))
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/logout', {}).pipe(
      tap(() => {
        this.clearUser();
      })
    );
  }

  getMyself(): Observable<any> {
    return this.http.get<any>('/api/users/myself').pipe(
      tap((user) => this.setUser(user)),
      catchError(() => of(null))
    );
  }  

  checkLoggedInUser(): Observable<any> {
    return this.getMyself();
  }

  updatePassword(userId: string, auth: any): Observable<any> {
    return this.http.put(`/api/users/${userId}/password`, auth);
  }

  updateMyPassword(auth: any): Observable<void> {
    return this.http
      .put<void>('/api/users/myself/password', auth)
      .pipe(tap(() => this.clearUser()));
  }

  updateMyself(
    user: any,
    progress?: (e: HttpEvent<any>) => void
  ): Observable<any> {
    return this.saveUser('/api/users/myself', 'PUT', user, progress);
  }

  getUserCount(params?: any): Observable<number> {
    return this.http.get<number>('/api/users/count', { params });
  }

  getUser(id: string, options?: any): Observable<any> {
    return this.http.get(`/api/users/${id}`, { params: options });
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

    return this.http.get('/api/next-users/search', { params });
  }

  createUser(
    user: any,
    progress?: (e: HttpEvent<any>) => void
  ): Observable<any> {
    return this.saveUser('/api/users', 'POST', user, progress);
  }

  updateUser(
    id: string,
    user: any,
    progress?: (e: HttpEvent<any>) => void
  ): Observable<any> {
    return this.saveUser(`/api/users/${id}`, 'PUT', user, progress);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`/api/users/${userId}`);
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>('/api/roles');
  }

  hasPermission(permission: string): boolean {
    const user = this.myselfSubject.value;
    return !!user?.role?.permissions?.includes(permission);
  }

  addRecentEvent(eventId: string): Observable<any> {
    const user = this.myselfSubject.value;
    return this.http.post(`/api/users/${user.id}/events/${eventId}/recent`, {});
  }

  getRecentEventId(): string | null {
    const ids = this.myselfSubject.value?.recentEventIds ?? [];
    return ids.length ? ids[0] : null;
  }

  private setUser(user: any): void {
    this.myselfSubject.next(user);
    const isAdmin =
      user?.role?.name === 'ADMIN_ROLE' ||
      user?.role?.name === 'EVENT_MANAGER_ROLE';

    this.isAdminSubject.next(isAdmin);
  }

  private clearUser(): void {
    this.myselfSubject.next(null);
    this.isAdminSubject.next(false);
    this.localStorage.removeToken();
  }  

  private saveUser(
    url: string,
    method: 'POST' | 'PUT',
    user: any,
    progress?: (e: HttpEvent<any>) => void
  ): Observable<any> {
    const formData = new FormData();
    Object.keys(user).forEach((k) => {
      if (user[k] !== null && user[k] !== undefined) {
        formData.append(k, user[k]);
      }
    });

    const req = new HttpRequest(method, url, formData, {
      reportProgress: !!progress
    });

    return this.http.request(req).pipe(
      tap((event) => progress?.(event)),
      map((event) => (event as any).body ?? event)
    );
  }

  private toFormParams(data: any): HttpParams {
    let params = new HttpParams();
    Object.keys(data).forEach((k) => {
      params = params.set(k, data[k]);
    });
    return params;
  }
}
