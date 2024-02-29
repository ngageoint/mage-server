import { HttpClient } from '@angular/common/http'
import { InjectionToken, Injectable } from '@angular/core'
import { PageOf, PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { Observable } from 'rxjs'
import { User } from './user.model'

export const USER_READ_BASE_URL = '/api/next-users'

type SearchQueryParams = {
  page_size: string,
  page: string,
  term?: string,
  total?: 'true' | 'false'
}


@Injectable({
  providedIn: 'root'
})
export class UserReadService {

  constructor(private webClient: HttpClient) { }

  search(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    const queryParams: SearchQueryParams = {
      page_size: String(which.pageSize),
      page: String(which.pageIndex),
    }
    if (typeof which.term === 'string') {
      queryParams.term = which.term
    }
    if (typeof which.includeTotalCount === 'boolean') {
      queryParams.total = which.includeTotalCount ? 'true' : 'false'
    }
    return this.webClient.get<PageOf<UserSearchResult>>(`${USER_READ_BASE_URL}/search`, {
      params: queryParams
    })
  }
}

export interface UserSearchParams extends PagingParameters {
  term?: string | null | undefined
}

export type UserSearchResult = Pick<User, 'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'> & {
  /**
   * A reduction of all the phone numbers to a single string
   */
  allPhones?: string | null | undefined
}

export const USER_READ_SERVICE = new InjectionToken<UserReadService>('UserReadService')