import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpContextToken,
  HttpStatusCode,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, ReplaySubject, switchMap, throwError, take } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { AuthenticationDialogComponent } from '../ingress/authentication/authentication-dialog.component';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { UserService } from '../user/user.service';

export const BYPASS_TOKEN = new HttpContextToken(() => false);

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {
  private isRefreshingToken = false;
  private tokenSubject = new ReplaySubject<void>(1);

  constructor(
    public dialog: MatDialog,
    private userService: UserService,
    private localStorageService: LocalStorageService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.context.get(BYPASS_TOKEN) === true) {
      return next.handle(req);
    }

    if (!req.url.startsWith('/api/') && !req.url.startsWith('/plugins/')) {
      return next.handle(req);
    }

    return next.handle(this.tokenRequest(req)).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
          this.userService.setUser(null);

          if (!this.isRefreshingToken) {
            this.isRefreshingToken = true;
            this.tokenSubject = new ReplaySubject<void>(1);

            this.dialog.open(AuthenticationDialogComponent, {
              width: '600px',
              maxHeight: '90vh',
              disableClose: true,
              autoFocus: false
            }).afterClosed().subscribe(() => {
              this.isRefreshingToken = false;
              this.tokenSubject.next();
              this.tokenSubject.complete();
            });
          }

          return this.tokenSubject.pipe(
            take(1),
            switchMap(() => next.handle(this.tokenRequest(req)))
          );
        }

        return throwError(() => error);
      })
    );
  }

  private tokenRequest(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.localStorageService.getToken();
    if (!token) return req;

    return req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }
}
