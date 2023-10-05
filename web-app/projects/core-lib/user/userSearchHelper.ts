import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging';
import {
  UserReadService,
  UserSearchParams,
  UserSearchResult
} from './user-read.service';

let lastSearchParams: UserSearchParams | null = null;
let lastSearchResult: PageOf<UserSearchResult> | null = null;

export function userSearchObservable(
  which: UserSearchParams,
  userReadService: UserReadService
): Observable<PageOf<UserSearchResult>> {
  // Check if search params are the same as the last search
  if (
    lastSearchParams &&
    JSON.stringify(lastSearchParams) === JSON.stringify(which)
  ) {
    return of(lastSearchResult!);
  }

  return userReadService.baseSearch(which).pipe(
    tap((result) => {
      lastSearchParams = which;
      lastSearchResult = result;
    })
  );
}

