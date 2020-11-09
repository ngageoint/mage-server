import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExportMetadata {
    _id: any,
    userId: any,
    physicalPath: string,
    filename?: string,
    exportType: string,
    location: string,
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
    exportId: string
}

@Injectable({
    providedIn: 'root'
})
export class ExportMetadataService {

    constructor(private http: HttpClient) { }

    getMyExportMetadata(): Observable<ExportMetadata[]> {
        return this.http.get<ExportMetadata[]>('/api/exports/myself');
    }

    getAllExportMetadata(): Observable<ExportMetadata[]> {
        return this.http.get<ExportMetadata[]>('/api/exports/all');
    }

    performExport(request: ExportRequest): Observable<ExportResponse> {
        return this.http.post<ExportResponse>('/api/exports', JSON.stringify(request), {
            headers: { "Content-Type": "application/json" }
        });
    }

    deleteExport(exportId: string): Observable<Object> {
        const url = "/api/exports/" + exportId;
        return this.http.delete(url);
    }

    retryExport(meta: ExportMetadata): Observable<ExportResponse> {
        const request = {
            exportId: meta._id
        }
        return this.http.post<ExportResponse>('/api/exports/retry', JSON.stringify(request), {
            headers: { "Content-Type": "application/json" }
        });
    }
}