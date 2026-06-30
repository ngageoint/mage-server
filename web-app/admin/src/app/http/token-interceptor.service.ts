import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from '../../../../src/app/http/local-storage.service';

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {
  constructor(private localStorage: LocalStorageService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall = req.url.startsWith('/api/') || req.url.includes('/api/')
      || req.url.startsWith('/plugins/') || req.url.includes('/plugins/');
    if (!isApiCall) return next.handle(req);

    const token = this.localStorage.getToken();
    if (!token) return next.handle(req);

    return next.handle(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    }));
  }
}
