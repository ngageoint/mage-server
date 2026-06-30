import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminDeviceService } from '../admin/services/admin-device.service';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';

export interface DevicePagingBucket {
  countFilter: any;
  deviceFilter: any;
  searchFilter: string;
  deviceCount: number;
  pageInfo: { devices?: Device[]; links?: { next?: string; prev?: string } };
}

export type DevicePagingStateAndData = {
  all: DevicePagingBucket;
  registered: DevicePagingBucket;
  unregistered: DevicePagingBucket;
  [key: string]: DevicePagingBucket;
};

@Injectable({ providedIn: 'root' })
export class DevicePagingService {

  constructor(private deviceService: AdminDeviceService) {}

  constructDefault(): DevicePagingStateAndData {
    return {
      all: {
        countFilter: {},
        deviceFilter: { limit: 10, sort: { userAgent: 1, _id: 1 } },
        searchFilter: '',
        deviceCount: 0,
        pageInfo: {}
      },
      registered: {
        countFilter: { registered: true },
        deviceFilter: { limit: 10, sort: { userAgent: 1, _id: 1 }, registered: true },
        searchFilter: '',
        deviceCount: 0,
        pageInfo: {}
      },
      unregistered: {
        countFilter: { registered: false },
        deviceFilter: { limit: 10, sort: { userAgent: 1, _id: 1 }, registered: false },
        searchFilter: '',
        deviceCount: 0,
        pageInfo: {}
      }
    };
  }

  refresh(stateAndData: DevicePagingStateAndData): Observable<string[]> {
    const entries = Object.entries(stateAndData);

    if (!entries.length) return of([]);

    const calls = entries.map(([key, bucket]) => {
      return forkJoin({
        count: this.deviceService.count(bucket.countFilter).pipe(map(d => d?.count ?? 0)),
        pageInfo: this.deviceService.getAllDevices(bucket.deviceFilter)
      }).pipe(
        map(({ count, pageInfo }) => {
          stateAndData[key].deviceCount = count;
          stateAndData[key].pageInfo = pageInfo ?? {};
          return key;
        })
      );
    });

    return forkJoin(calls);
  }

  count(data: DevicePagingBucket): number {
    return data.deviceCount ?? 0;
  }

  hasNext(data: DevicePagingBucket): boolean {
    const next = data?.pageInfo?.links?.next;
    return !!next;
  }

  next(data: DevicePagingBucket): Observable<Device[]> {
    const next = data?.pageInfo?.links?.next;
    return this.move(next, data);
  }

  hasPrevious(data: DevicePagingBucket): boolean {
    const prev = data?.pageInfo?.links?.prev;
    return !!prev;
  }

  previous(data: DevicePagingBucket): Observable<Device[]> {
    const prev = data?.pageInfo?.links?.prev;
    return this.move(prev, data);
  }

  devices(data: DevicePagingBucket): Device[] {
    return data?.pageInfo?.devices ?? [];
  }

  /**
   * Search against devices or users.
   * @param data bucket
   * @param deviceSearch search for devices
   * @param userSearch pass to search users (expand user)
   */
  search(data: DevicePagingBucket, deviceSearch: string, userSearch?: string | null): Observable<Device[]> {
    if (!data?.pageInfo?.devices) {
      return of([]);
    }

    const previousSearch = data.searchFilter ?? '';

    if (previousSearch === '' && deviceSearch === '') {
      return of(data.pageInfo.devices ?? []);
    }

    if (previousSearch !== '' && deviceSearch === '') {
      data.searchFilter = '';
      delete data.deviceFilter['or'];
      delete data.deviceFilter['expand'];
      delete data.deviceFilter['user'];

      return this.deviceService.getAllDevices(data.deviceFilter).pipe(
        map(pageInfo => {
          data.pageInfo = pageInfo ?? {};
          return data.pageInfo.devices ?? [];
        })
      );
    }

    if (previousSearch === deviceSearch && userSearch == null) {
      return of(data.pageInfo.devices ?? []);
    }

    data.searchFilter = deviceSearch;

    const filter = data.deviceFilter;

    if (userSearch == null) {
      filter.or = {
        userAgent: '.*' + deviceSearch + '.*',
        description: '.*' + deviceSearch + '.*',
        uid: '.*' + deviceSearch + '.*'
      };
    } else {
      filter.or = {
        displayName: '.*' + userSearch + '.*',
        email: '.*' + userSearch + '.*'
      };
      filter.expand = 'user';
      filter.user = true;
    }

    return this.deviceService.getAllDevices(filter).pipe(
      map(pageInfo => {
        data.pageInfo = pageInfo ?? {};
        return data.pageInfo.devices ?? [];
      })
    );
  }

  private move(start: string | undefined, data: DevicePagingBucket): Observable<Device[]> {
    if (!start) return of(data?.pageInfo?.devices ?? []);

    const filter = JSON.parse(JSON.stringify(data.deviceFilter));
    filter.start = start;

    return this.deviceService.getAllDevices(filter).pipe(
      map(pageInfo => {
        data.pageInfo = pageInfo ?? {};
        return data.pageInfo.devices ?? [];
      })
    );
  }
}
