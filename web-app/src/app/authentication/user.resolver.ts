import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { Api } from "../api/api.entity";
import { UserService } from "../user/user.service";

@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<any> {
  constructor(private service: UserService) { }

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<Api> {
    return this.service.getMyself()
  }
}