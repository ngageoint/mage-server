import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  constructor(
    private httpClient: HttpClient
  ) {}

  getTeams(options?: any) {
    options = options || {};
    const parameters: any = {};
    if (options.populate) {
      parameters.populate = options.populate;
    }

    return this.httpClient.get<any>('/api/teams/', { params: parameters })
  }

}