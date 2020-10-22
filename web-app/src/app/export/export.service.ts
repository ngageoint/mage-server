import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable()
export class ExportService {

    constructor(private http: HttpClient) { }

    getMyExports() {
        return this.http.get('/api/exports/myself');
    }

    getAllExports() {
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

    deleteExport(exportId: string) {
        const url = "/api/exports/" + exportId;
        return this.http.delete(url);
    }
}