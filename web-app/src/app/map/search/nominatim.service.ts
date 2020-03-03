import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NominatimService {
  public static readonly URL = 'https://nominatim.openstreetmap.org/search';
  public static readonly FORMAT = 'geojson';
  public static readonly ADDRESS = '1';
  public static readonly LIMIT = '10';

  constructor(private http: HttpClient) { }

  search(query: string) {
    const params = new HttpParams()
      .set('q', query)
      .set('format', NominatimService.FORMAT)
      .set('limit', NominatimService.LIMIT)
      .set('addressdetails', NominatimService.ADDRESS);


    return this.http.get(NominatimService.URL, { params: params });
  }
}
