import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { EventObservationSummary, ObservationStatusResponse } from '../entities/entities.format';
import { baseUrl } from '../configuration/configuration.service';

export interface ObservationStatusApi {
  getObservationStatusSummary(): Observable<EventObservationSummary[]>
  getObservationStatuses(eventId: number, statusFilter?: string[]): Observable<ObservationStatusResponse>
  requeueObservations(eventId: number, observationIds: string[]): Observable<{ queued: number }>
}

@Injectable({
  providedIn: 'root'
})
export class ObservationStatusService implements ObservationStatusApi {
  constructor(private http: HttpClient) {}

  getObservationStatusSummary(): Observable<EventObservationSummary[]> {
    return this.http.get<EventObservationSummary[]>(`${baseUrl}/observations/summary`).pipe(
      catchError(error => {
        console.error('Failed to fetch observation status summary:', error)
        return of([])
      })
    )
  }

  getObservationStatuses(eventId: number, statusFilter?: string[]): Observable<ObservationStatusResponse> {
    let url = `${baseUrl}/observations?eventId=${eventId}`
    if (statusFilter?.length) {
      url += `&status=${statusFilter.join(',')}`
    }
    return this.http.get<ObservationStatusResponse>(url).pipe(
      catchError(error => {
        console.error('Failed to fetch observation statuses:', error)
        return of({ records: [], counts: {} })
      })
    )
  }

  requeueObservations(eventId: number, observationIds: string[]): Observable<{ queued: number }> {
    return this.http.post<{ queued: number }>(`${baseUrl}/observations/sync`, { eventId, observationIds }, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(error => {
        console.error('Failed to requeue observations:', error)
        return of({ queued: 0 })
      })
    )
  }
}
