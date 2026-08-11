import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { ArcGISPluginConfig } from './ArcGISPluginConfig'
import { FeatureServiceConfig } from './ArcGISConfig'

export const baseUrl = '/plugins/@ngageoint/mage.arcgis.service'
export const apiBaseUrl = '/api'

export interface ArcServiceInterface {
  fetchArcConfig(): Observable<ArcGISPluginConfig>
  putArcConfig(config: ArcGISPluginConfig): Observable<ArcGISPluginConfig>
  fetchEvents(): Observable<MageEvent[]>
  fetchPopulatedEvents(): Observable<MageEvent[]>
  fetchFeatureServiceLayers(featureServiceUrl: string): Observable<FeatureLayer[]>
  fetchFeatureServiceCapabilities(featureServiceUrl: string): Observable<{ capabilities?: string }>
  validateFeatureService(request: ValidationRequest): Observable<FeatureServiceConfig>
  fetchPushStatus(eventId: number, pageIndex: number, pageSize: number): Observable<PushedObservationsPage>
}

// 'sent': found on the ArcGIS layer and still active in MAGE.
// 'archived': found on the ArcGIS layer, but has since been archived (deleted) in MAGE.
export type PushStatus = 'sent' | 'archived'

// a MAGE observation that has already been synced to an ArcGIS feature layer
export interface PushedObservation {
  id: string
  createdAt: string
  lastModified: string
  status: PushStatus
}

export interface PushedObservationsPage {
  items: PushedObservation[]
  totalCount: number
  pageIndex: number
  pageSize: number
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
  capabilities?: string
}

export type ValidationRequest = {
  url: string
  portalUrl?: string
} & ({ token: string } | { username: string, password: string })

export type DiscoveryRequest = {
  portalUrl: string
  start?: number
  num?: number
  filter?: string
} & ({ token: string } | { username: string, password: string } | { identityManager: string })

export interface DiscoveredFeatureService {
  id: string
  title: string
  url: string
  owner: string
  capabilities?: string
  permission: string
}

export interface DiscoveryResult {
  identityManager: string
  portalUrl?: string
  mayLackEditPrivilege?: boolean
  services: DiscoveredFeatureService[]
  total: number
  start: number
  num: number
}

@Injectable({
  providedIn: 'root'
})
export class ArcService implements ArcServiceInterface {

  constructor(
    private http: HttpClient
  ) { }

  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return this.http.get<ArcGISPluginConfig>(`${baseUrl}/config`)
  }

  fetchFeatureServiceLayers(featureServiceUrl: string) {
    return this.http.get<FeatureLayer[]>(`${baseUrl}/featureService/layers?featureServiceUrl=${encodeURIComponent(featureServiceUrl)}`)
  }

  fetchFeatureServiceCapabilities(featureServiceUrl: string): Observable<{ capabilities?: string }> {
    return this.http.get<{ capabilities?: string }>(`${baseUrl}/featureService/capabilities?featureServiceUrl=${encodeURIComponent(featureServiceUrl)}`)
  }

  oauth(featureServiceUrl: string, clientId: string, portalUrl?: string): Observable<FeatureServiceConfig> {
    const params = new URLSearchParams({
      featureServiceUrl: featureServiceUrl,
      clientId: clientId
    });

    if (portalUrl) {
      params.set('portalUrl', portalUrl);
    }

    return this.oauthPopup<FeatureServiceConfig>(params, (data) => !!data.url);
  }

  oauthDiscover(portalUrl: string, clientId: string): Observable<DiscoveryResult> {
    const params = new URLSearchParams({
      discover: 'true',
      portalUrl,
      clientId
    });

    return this.oauthPopup<DiscoveryResult>(params, (data) => !!data.services);
  }

  private oauthPopup<T>(params: URLSearchParams, isResponse: (data: any) => boolean): Observable<T> {
    let subject = new Subject<T>();

    const url = `${baseUrl}/oauth/signin?${params.toString()}`;
    const oauthWindow = window.open(url, "_blank");

    const listener = (event: any) => {
      if (isResponse(event.data)) {
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

  discoverFeatureServices(request: DiscoveryRequest): Observable<DiscoveryResult> {
    return this.http.post<DiscoveryResult>(`${baseUrl}/featureService/discover`, request)
  }

  confirmFeatureService(url: string, portalUrl: string | undefined, identityManager: string): Observable<FeatureServiceConfig> {
    return this.http.post<FeatureServiceConfig>(`${baseUrl}/featureService/confirm`, { url, portalUrl, identityManager })
  }

  deleteFeatureService(featureServiceUrl: string): Observable<void> {
    return this.http.delete<void>(`${baseUrl}/featureService?featureServiceUrl=${encodeURIComponent(featureServiceUrl)}`)
  }

  fetchEvents(): Observable<MageEvent[]> {
    return this.http.get<MageEvent[]>(`${apiBaseUrl}/events?populate=false&projection={"name":true,"id":true}`)
  }

  fetchPopulatedEvents() {
    return this.http.get<MageEvent[]>(`${apiBaseUrl}/events`)
  }

  putArcConfig(config: ArcGISPluginConfig) {
    return this.http.put<ArcGISPluginConfig>(`${baseUrl}/config`, config)
  }

  fetchPushStatus(eventId: number, pageIndex: number, pageSize: number): Observable<PushedObservationsPage> {
    return this.http.get<PushedObservationsPage>(`${baseUrl}/pushStatus?eventId=${eventId}&pageIndex=${pageIndex}&pageSize=${pageSize}`)
  }
}