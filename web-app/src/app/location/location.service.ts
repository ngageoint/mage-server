import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core"
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

  getUserLocationsForEvent(event, options): Observable<any> {

    const parameters: any = { eventId: event.id, groupBy: 'users', populate: 'true' };
    if (options.interval) {
      parameters.startDate = options.interval.start;
      parameters.endDate = options.interval.end;
    }

    return this.httpClient.get<any>(`/api/events/${event.id}/locations/users`, { params: { populate: true } } )
  }

}