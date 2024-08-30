import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken, HttpStatusCode, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, Subject, switchMap, throwError } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { AuthenticationDialogComponent } from '../ingress/authentication/authentication-dialog.component';
import { MatDialog } from '@angular/material/dialog';

export const BYPASS_TOKEN = new HttpContextToken(() => false);

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {
  isRefreshingToken: boolean = false
  tokenSubject: Subject<void> = new Subject<void>()

  constructor(
    public dialog: MatDialog,
    private localStorageService: LocalStorageService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const bypassToken = req.context.get(BYPASS_TOKEN) === true
    if (bypassToken) {
      return next.handle(req);
    }

    if (req.url.startsWith('/api/')) {
      return next.handle(this.tokenRequest(req)).pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse) {
            if (error.status === HttpStatusCode.Unauthorized) {
              if (!this.isRefreshingToken) {
                this.isRefreshingToken = true
                this.dialog.open(AuthenticationDialogComponent, {
                  width: '600px',
                  disableClose: true,
                  autoFocus: false
                }).afterClosed().subscribe(() => {
                  this.isRefreshingToken = false
                  this.tokenSubject.next()
                })
              }
              
              return this.tokenSubject.pipe(
                switchMap(() => next.handle(this.tokenRequest(req)))
              )
            }
          }

          return throwError(() => error)
        })
      )
    } else {
      return next.handle(req)
    }
  }

  tokenRequest(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.localStorageService.getToken()
    return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
  }
}
