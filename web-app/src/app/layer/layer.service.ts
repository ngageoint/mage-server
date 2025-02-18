import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { FilterService } from "../filter/filter.service";

@Injectable({
  providedIn: 'root'
})
export class LayerService {

  constructor(
    private httpClient: HttpClient,
    private filterService: FilterService
  ) { }

  getLayersForEvent(event, includeUnavailable?: any): Observable<any> {
    return this.httpClient.get(`/api/events/${event.id}/layers`, includeUnavailable && { params: { includeUnavailable } })
  }

  getClosestFeaturesForLayers(layerIds, latlng, tile): Observable<any> {
    const event = this.filterService.getEvent();
    return this.httpClient.post<any>(`/api/events/${event.id}/features`, { layerIds: layerIds, latlng: latlng, tile: tile })
  }

  makeAvailable(layerId) {
    return this.httpClient.get<any>(`/api/layers/${layerId}/available`)
  }

  uploadGeopackage(data) {
    const formData = new FormData();
    for (const property in data) {
      if (data[property] != null) {
        formData.append(property, data[property]);
      }
    }

    return this.httpClient.post('/api/layers', formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}