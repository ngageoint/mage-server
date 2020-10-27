import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

    //TODO implement
    /*performExport(type: string, params: any) {
        params = params || {};
        params.exportType = type;

        const params = new HttpParams()
            .set('q', query);

        return this.http.post('/api/exports', { params: params }, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
    }*/

    deleteExport(exportId: string): Observable<Object> {
        const url = "/api/exports/" + exportId;
        return this.http.delete(url);
    }
}