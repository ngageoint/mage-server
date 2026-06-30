import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AdminUserService } from '../admin/services/admin-user.service';

type StateKey = 'all' | 'active' | 'inactive' | 'disabled';

export interface UserPagingState {
  countFilter: any;
  userFilter: {
    pageSize: number;
    pageIndex: number;
    sort: any;
    active?: boolean;
    enabled?: boolean;
    term?: string;
  };
  searchFilter: string;
  userCount: number;
  pageInfo: any;
}

export type UsersStateAndData = Record<StateKey, UserPagingState>;

@Injectable({ providedIn: 'root' })
export class UserPagingService {
  constructor(private userService: AdminUserService) {}

  constructDefault(): UsersStateAndData {
    return {
      all: {
        countFilter: {},
        userFilter: { pageSize: 10, pageIndex: 0, sort: { displayName: 1, _id: 1 } },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      active: {
        countFilter: { active: true },
        userFilter: { pageSize: 10, pageIndex: 0, sort: { displayName: 1, _id: 1 }, active: true },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      inactive: {
        countFilter: { active: false },
        userFilter: { pageSize: 10, pageIndex: 0, sort: { displayName: 1, _id: 1 }, active: false },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      },
      disabled: {
        countFilter: { enabled: false },
        userFilter: { pageSize: 10, pageIndex: 0, sort: { displayName: 1, _id: 1 }, enabled: false },
        searchFilter: '',
        userCount: 0,
        pageInfo: {}
      }
    };
  }

  refresh(stateAndData: UsersStateAndData): Observable<string[]> {
    const entries = Object.entries(stateAndData) as Array<[StateKey, UserPagingState]>;
    if (!entries.length) return of([]);

    const calls = entries.map(([key, bucket]) => {
      const params = this.buildParams(bucket);
      return this.userService.getAllUsers(params).pipe(
        tap((page) => {
          bucket.userCount = page?.totalCount ?? page?.items?.length ?? 0;
          bucket.pageInfo = page ?? {};
        }),
        map(() => key)
      );
    });

    return forkJoin(calls);
  }

  count(data: UserPagingState): number {
    return data.userCount || 0;
  }

  hasNext(data: UserPagingState): boolean {
    const links = data?.pageInfo?.links;
    return !!links && links.next !== null && links.next !== undefined;
  }

  next(data: UserPagingState): Observable<any[]> {
    if (!this.hasNext(data)) return of(this.users(data));

    data.userFilter.pageIndex = data.pageInfo.links.next;
    return this.move({ ...data.userFilter, term: data.searchFilter }, data);
  }

  hasPrevious(data: UserPagingState): boolean {
    const links = data?.pageInfo?.links;
    return !!links && links.prev !== null && links.prev !== undefined;
  }

  previous(data: UserPagingState): Observable<any[]> {
    if (!this.hasPrevious(data)) return of(this.users(data));

    data.userFilter.pageIndex = data.pageInfo.links.prev;
    return this.move({ ...data.userFilter, term: data.searchFilter }, data);
  }

  users(data: UserPagingState): any[] {
    return Array.isArray(data?.pageInfo?.items) ? data.pageInfo.items : [];
  }

  search(data: UserPagingState, userSearch: string): Observable<any[]> {
    const previousSearch = data.searchFilter || '';
    const nextSearch = userSearch || '';

    if (previousSearch === '' && nextSearch === '') return of(this.users(data));

    if (previousSearch !== '' && nextSearch === '') {
      data.searchFilter = '';
      data.userFilter.pageIndex = 0;
      return this.move({ ...data.userFilter, pageIndex: 0, term: '' }, data);
    }

    if (previousSearch === nextSearch) return of(this.users(data));

    data.searchFilter = nextSearch;
    data.userFilter.pageIndex = 0;
    return this.move({ ...data.userFilter, pageIndex: 0, term: nextSearch }, data);
  }

  private move(filter: any, data: UserPagingState): Observable<any[]> {
    const params = this.buildParams({ ...data, userFilter: { ...data.userFilter, ...filter } });
    return this.userService.getAllUsers(params).pipe(
      tap((pageInfo) => {
        data.pageInfo = pageInfo ?? {};
        data.userCount = pageInfo?.totalCount ?? pageInfo?.items?.length ?? 0;
      }),
      map(() => this.users(data))
    );
  }

  private buildParams(bucket: UserPagingState): any {
    const f = bucket.userFilter;

    const params: any = {
      pageSize: f.pageSize,
      pageIndex: f.pageIndex,
      sort: f.sort,
      term: bucket.searchFilter
    };

    if (typeof f.active === 'boolean') params.active = f.active;
    if (typeof f.enabled === 'boolean') params.enabled = f.enabled;

    return params;
  }
}
