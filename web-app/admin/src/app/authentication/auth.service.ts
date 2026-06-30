import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpRequestBufferService } from '../services/http-request-buffer.service';
import { AuthLoginData } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginData$ = new BehaviorSubject<AuthLoginData | null>(null);

  constructor(private buffer: HttpRequestBufferService) {}

  setLoginData(data: AuthLoginData | null): void {
    this.loginData$.next(data);
  }

  getLoginData(): AuthLoginData | null {
    return this.loginData$.value;
  }

  /**
   * Call this after a successful login.
   * This retries any buffered 401 requests.
   */
  loginConfirmed(data?: AuthLoginData): void {
    if (data) this.setLoginData(data);

    this.buffer.retryAll();
  }

  logout(): void {
    this.setLoginData(null);
    this.buffer.clear();
  }
}
