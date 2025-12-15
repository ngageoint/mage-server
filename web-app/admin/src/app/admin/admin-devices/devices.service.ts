import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';

export interface SearchOptions {
    term?: string;
    teamId?: string;
    excludeTeamId?: string;
    id?: string;
    page?: number;
    page_size?: number;
    userId?: string;
    state?: string;
}

export interface DevicesResponse {
    pageSize?: number;
    page?: number;
    items: { devices: Device[] };
    totalCount?: number;
}

export interface PagedResponse<T> {
    pageSize?: number;
    pageIndex?: number;
    items: T[];
    totalCount?: number;
}

const setParams = (options: any): HttpParams => {
    let params = new HttpParams();
    for (const key of Object.keys(options)) {
        if (options[key] !== undefined && options[key] !== null) {
            params = params.set(key, String(options[key]));
        }
    }
    return params;
};

@Injectable({
    providedIn: 'root'
})
export class DevicesService {

    constructor(private http: HttpClient) { }

    getDevices(options: SearchOptions): Observable<DevicesResponse> {
        let params = setParams(options);

        params = params.set('includePagination', 'true');

        return this.http.get<DevicesResponse>('/api/devices', { params });
    }

    getDeviceById(deviceId: string): Observable<Device> {
        return this.http.get<Device>(`/api/devices/${deviceId}`);
    }

    updateDevice(deviceId: string, device: Partial<Device>): Observable<Device> {
        return this.http.put<Device>(`/api/devices/${deviceId}`, device);
    }

    deleteDevice(deviceId: string): Observable<void> {
        return this.http.delete<void>(`/api/devices/${deviceId}`);
    }

    createDevice(deviceData: Partial<Device>): Observable<Device> {
        return this.http.post<Device>('/api/devices', deviceData);
    }
}
