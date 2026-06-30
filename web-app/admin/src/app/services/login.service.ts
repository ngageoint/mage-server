import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import moment from 'moment';

@Injectable({ providedIn: 'root' })
export class LoginService {

  constructor(private http: HttpClient) { }

  query(options?: {
    filter?: any;
    limit?: number;
    url?: string;
  }): Promise<any> {
    options = options || {};
    const filter = options.filter || {};

    let params = new HttpParams();

    if (filter.user?.id) {
      params = params.set('userId', filter.user.id);
    }

    if (filter.deviceIds) {
      params = params.set('deviceIds', filter.deviceIds);
    } else if (filter.device?.id) {
      params = params.set('deviceId', filter.device.id);
    }

    if (filter.startDate) {
      params = params.set(
        'startDate',
        moment(filter.startDate).toISOString()
      );
    }

    if (filter.endDate) {
      params = params.set(
        'endDate',
        moment(filter.endDate).toISOString()
      );
    }

    if (options.limit) {
      params = params.set('limit', String(options.limit));
    }

    const url = options.url || '/api/logins';

    return firstValueFrom(
      this.http.get<any>(url, options.url ? {} : { params })
    );
  }
}
