import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserService } from '../../user/user.service';
import { User } from '../admin-users/user';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard  {

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {

    return this.userService.getMyself().pipe(
      map((myself: User | null) => {
        if (!myself) {
          return this.router.createUrlTree(['/landing']);
        }

        const roleName = (myself as any).role?.name;

        const isAdmin =
          roleName === 'ADMIN_ROLE' ||
          roleName === 'EVENT_MANAGER_ROLE';

        return isAdmin ? true : this.router.createUrlTree(['/landing']);
      }),
      catchError(() => of(this.router.createUrlTree(['/landing'])))
    );
  }
}
