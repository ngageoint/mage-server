import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging';
import { UserSearchParams, UserSearchResult } from './user-read.service';

export function userSearchObservable(
  which: UserSearchParams,
  http: HttpClient,
  baseUrl: string
): Observable<PageOf<UserSearchResult>> {
  const cachedResults = new Map<string, PageOf<UserSearchResult>>();

  const cacheKey = JSON.stringify(which);
  if (cachedResults.has(cacheKey)) {
    return of(cachedResults.get(cacheKey)!);
  }

  const queryParams = {
    page_size: String(which.pageSize),
    page: String(which.pageIndex),
    term: which.term,
    active: which.active ? 'true' : 'false',
    enabled: which.enabled ? 'true' : 'false',
    total: which.includeTotalCount ? 'true' : 'false'
  };

  return http
    .get<PageOf<UserSearchResult>>(`${baseUrl}/search`, {
      params: queryParams as any
    })
    .pipe(
      map((result) => result as PageOf<UserSearchResult>),
      tap((result) => {
        cachedResults.set(cacheKey, result);
      })
    );
}
