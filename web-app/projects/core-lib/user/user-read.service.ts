import { HttpClient } from '@angular/common/http'
import { InjectionToken, Injectable } from '@angular/core'
import { PageOf, PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators';
import { User } from './user.model'
import { userSearchObservable } from './user-search-observable'

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
  includeTotalCount: 'total',
}

@Injectable({
  providedIn: 'root'
})
export class UserReadService {
  private lastSearchParams: UserSearchParams | null = null;
  private lastSearchResult: PageOf<UserSearchResult> | null = null;

  constructor(private http: HttpClient) {}

  search(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    // Check if the search parameters are the same as the last search
    if (
      this.lastSearchParams &&
      JSON.stringify(this.lastSearchParams) === JSON.stringify(which)
    ) {
      return of(this.lastSearchResult!);
    }

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

    return this.http
      .get<PageOf<UserSearchResult>>(`${USER_READ_BASE_URL}/search`, {
        params: queryParams
      })
      .pipe(
        tap((result) => {
          this.lastSearchParams = which;
          this.lastSearchResult = result;
        })
      );
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

export type UserSearchResult = Pick<User, 'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'> & {
  /**
   * A reduction of all the phone numbers to a single string
   */
  allPhones?: string | null | undefined
}

export const USER_READ_SERVICE = new InjectionToken<UserReadService>('UserReadService')