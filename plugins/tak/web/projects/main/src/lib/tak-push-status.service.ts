import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Actual registered package name of the tak service plugin - this is the
// Express mount prefix the running server derives automatically from it
// (/plugins/<pluginId>), not something configurable here. No ".service"
// suffix - unlike sftp, this one package covers both the feed and the push
// routes.
export const baseUrl = '/plugins/@ngageoint/mage.tak';

export interface MageEventSummary {
  id: number;
  name: string;
}

export interface RecentlySyncedObservation {
  observationId: string;
  callsign: string;
  syncedAt: string;
}

export interface TakPushStatus {
  enabled: boolean;
  locationSharingEnabled: boolean;
  connectionConfigured: boolean;
  pushedCount: number;
  lastSyncedAt: string | null;
  recentlySynced: RecentlySyncedObservation[];
}

@Injectable({
  providedIn: 'root'
})
export class TakPushStatusService {

  constructor(private http: HttpClient) { }

  getEvents(): Observable<MageEventSummary[]> {
    return this.http.get<MageEventSummary[]>('/api/events');
  }

  getStatus(eventId: number): Observable<TakPushStatus> {
    return this.http.get<TakPushStatus>(`${baseUrl}/settings`, { params: { eventId } });
  }

  setEnabled(eventId: number, enabled: boolean): Observable<TakPushStatus> {
    return this.http.post<TakPushStatus>(`${baseUrl}/settings`, { eventId, enabled });
  }

  setLocationSharingEnabled(eventId: number, enabled: boolean): Observable<TakPushStatus> {
    return this.http.post<TakPushStatus>(`${baseUrl}/settings`, { eventId, locationSharingEnabled: enabled });
  }
}
