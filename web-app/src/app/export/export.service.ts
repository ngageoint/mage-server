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

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor(private http: HttpClient) { }

    getMyExports(): Observable<Object> {
        return this.http.get('/api/exports/myself');
    }

    getAllExports(): Observable<Object> {
        return this.http.get('/api/exports');
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