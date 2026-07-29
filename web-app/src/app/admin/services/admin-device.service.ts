import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Device, DeviceRequest } from 'src/app/entities/device/device';

export interface SearchOptions {
  term?: string;
  teamId?: string;
  excludeTeamId?: string;
  id?: string;
  page?: number;
  page_size?: number;
  userId?: string;
  state?: string;

  limit?: number;
  start?: number | string;
  sort?: any;
  registered?: boolean;
  or?: any;
  expand?: string;
  user?: boolean;
  includePagination?: boolean;
}

export interface DevicesResponse {
  pageSize?: number;
  page?: number;
  items: { devices: Device[] };
  totalCount?: number;
  links?: { next?: string; prev?: string };
}

export interface DeviceCountDoc {
  count: number;
}

export interface DevicePageInfo {
  devices: Device[];
  links?: { next?: string; prev?: string };
}

export interface DashboardDevicePageInfo {
  devices: Device[];
  totalCount: number;
  limit: number;
  start: number;
  nextStart: number | null;
  prevStart: number | null;
}

export interface PagedResponse<T> {
  pageSize?: number;
  pageIndex?: number;
  items: T[];
  totalCount?: number;
}

const setParams = (options: any): HttpParams => {
  let params = new HttpParams();

  for (const key of Object.keys(options || {})) {
    const v = options[key];

    if (v !== undefined && v !== null) {
      params = params.set(key, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  return params;
};

const toNumberOrNull = (value: number | string | null | undefined): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
};

@Injectable({
  providedIn: 'root'
})
export class AdminDeviceService {
  constructor(private http: HttpClient) { }

  getDevices(options: SearchOptions): Observable<DevicesResponse> {
    let params = setParams(options);
    params = params.set('includePagination', 'true');

    return this.http.get<DevicesResponse>('/api/devices', { params });
  }

  getAllDevices(filter: any): Observable<DevicePageInfo> {
    const params = setParams({ ...filter, includePagination: true });

    return this.http.get<any>('/api/devices', { params }).pipe(
      map((res) => {
        const devices =
          res?.devices ??
          res?.items?.devices ??
          res?.items ??
          res?.pageInfo?.devices ??
          [];

        const rawLinks =
          res?.items?.links ??
          res?.links ??
          res?.pageInfo?.links ??
          {};

        const links = {
          next:
            rawLinks?.next !== undefined && rawLinks?.next !== null
              ? String(rawLinks.next)
              : undefined,
          prev:
            rawLinks?.prev !== undefined && rawLinks?.prev !== null
              ? String(rawLinks.prev)
              : undefined
        };

        return { devices, links } as DevicePageInfo;
      })
    );
  }

  getDashboardDevicePage(options: SearchOptions): Observable<DashboardDevicePageInfo> {
    const limit = Number(options.limit ?? options.page_size ?? 5);
    const start = Number(options.start ?? 0);

    const params = setParams({
      ...options,
      start,
      limit,
      includePagination: true
    });

    return this.http.get<any>('/api/devices', { params }).pipe(
      map((res) => {
        const items = res?.items ?? {};
        const links = items?.links ?? res?.links ?? {};
        const devices = items?.devices ?? res?.devices ?? [];

        return {
          devices,
          totalCount: Number(items?.totalCount ?? res?.totalCount ?? devices.length),
          limit: Number(items?.limit ?? res?.pageSize ?? limit),
          start: Number(items?.start ?? start),
          nextStart: toNumberOrNull(links?.next),
          prevStart: toNumberOrNull(links?.prev)
        } as DashboardDevicePageInfo;
      })
    );
  }

  count(filter: any): Observable<DeviceCountDoc> {
    const params = setParams(filter);

    return this.http.get<DeviceCountDoc>('/api/devices/count', { params });
  }

  getDeviceById(deviceId: string): Observable<Device> {
    return this.http.get<Device>(`/api/devices/${deviceId}`, { params: new HttpParams().set('expand', 'user') });
  }

  updateDevice(deviceId: string, device: DeviceRequest): Observable<Device> {
    return this.http.put<Device>(`/api/devices/${deviceId}`, device);
  }

  deleteDevice(deviceId: string): Observable<void> {
    return this.http.delete<void>(`/api/devices/${deviceId}`);
  }

  createDevice(deviceData: DeviceRequest): Observable<Device> {
    return this.http.post<Device>('/api/devices', deviceData);
  }
}