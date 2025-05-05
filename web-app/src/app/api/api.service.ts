import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { BYPASS_TOKEN } from "../http/token.interceptor";

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private httpClient: HttpClient) { }

  getApi(): Observable<any> {
    return this.httpClient.get<any>('/api', {
      context: new HttpContext().set(BYPASS_TOKEN, true)
    })
  }
}