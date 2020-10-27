import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExportMetadata {
    userId: any,
    physicalPath: string,
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
        return this.http.get<ExportMetadata[]>('/api/exports');
    }

    performExport(request: ExportRequest): Observable<string> {
        const httpParams = new HttpParams();
        Object.keys(request).forEach(key => httpParams.set(key, request[key] != null ? request[key].toString(): null));

        return this.http.post<string>('/api/exports', JSON.stringify(request), {
            headers: { "Content-Type": "application/json" },
            params: httpParams
        });
    }

    deleteExport(exportId: string): Observable<Object> {
        const url = "/api/exports/" + exportId;
        return this.http.delete(url);
    }
}