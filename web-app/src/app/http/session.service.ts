import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { LocalStorageService } from './local-storage.service'

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private readonly tokenKey = 'token'

  private tokenSubject = new BehaviorSubject<string | null>(null)
  readonly token$: Observable<string | null> = this.tokenSubject.asObservable()

  private userSubject = new BehaviorSubject<any | null>(null)
  readonly user$: Observable<any | null> = this.userSubject.asObservable()

  constructor(private localStorageService: LocalStorageService) {
    this.tokenSubject.next(this.localStorageService.getLocalItem(this.tokenKey) ?? null)
  }

  getToken(): string | null {
    return this.tokenSubject.value
  }

  setToken(token: string): void {
    this.localStorageService.setLocalItem(this.tokenKey, token)
    this.tokenSubject.next(token)
  }

  get user(): any | null {
    return this.userSubject.value
  }

  setUser(user: any): void {
    this.userSubject.next(user)
  }

  get amAdmin(): boolean {
    const user = this.userSubject.value
    return user?.role?.name === 'ADMIN_ROLE' || user?.role?.name === 'EVENT_MANAGER_ROLE'
  }

  hasPermission(permission: string): boolean {
    return this.userSubject.value?.role?.permissions?.includes(permission) ?? false
  }

  clearSession(): void {
    this.localStorageService.removeLocalItem(this.tokenKey)
    this.tokenSubject.next(null)
    this.userSubject.next(null)
  }
}
