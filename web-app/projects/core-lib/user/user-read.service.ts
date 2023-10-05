import { HttpClient } from '@angular/common/http'
import { InjectionToken, Injectable } from '@angular/core'
import { PageOf, PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators';
import { User } from './user.model'
import { userSearchObservable } from './userSearchHelper'

export const USER_READ_BASE_URL = '/api/next-users'

type SearchQueryParams = {
  page_size: string;
  page: string;
  term?: string;
  total?: 'true' | 'false';
  active?: 'true' | 'false';
  enabled?: 'true' | 'false';
};

const reqKeys: { [SearchParamKey in keyof UserSearchParams]: string } = {
  term: 'term',
  pageSize: 'page_size',
  pageIndex: 'page',
  // includeTotalCount: 'total',
}

@Injectable({
  providedIn: 'root'
})
export class UserReadService {
  constructor(private http: HttpClient) {}

  baseSearch(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    const queryParams: SearchQueryParams = {
      page_size: String(which.pageSize),
      page: String(which.pageIndex)
    };

    if (typeof which.term === 'string') {
      queryParams.term = which.term;
    }

    if (which.active !== undefined) {
      queryParams.active = which.active ? 'true' : 'false';
    }
    if (which.enabled !== undefined) {
      queryParams.enabled = which.enabled ? 'true' : 'false';
    }

    return this.http.get<PageOf<UserSearchResult>>(
      `${USER_READ_BASE_URL}/search`,
      {
        params: queryParams
      }
    );
  }

  search(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    return userSearchObservable(which, this);
  }
}
export interface UserSearchParams {
  term?: string;
  pageSize: number;
  pageIndex: number;
  active?: boolean;
  enabled?: boolean;
}

export type UserSearchResult = Pick<User, 'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'> & {
  /**
   * A reduction of all the phone numbers to a single string
   */
  allPhones?: string | null | undefined
}

export const USER_READ_SERVICE = new InjectionToken<UserReadService>('UserReadService')