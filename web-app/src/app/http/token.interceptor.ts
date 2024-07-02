import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

export const BYPASS_TOKEN = new HttpContextToken(() => false);

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {

  constructor(private localStorageService: LocalStorageService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.context.get(BYPASS_TOKEN) === true) {
      return next.handle(req);
    }

    const token = this.localStorageService.getToken();

    if (token && req.url.startsWith('/api/')) {
      const newReq = req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
      return next.handle(newReq)
    } else {
      return next.handle(req)
    }
  }
}
