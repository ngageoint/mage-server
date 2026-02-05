import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpStatusCode
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { HttpRequestBufferService } from '../services/http-request-buffer.service';
import { SigninModalComponent } from '../../app/authentication/signin-modal/signin-modal.component';
import { ApiService } from '../api/api.service';
import { LocalStorageService } from '../../../../src/app/http/local-storage.service';

@Injectable()
export class AuthBufferInterceptor implements HttpInterceptor {
  private authDialogOpen = false;

  constructor(
    private buffer: HttpRequestBufferService,
    private dialog: MatDialog,
    private apiService: ApiService,
    private localStorage: LocalStorageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall = req.url.startsWith('/api/') || req.url.includes('/api/');
    if (!isApiCall) return next.handle(req);

    return next.handle(req).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
          if (req.headers.has('x-buffered-auth')) {
            return throwError(() => error);
          }

          const bufferedReq = req.clone({ setHeaders: { 'x-buffered-auth': '1' } });

          const buffered$ = this.buffer.bufferRequest(bufferedReq, next);

          if (!this.authDialogOpen) {
            this.authDialogOpen = true;

            this.localStorage.removeToken();

            this.apiService.getApi().subscribe({
              next: (api) => {
                const ref = this.dialog.open(SigninModalComponent, {
                  width: '600px',
                  disableClose: true,
                  autoFocus: false,
                  data: { api }
                });

                ref.afterClosed().subscribe(() => {
                  this.authDialogOpen = false;
                });
              },
              error: () => {
                this.authDialogOpen = false;
                this.buffer.clear();
              }
            });
          }

          return buffered$;
        }

        return throwError(() => error);
      })
    );
  }
}
