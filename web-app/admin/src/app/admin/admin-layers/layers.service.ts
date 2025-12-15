import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Layer {
    id?: number;
    name?: string;
    description?: string;
    type?: 'Imagery' | 'Feature' | 'GeoPackage';
    url?: string;
    file?: {
        name: string;
        relativePath: string;
        contentType: string;
        size: number;
    };
    format?: string;
    base?: string;
    wms?: any;
    wmsOptions?: any;
    state?: 'available' | 'processing' | 'unavailable';
    tables?: Array<{ name: string;[key: string]: any }>;
    processing?: Array<{
        layer: string;
        type: 'tile' | 'feature';
        complete: boolean;
        description?: string;
        count?: number;
        total?: number;
    }>;
    validating?: boolean;
    invalid?: {
        errors: Array<{
            error: string;
            warning?: boolean;
            fatal?: boolean;
        }>;
    };
}

export interface LayersResponse {
    items: Layer[];
    totalCount: number;
}

export interface SearchOptions {
    includeUnavailable?: boolean;
    type?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LayersService {
    constructor(private http: HttpClient) { }

    getLayers(options?: SearchOptions): Observable<Layer[]> {
        let params = new HttpParams();

        if (options?.includeUnavailable) {
            params = params.set('includeUnavailable', 'true');
        }
        if (options?.type) {
            params = params.set('type', options.type);
        }

        return this.http.get<Layer[]>('/api/layers', { params });
    }

    getLayerById(id: string): Observable<Layer> {
        return this.http.get<Layer>(`/api/layers/${id}`);
    }

    deleteLayer(layer: Layer): Observable<any> {
        return this.http.delete(`/api/layers/${layer.id}`, { responseType: 'text' });
    }

    updateLayer(id: string, layer: Partial<Layer>): Observable<Layer> {
        return this.http.put<Layer>(`/api/layers/${id}`, layer);
    }

    createLayer(layer: Partial<Layer> | FormData): Observable<Layer> {
        return this.http.post<Layer>('/api/layers', layer);
    }

    getLayerCount(): Observable<{ count: number }> {
        return this.http.get<{ count: number }>('/api/layers/count');
    }
}
