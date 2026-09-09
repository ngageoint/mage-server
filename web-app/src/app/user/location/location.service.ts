import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core"
import { groupBy } from "lodash";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  // Specify times in milliseconds
  colorBuckets = [{
    min: Number.NEGATIVE_INFINITY,
    max: 600000,
    color: '#0000FF' // blue
  }, {
    min: 600001,
    max: 1800000,
    color: '#FFFF00' // yellow
  }, {
    min: 1800001,
    max: Number.MAX_VALUE,
    color: '#FF5721' // orange
  }];

  constructor(
    private httpClient: HttpClient
  ) {}

  create(eventId: number, location: any): Observable<any> {
    return this.httpClient.post<any>(`/api/events/${eventId}/locations/`, location)
  }

  getUserLocationsCount(event: any, options?: { startDate?: string, endDate?: string, users?: string[], teams?: string[] }): Observable<{ totalCount: number }> {
    const parameters: any = {
      page: 0,
      page_size: 1,
      ...(options?.startDate) && { startDate: options.startDate },
      ...(options?.endDate) && { endDate: options.endDate },
      ...(options?.users?.length) && { users: options.users.join(',') },
      ...(options?.teams?.length) && { teams: options.teams.join(',') }
    }

    return this.httpClient.get<{ totalCount: number }>(`/api/events/${event.id}/locations`, { params: parameters })
  }

  getUserLocationsForEvent(event: any, options?: any): Observable<any> {
    const parameters = {
      groupBy: 'users',
      populate: true,
      ...(options?.interval?.start) && { startDate: options.interval.start },
      ...(options?.interval?.end) && { endDate: options.interval.end }
    }

    return this.httpClient.get<any>(`/api/events/${event.id}/locations/users`, { params: parameters } )
  }

}