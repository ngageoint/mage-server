import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { ArcGISPluginConfig } from './ArcGISPluginConfig'
import { FeatureServiceConfig } from './ArcGISConfig'

export const baseUrl = '/plugins/@ngageoint/mage.arcgis.service'
export const apiBaseUrl = '/api'

export interface ArcServiceInterface {
  fetchArcConfig(): Observable<ArcGISPluginConfig>
  putArcConfig(config: ArcGISPluginConfig): void
  fetchEvents(): Observable<MageEvent[]>
  fetchPopulatedEvents(): Observable<MageEvent[]>
  fetchFeatureServiceLayers(featureServiceUrl: string): Observable<FeatureLayer[]>
  validateFeatureService(request: ValidationRequest): Observable<FeatureServiceConfig>
}

export class MageEvent {
  name: string
  id: number
  forms: Form[]
}

export class Form {
  name: string
  id: number
  fields: Field[]
}

export class Field {
  title: string
}

export interface FeatureLayer {
  id: number
  name: string
  geometryType: string
}

export type ValidationRequest = {
  url: string
} & { token: string } | { username: string, password: string }

@Injectable({
  providedIn: 'root'
})
export class ArcService implements ArcServiceInterface {

  constructor(
    private http: HttpClient
  ) {}

  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return this.http.get<ArcGISPluginConfig>(`${baseUrl}/config`)
  }

  fetchFeatureServiceLayers(featureServiceUrl: string) {
    return this.http.get<FeatureLayer[]>(`${baseUrl}/featureService/layers?featureServiceUrl=${encodeURIComponent(featureServiceUrl)}`)
  }

  oauth(featureServiceUrl: string, clientId: string): Observable<FeatureServiceConfig> {
    let subject = new Subject<FeatureServiceConfig>();

    const url = `${baseUrl}/oauth/signin?featureServiceUrl=${encodeURIComponent(featureServiceUrl)}&clientId=${encodeURIComponent(clientId)}`;
    const oauthWindow = window.open(url, "_blank");

    const listener = (event: any) => {
      if (event.data.url) {
        window.removeEventListener('message', listener, false);

        if (event.origin !== window.location.origin) {
          subject.error('target origin mismatch')
        }
  
        subject.next(event.data)
  
        oauthWindow?.close();
      }
    }

    window.addEventListener('message', listener, false);

    return subject.asObservable()
  }

  validateFeatureService(request: ValidationRequest): Observable<FeatureServiceConfig> {
    return this.http.post<FeatureServiceConfig>(`${baseUrl}/featureService/validate`, request) 
  }

  fetchEvents(): Observable<MageEvent[]> {
    return this.http.get<MageEvent[]>(`${apiBaseUrl}/events?populate=false&projection={"name":true,"id":true}`)
  }

  fetchPopulatedEvents() {
    return this.http.get<MageEvent[]>(`${apiBaseUrl}/events`)
  }

  putArcConfig(config: ArcGISPluginConfig) {
    this.http.put(`${baseUrl}/config`, config).subscribe()
  }
}