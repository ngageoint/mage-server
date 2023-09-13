import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    constructor(private client: HttpClient) { }

    getApi(): Observable<any> {
        return this.client.get<any>('/api');
    }
}