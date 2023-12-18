import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MapSettings } from 'src/app/entities/map/entities.map';

@Injectable({
  providedIn: 'root'
})
export class MapSettingsService {

  constructor(private http: HttpClient) { }

  getMapSettings(): Observable<MapSettings> {
    return this.http.get<any>('/api/settings/map');
  }

  updateMapSettings(settings: MapSettings): Observable<MapSettings> {
    return this.http.post<any>('/api/settings/map/', settings, {
      headers: { "Content-Type": "application/json" }
    });
  }
}
