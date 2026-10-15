import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Export, ExportRequest } from './entities.export';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  private _exports = new BehaviorSubject<Export[]>([])
  exports$ = this._exports.asObservable()

  constructor(private httpClient: HttpClient) { }

  export(eventId: number, request: ExportRequest): Observable<Export> {
    return this.httpClient.post<Export>(`/api/events/${eventId}/exports`, request, {
      headers: { "Content-Type": "application/json" }
    }).pipe(
      tap((e: Export) => {
        const exports = [e].concat(this._exports.value)
        this._exports.next(exports)
      })
    )
  }

  fetchExports(): Observable<Export[]> {
    return this.httpClient.get<Export[]>('/api/exports/mine').pipe(
      tap(exports => this._exports.next(JSON.parse(JSON.stringify(exports))))
    )
  }

  deleteExport(exportId: string): Observable<Object> {
    return this.httpClient.delete(`/api/exports/mine/${exportId}`)
      .pipe(
        tap(() => {
          const exports = this._exports.value.filter(e => e.id !== exportId)
          this._exports.next(exports)
        })
      )
  }
}
