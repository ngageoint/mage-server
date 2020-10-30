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

    performExport(request: ExportRequest): Observable<string> {
        return this.http.post<string>('/api/exports', JSON.stringify(request), {
            headers: { "Content-Type": "application/json" }
        });
    }

    deleteExport(exportId: string): Observable<Object> {
        const url = "/api/exports/" + exportId;
        return this.http.delete(url);
    }
}