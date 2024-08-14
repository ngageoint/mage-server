import { HttpClient, HttpContext } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { BYPASS_TOKEN } from '../../http/token.interceptor'

@Injectable({
  providedIn: 'root'
})
export class InitializeService {

  constructor(
    private httpClient: HttpClient
  ) { }

  initialize(username: string, password: string, accessCode: string): Observable<any>  {
    return this.httpClient.post<any>('/api/setup', {
      username: username,
      password: password,
      passwordconfirm: password,
      uid: accessCode
    },{
      context: new HttpContext().set(BYPASS_TOKEN, true)
    })
  }
}