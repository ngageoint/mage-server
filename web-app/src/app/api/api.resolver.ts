import { Injectable } from "@angular/core";
import { ApiService } from "../api/api.service";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { Api } from "../api/api.entity";

@Injectable({ providedIn: 'root' })
export class ApiResolver  {
  constructor(private service: ApiService) { }

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<Api> {
    return this.service.getApi()
  }
}