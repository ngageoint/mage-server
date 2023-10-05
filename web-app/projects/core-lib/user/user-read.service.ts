import { HttpClient } from '@angular/common/http';
import { InjectionToken, Injectable } from '@angular/core';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging';
import { Observable } from 'rxjs';
import { User } from './user.model';
import { userSearchObservable } from './user-search-observable';

export const USER_READ_BASE_URL = '/api/next-users';
@Injectable({
  providedIn: 'root'
})
export class UserReadService {
  constructor(private http: HttpClient) {}

  search(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    return userSearchObservable(which, this.http, USER_READ_BASE_URL);
  }
}

export interface UserSearchParams {
  term?: string;
  pageSize: number;
  pageIndex: number;
  active?: boolean;
  enabled?: boolean;
  includeTotalCount?: boolean;
}

export type UserSearchResult = Pick<
  User,
  'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'
> & {
  allPhones?: string | null | undefined;
};

export const USER_READ_SERVICE = new InjectionToken<UserReadService>(
  'UserReadService'
);