import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Export {
  id: any,
  userId: any,
  physicalPath: string,
  filename?: string,
  exportType: string,
  url: string,
  status: string,
  options: any
}

export interface ExportRequest {
  eventId: number,
  exportType: string,
  observations: boolean,
  locations: boolean,
  attachments?: boolean,
  favorites?: boolean,
  important?: boolean,
  startDate?: string,
  endDate?: string
}

export interface ExportResponse {
  id: string
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private http: HttpClient) { }

  getExports(): Observable<Export[]> {
    return this.http.get<Export[]>('/api/exports/myself');
  }

  getAllExports(): Observable<Export[]> {
    return this.http.get<Export[]>('/api/exports');
  }

  export(request: ExportRequest): Observable<ExportResponse> {
    return this.http.post<ExportResponse>('/api/exports', request, {
      headers: { "Content-Type": "application/json" }
    });
  }

  deleteExport(exportId: string): Observable<Object> {
    const url = "/api/exports/" + exportId;
    return this.http.delete(url);
  }

  retryExport(retry: Export): Observable<ExportResponse> {
    return this.http.post<ExportResponse>(`/api/exports/${retry.id}/retry`, {}, {
      headers: { "Content-Type": "application/json" }
    });
  }
}