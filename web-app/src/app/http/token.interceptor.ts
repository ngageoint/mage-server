import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {

  constructor(private localStorageService: LocalStorageService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.localStorageService.getToken();

    if (token && req.url.startsWith('/api/')) {
      const newReq = req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
      return next.handle(newReq)
    } else {
      return next.handle(req)
    }
  }
}
