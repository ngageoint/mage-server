import { HttpClient } from '@angular/common/http'
import { InjectionToken, Injectable } from '@angular/core'
import { PageOf, PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators';
import { User } from './user.model'

export const USER_READ_BASE_URL = '/api/next-users'

type SearchQueryParams = {
  page_size: string;
  page: string;
  term?: string;
  total?: 'true' | 'false';
  activeOnly?: 'true' | 'false';
  enabledOnly?: 'true' | 'false';
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
    // If search term is empty and the last search had a term, clear the search
    if (!which.term && this.lastSearchParams?.term) {
      this.clearSearch();
    }

    // Check if search params are the same as the last search
    if (
      this.lastSearchParams &&
      JSON.stringify(this.lastSearchParams) === JSON.stringify(which)
    ) {
      // Return cached result
      return of(this.lastSearchResult);
    }

    const queryParams: SearchQueryParams = {
      page_size: String(which.pageSize),
      page: String(which.pageIndex)
    };

    if (typeof which.term === 'string') {
      queryParams.term = which.term;
    }

    // Add new filter queries
    if (which.activeOnly) {
      queryParams.activeOnly = 'true';
    }
    if (which.enabledOnly) {
      queryParams.enabledOnly = 'true';
    }

    return this.http
      .get<PageOf<UserSearchResult>>(`${USER_READ_BASE_URL}/search`, {
        params: queryParams
      })
      .pipe(
        tap((result) => {
          // Cache the search params and result for next time
          this.lastSearchParams = which;
          this.lastSearchResult = result;
        })
      );
  }

  // Method to clear cached search results and parameters
  clearSearch(): void {
    this.lastSearchParams = null;
    this.lastSearchResult = null;
  }
}


export interface UserSearchParams extends PagingParameters {
  term?: string | null | undefined;
  activeOnly?: boolean;
  enabledOnly?: boolean;
}

export type UserSearchResult = Pick<User, 'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'> & {
  /**
   * A reduction of all the phone numbers to a single string
   */
  allPhones?: string | null | undefined
}

export const USER_READ_SERVICE = new InjectionToken<UserReadService>('UserReadService')