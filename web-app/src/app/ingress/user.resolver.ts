import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable, catchError, of } from "rxjs";
import { Api } from "../api/api.entity";
import { UserService } from "../user/user.service";

@Injectable({ providedIn: 'root' })
export class UserResolver  {
  constructor(private service: UserService) { }

  resolve(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<Api> {
    return this.service.getMyself({ suppressAuthDialog: true }).pipe(
      catchError(() => {
        return of(null)
      })
    )
  }
}