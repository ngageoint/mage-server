import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserService } from '../user/user.service';
import { User } from 'core-lib-src/user';

@Injectable({
  providedIn: 'root'
})
export class NoSessionGuard {

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {

    return this.userService.getMyself({ suppressAuthDialog: true }).pipe(
      map((myself: User | null) => {
        return myself ? this.router.createUrlTree(['/home']) : true;
      }),
      catchError(() => of(true))
    );
  }
}
