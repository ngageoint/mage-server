import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocalStorageService } from '../http/local-storage.service';

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

  constructor(
    private webClient: HttpClient,
    private snackBar: MatSnackBar,
    private localStorageService: LocalStorageService) { }

  getExports(): Observable<Export[]> {
    return this.webClient.get<Export[]>('/api/exports/myself');
  }

  getAllExports(): Observable<Export[]> {
    return this.webClient.get<Export[]>('/api/exports');
  }

  export(request: ExportRequest): Observable<ExportResponse> {
    return this.webClient.post<ExportResponse>('/api/exports', request, {
      headers: { "Content-Type": "application/json" }
    });
  }

  deleteExport(exportId: string): Observable<Object> {
    const url = "/api/exports/" + exportId;
    return this.webClient.delete(url);
  }

  retryExport(retry: Export): Observable<ExportResponse> {
    return this.webClient.post<ExportResponse>(`/api/exports/${retry.id}/retry`, {}, {
      headers: { "Content-Type": "application/json" }
    });
  }

  /**
   * Poll the export status until it reaches a terminal state, then notify the
   * user with a snackbar. This runs on the root ExportService singleton so it
   * survives the export dialog being closed after submitting the request.
   */
  notifyOnComplete(exportId: string): void {
    // Poll every 5s, giving up after 10 minutes (120 attempts).
    timer(5000, 5000).pipe(
      take(120),
      switchMap(() => this.getExports()),
      map(exports => exports.find(exp => exp.id === exportId)),
      filter(exp => exp != null && (exp.status === 'Completed' || exp.status === 'Failed')),
      take(1)
    ).subscribe(exp => {
      if (exp.status === 'Completed') {
        const ref = this.snackBar.open('Export complete', 'Download', { duration: 10000 });
        ref.onAction().subscribe(() => this.downloadExport(exp));
      } else {
        this.snackBar.open('Export failed', null, { duration: 5000 });
      }
    });
  }

  private downloadExport(exp: Export): void {
    const token = this.localStorageService.getToken();
    const anchor = document.createElement('a');
    anchor.href = `${exp.url}?access_token=${token}`;
    anchor.download = exp.filename || '';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}