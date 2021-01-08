import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers';

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService implements HttpInterceptor {

  constructor(@Inject(LocalStorageService) private localStorageService: any) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.localStorageService.getToken();
    const newReq = req.clone({ headers: req.headers.append('Authorization', `Bearer ${token}`) });
    return next.handle(newReq);
  }
}