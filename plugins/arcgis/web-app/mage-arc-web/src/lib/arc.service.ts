import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ArcGISPluginConfig } from './ArcGISPluginConfig'
import { FeatureServiceResult } from './FeatureServiceResult'
import { EventResult } from './EventsResult'

export const baseUrl = '/plugins/@ngageoint/mage.arcgis'
export const apiBaseUrl = '/api'

@Injectable({
  providedIn: 'root'
  /*
  TODO: figure out how to inject the same http client the
  rest of the core app gets so the http auth interceptor
  applies when this service comes from a non-root module
  providedIn: MageArcServicesModule
  */
})
export class ArcService {

  constructor(private http: HttpClient) {
  }

  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return this.http.get<ArcGISPluginConfig>(`${baseUrl}/config`)
  }

  fetchArcLayers(featureUrl: string) {
    return this.http.get<FeatureServiceResult>(`${baseUrl}/arcgisLayers?featureUrl=${featureUrl}`)
  }

  fetchEvents() {
    return this.http.get<EventResult[]>(`${apiBaseUrl}/events?populate=false&projection={"name":true,"id":true}`)
  }

  fetchPopulatedEvents() {
    return this.http.get<EventResult[]>(`${apiBaseUrl}/events`)
  }

  putArcConfig(config: ArcGISPluginConfig) {
    this.http.put(`${baseUrl}/config`, config).subscribe()
  }

  removeUserTrack(userTrackId: string): Observable<ArcGISPluginConfig> {
    return this.http.delete<ArcGISPluginConfig>(`${baseUrl}/config/user_tracks/${userTrackId}`)
  }

  removeOperation(operationId: string): Observable<ArcGISPluginConfig> {
    throw new Error('unimplemented')
  }
}