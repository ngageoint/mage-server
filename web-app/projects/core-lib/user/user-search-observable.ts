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

  const queryParams: any = {
    page_size: String(which.pageSize),
    page: String(which.pageIndex)
  };

  if (which.term) queryParams.term = which.term;
  if (which.active !== undefined)
    queryParams.active = which.active ? 'true' : 'false';
  if (which.enabled !== undefined)
    queryParams.enabled = which.enabled ? 'true' : 'false';
  if (which.includeTotalCount !== undefined)
    queryParams.total = which.includeTotalCount ? 'true' : 'false';

  return http
    .get<PageOf<UserSearchResult>>(`${baseUrl}/search`, {
      params: queryParams
    })
    .pipe(
      map((result) => result as PageOf<UserSearchResult>),
      tap((result) => {
        cachedResults.set(cacheKey, result);
      })
    );
}

