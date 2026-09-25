import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { LatLng } from "leaflet";
import { MageEvent } from "../entities/event/entities.event";
import { Layer, LayerId } from "../entities/layer/entities.layer";

export type ClosestFeature = GeoJSON.Feature & { layerId: LayerId; gp_table: string; feature_count?: number; coverage?: number };

@Injectable({
  providedIn: 'root'
})
export class LayerService {

  constructor(
    private httpClient: HttpClient
  ) { }

  getLayersForEvent(event: MageEvent, includeUnavailable = false): Observable<Layer[]> {
    const params: Record<string, boolean> = includeUnavailable ? { includeUnavailable: true } : {}
    return this.httpClient.get<Layer[]>(`/api/events/${event.id}/layers`, { params })
  }

  getClosestFeaturesForLayers(event: MageEvent, layerIds: { id: LayerId, table: string }[], latlng: LatLng, tile: { z: number, x: number, y: number }): Observable<ClosestFeature[]> {
    return this.httpClient.post<ClosestFeature[]>(`/api/events/${event.id}/features`, { layerIds: layerIds, latlng: latlng, tile: tile })
  }

  makeAvailable(layerId: LayerId) {
    return this.httpClient.get<any>(`/api/layers/${layerId}/available`)
  }

  uploadGeopackage(data: Record<string, string | Blob | null | undefined>) {
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