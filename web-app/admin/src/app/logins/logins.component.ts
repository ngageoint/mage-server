import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { Subject, Observable, from, of, isObservable } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { User } from '../admin/admin-users/user';
import { Device } from '../../@types/dashboard/devices-dashboard';
import { Login, LoginFilter, LoginPage } from '../../@types/dashboard/admin-dashboard';

import { AdminDeviceService } from '../admin/services/admin-device.service';
import { AdminUserService } from '../admin/services/admin-user.service';
import { DevicePagingService } from '../services/device-paging.service';
import { UserPagingService } from '../services/user-paging.service';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'mage-logins',
  templateUrl: './logins.component.html',
  styleUrls: ['./logins.component.scss']
})
export class LoginsComponent implements OnInit, OnDestroy {
  @Input() devices: Device[] = [];
  @Input() users: User[] = [];
  @Input() userId?: string;
  @Input() deviceId?: string;

  private destroy$ = new Subject<void>();

  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null as Date | null,
    endDate: null as Date | null
  };

  loginPage: LoginPage | null = null;
  loginResultsLimit = 10;

  loginSearchResults: User[] = [];
  loginDeviceSearchResults: Device[] = [];

  firstLogin: Login | null = null;

  filter: LoginFilter = {};

  user: User | null = null;
  device: Device[] = [];

  deviceText = '';
  userText = '';

  toggleFilters = false;

  private userStateAndData: any = null;
  private userState: string = 'all';

  private deviceStateAndData: any = null;
  private deviceState: string = 'all';

  constructor(
    private adminUserService: AdminUserService,
    private deviceService: AdminDeviceService,
    private loginService: LoginService,
    private userPagingService: UserPagingService,
    private devicePagingService: DevicePagingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    }

    if (this.deviceId) {
      (this.filter as any).device = { id: this.deviceId } as any;
    }

    this.initUserSourceIfNeeded();
    this.initDeviceSourceIfNeeded();
    this.loadInitialLogins();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private to$<T>(value: any): Observable<T> {
    if (!value) return of(value as T);
    if (isObservable(value)) return value as Observable<T>;
    if (typeof value?.then === 'function') return from(value) as Observable<T>;
    return of(value as T);
  }

  private isValidPageLink(link: any): link is string {
    return (
      typeof link === 'string' &&
      link.trim().length > 0 &&
      link !== 'null' &&
      link !== 'undefined'
    );
  }

  get hasPrev(): boolean {
    if (!this.isValidPageLink((this.loginPage as any)?.prev)) return false;
    if (!this.loginPage?.logins?.length) return false;
    if (!this.firstLogin?.id) return false;
    return this.loginPage.logins[0].id !== this.firstLogin.id;
  }

  get hasNext(): boolean {
    if (!this.isValidPageLink((this.loginPage as any)?.next)) return false;
    if (!this.loginPage?.logins?.length) return false;
    return true;
  }
  
  private normalizePageLinks(page: any): void {
    if (!page) return;
    page.prev = this.isValidPageLink(page.prev) ? page.prev : null;
    page.next = this.isValidPageLink(page.next) ? page.next : null;
  }

  private initUserSourceIfNeeded(): void {
    if ((this.users?.length || 0) > 0 || this.userId) return;

    this.userStateAndData = this.userPagingService.constructDefault();

    this.to$<any>(this.userPagingService.refresh(this.userStateAndData))
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.userPagingService.users(
          this.userStateAndData[this.userState]
        );
        this.users = initial || [];
      });
  }

  private initDeviceSourceIfNeeded(): void {
    if ((this.devices?.length || 0) > 0) {
      this.loginDeviceSearchResults = this.devices.slice();
      return;
    }

    this.deviceStateAndData = this.devicePagingService.constructDefault();

    this.to$<any>(this.devicePagingService.refresh(this.deviceStateAndData))
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.devicePagingService.devices(
          this.deviceStateAndData[this.deviceState]
        );
        this.loginDeviceSearchResults = initial || [];
      });
  }

  private queryLogins$(options: any): Observable<any> {
    return this.to$<any>(this.loginService.query(options));
  }

  loadInitialLogins(): void {
    this.queryLogins$({ filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((loginPage: any) => {
        if (!loginPage) return;
        this.normalizePageLinks(loginPage);
        this.loginPage = loginPage;
        this.firstLogin = loginPage?.logins?.length ? loginPage.logins[0] : null;
      });
  }

  pageLogin(url: string): void {
    if (!this.isValidPageLink(url)) return;

    this.queryLogins$({ url, filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((nextPage: any) => {
        if (!nextPage) return;

        this.normalizePageLinks(nextPage);

        if (!nextPage?.logins?.length) {
          if (this.loginPage) {
            (this.loginPage as any).next = null;
            this.normalizePageLinks(this.loginPage as any);
          }
          return;
        }

        this.loginPage = nextPage;
      });
  }

  filterLogins(): void {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    } else {
      this.filter.user = this.user as any;
    }

    if (this.deviceId) {
      (this.filter as any).device = { id: this.deviceId } as any;
    } else if (this.device && this.device.length > 0) {
      (this.filter as any).device = { id: this.device[0].id } as any;
    } else {
      (this.filter as any).device = null;
    }

    this.filter.startDate = this.login.startDate;

    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf('day').toDate();
    } else {
      this.filter.endDate = null as any;
    }

    const hasUser = !!(this.filter.user && (this.filter.user as any).id);
    const hasDevice = !!((this.filter as any).device && (this.filter as any).device.id);
    const hasDate = !!(this.filter.startDate || this.filter.endDate);

    if (!hasUser && !hasDevice && !hasDate) {
      this.loadInitialLogins();
      return;
    }

    this.queryLogins$({ filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((loginPage: any) => {
        if (!loginPage) return;
        this.normalizePageLinks(loginPage);
        this.loginPage = loginPage;
      });
  }

  onUserInputChange(value: string | User): void {
    if (this.userId) return;

    const searchValue: string =
      typeof value === 'string' ? value : value?.displayName || '';

    this.searchLoginsAgainstUsers(searchValue);
  }

  onUserSearchChange(term: string): void {
    this.userText = term;
    this.user = null;

    this.onUserInputChange(term);

    if (!term) {
      this.loginSearchResults = [];
      this.filterLogins();
    }
  }

  onDeviceSearchChange(term: string): void {
    if (this.deviceId) return;

    this.deviceText = term;
    this.device = [];

    if (!term) {
      this.loginDeviceSearchResults = [];
      this.filterLogins();
      return;
    }

    if (this.deviceStateAndData) {
      this.to$<Device[]>(
        this.devicePagingService.search(
          this.deviceStateAndData[this.deviceState],
          term,
          null
        )
      )
        .pipe(takeUntil(this.destroy$), catchError(() => of([] as Device[])))
        .subscribe((devices: Device[]) => {
          this.loginDeviceSearchResults = devices || [];
        });

      return;
    }

    if (this.devices?.length) {
      const lower = term.toLowerCase();
      this.loginDeviceSearchResults = this.devices
        .filter(
          (d) =>
            String(d.uid || '').toLowerCase().includes(lower) ||
            String(d.userAgent || '').toLowerCase().includes(lower)
        )
        .slice(0, 20);
    }
  }

  selectUser(u: User): void {
    this.user = u;
    this.userText = this.displayUser(u);
    this.loginSearchResults = [];
    this.filterLogins();
  }

  selectDevice(d: Device): void {
    if (this.deviceId) return;
    this.device = [d];
    this.deviceText = String(d?.uid ?? '');
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  searchLoginsAgainstUsers(searchString: string | null): void {
    if (this.userId) return;

    if (this.userStateAndData) {
      const term = !searchString || searchString === '.*' ? '' : searchString;

      this.to$<User[]>(
        this.userPagingService.search(this.userStateAndData[this.userState], term)
      )
        .pipe(takeUntil(this.destroy$), catchError(() => of([] as User[])))
        .subscribe((users: User[]) => {
          this.loginSearchResults = (users || []).slice(0, 10);
        });

      return;
    }

    if (!searchString || searchString === '.*') {
      this.loginSearchResults = (this.users || []).slice(0, 10);
      return;
    }

    const lower = searchString.toLowerCase();
    const filteredUsers = (this.users || []).filter((u) =>
      (u.displayName || '').toLowerCase().includes(lower)
    );

    this.loginSearchResults = filteredUsers.slice(0, 10);
  }

  clearDeviceFilter(): void {
    if (this.deviceId) return;
    this.device = [];
    this.deviceText = '';
    this.filterLogins();
  }

  clearUserFilter(): void {
    if (this.userId) return;
    this.user = null;
    this.userText = '';
    this.onUserInputChange('');
    this.filterLogins();
  }

  onClearUserInput(): void {
    if (this.userId) return;
    this.userText = '';
    this.user = null;
    this.loginSearchResults = [];
    this.filterLogins();
  }

  onClearDeviceInput(): void {
    if (this.deviceId) return;
    this.deviceText = '';
    this.device = [];
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  displayUser(user: User): string {
    return user && user.displayName ? user.displayName : '';
  }

  displayDevice(device: Device): string | number {
    return device && device.uid ? device.uid : '';
  }

  dateFilterChanged(): void {
    this.filterLogins();
  }

  loginResultsLimitChanged(): void {
    this.filterLogins();
  }

  iconClass(device: Device): string {
    if (!device) return 'fa fa-mobile admin-generic-icon-xs';
    if ((device as any).iconClass) return (device as any).iconClass as any;

    const userAgent = (device.userAgent || '').toLowerCase();
    if (device.appVersion === 'Web Client') return 'fa fa-desktop admin-desktop-icon-xs';
    if (userAgent.includes('android')) return 'fa fa-android admin-android-icon-xs';
    if (userAgent.includes('ios')) return 'fa fa-apple admin-apple-icon-xs';
    return 'fa fa-mobile admin-generic-icon-xs';
  }

  fromNow(timestamp: string | Date): string {
    return moment(timestamp).fromNow();
  }

  formatDate(timestamp: string | Date): string {
    return moment(timestamp).format('MMM D YYYY hh:mm:ss A');
  }

  hasPermission(permission: string): boolean {
    return this.adminUserService.hasPermission(permission);
  }
}
