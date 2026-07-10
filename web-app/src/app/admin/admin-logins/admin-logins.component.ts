import { Component, OnInit, Input, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { PageEvent } from '@angular/material/paginator';
import moment from 'moment';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { User } from '../admin-users/user';
import { Device, platformLabel as getDevicePlatformLabel, deviceIconName } from '../../entities/device/device';
import { LoginFilter, LoginPage, Login } from '../../entities/login/login';

import { DeviceService } from '../admin-devices/device.service';
import { UserPagingService } from '../services/user-paging.service';
import { LoginService } from './login.service';

@Component({
    selector: 'mage-logins',
    templateUrl: './admin-logins.component.html',
    styleUrls: ['./admin-logins.component.scss'],
    standalone: false
})
export class LoginsComponent implements OnInit {
  @Input() userId?: string;
  @Input() deviceId?: string;

  private destroyRef = inject(DestroyRef);
  private loginService = inject(LoginService);
  private userPagingService = inject(UserPagingService);
  private deviceService = inject(DeviceService);
  private router = inject(Router);

  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null as Date | null,
    endDate: null as Date | null
  };

  loginPage: LoginPage | null = null;
  loginResultsLimit = 10;
  loginPageIndex = 0;

  loginSearchResults: User[] = [];
  loginDeviceSearchResults: Device[] = [];

  filter: LoginFilter = {};

  user: User | null = null;
  device: Device | null = null;

  deviceText = '';
  userText = '';

  private userStateAndData: any = null;
  private deviceStateAndData: any = null;

  ngOnInit(): void {
    if (this.userId) {
      this.filter.user = { id: this.userId };
    }

    if (this.deviceId) {
      this.filter.device = { id: this.deviceId };
    }

    this.initUserSourceIfNeeded();
    this.initDeviceSourceIfNeeded();
    this.loadInitialLogins();
  }

  private isValidPageLink(link: any): link is string {
    return typeof link === 'string' && link.trim().length > 0;
  }

  get hasNext(): boolean {
    if (!this.isValidPageLink(this.loginPage?.next)) return false;
    if (!this.loginPage?.logins?.length) return false;
    return true;
  }

  private normalizePageLinks(page: any): void {
    if (!page) return;
    page.prev = this.isValidPageLink(page.prev) ? page.prev : null;
    page.next = this.isValidPageLink(page.next) ? page.next : null;
  }

  private initUserSourceIfNeeded(): void {
    if (this.userId) return;

    this.userStateAndData = this.userPagingService.constructDefault();

    this.userPagingService.refresh(this.userStateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.userPagingService.users(
          this.userStateAndData['all']
        );
        this.loginSearchResults = initial || [];
      });
  }

  private initDeviceSourceIfNeeded(): void {
    if (this.deviceId) return;

    this.deviceStateAndData = this.deviceService.constructDefault();

    this.deviceService.refresh(this.deviceStateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.deviceService.devices(
          this.deviceStateAndData['all']
        );
        this.loginDeviceSearchResults = initial || [];
      });
  }

  onLoginPage(event: PageEvent): void {
    if (event.pageSize !== +this.loginResultsLimit) {
      this.loginResultsLimit = event.pageSize;
      this.filterLogins();
      return;
    }
    this.loginPageIndex = event.pageIndex;
    if (event.pageIndex > (event.previousPageIndex ?? 0)) {
      this.pageLogin(this.loginPage?.next);
    } else {
      this.pageLogin(this.loginPage?.prev);
    }
  }

  loadInitialLogins(): void {
    this.loginPageIndex = 0;
    this.loginService.query({ filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe((loginPage: any) => {
        if (!loginPage) return;
        this.normalizePageLinks(loginPage);
        this.loginPage = loginPage;
      });
  }

  pageLogin(url: string | null | undefined): void {
    if (!this.isValidPageLink(url)) return;

    this.loginService.query({ url, filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe((nextPage: any) => {
        if (!nextPage) return;

        this.normalizePageLinks(nextPage);

        if (!nextPage?.logins?.length) {
          if (this.loginPage) {
            this.loginPage.next = null;
          }
          return;
        }

        this.loginPage = nextPage;
      });
  }

  filterLogins(): void {
    this.filter.user = this.userId
      ? { id: this.userId }
      : this.user
        ? { id: this.user.id }
        : null;

    this.filter.device = this.deviceId
      ? { id: this.deviceId }
      : this.device?.id
        ? { id: this.device.id }
        : null;

    this.filter.startDate = this.login.startDate;
    this.filter.endDate = this.login.endDate
      ? moment(this.login.endDate).endOf('day').toDate()
      : null;

    this.loadInitialLogins();
  }

  onUserSearchChange(term: string): void {
    if (this.userId) return;

    this.userText = term;
    this.user = null;

    if (!term) {
      this.loginSearchResults = [];
      this.filterLogins();
      return;
    }

    const searchTerm = term === '.*' ? '' : term;
    this.userPagingService.search(this.userStateAndData['all'], searchTerm)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of([] as User[])))
      .subscribe((users: User[]) => {
        this.loginSearchResults = (users || []).slice(0, 10);
      });
  }

  onDeviceSearchChange(term: string): void {
    if (this.deviceId) return;

    this.deviceText = term;
    this.device = null;

    if (!term) {
      this.loginDeviceSearchResults = [];
      this.filterLogins();
      return;
    }

    this.deviceService.search(
      this.deviceStateAndData['all'],
      term,
      null
    )
    .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of([] as Device[])))
    .subscribe((devices: Device[]) => {
      this.loginDeviceSearchResults = devices || [];
    });
  }

  selectUser(u: User): void {
    this.user = u;
    this.userText = this.displayUser(u);
    this.loginSearchResults = [];
    this.filterLogins();
  }

  selectDevice(d: Device): void {
    if (this.deviceId) return;
    this.device = d;
    this.deviceText = String(d?.uid ?? '');
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  onClearUserInput(): void {
    this.onUserSearchChange('');
  }

  onClearDeviceInput(): void {
    this.onDeviceSearchChange('');
  }

  displayUser(user: User): string {
    return user && user.displayName ? user.displayName : '';
  }

  dateFilterChanged(): void {
    this.filterLogins();
  }

  platformLabel(device: Device | null | undefined): string {
    return getDevicePlatformLabel(device);
  }

  iconName(device: Device | null | undefined): string {
    return deviceIconName(device);
  }

  fromNow(timestamp: string | Date): string {
    return moment(timestamp).fromNow();
  }

  absoluteTime(timestamp: string | Date): string {
    return moment(timestamp).format('lll');
  }

  goToUser(event: Event, login: Login): void {
    event.stopPropagation();
    if (!login.user?.id) return;

    this.router.navigate(['/admin/users', login.user.id]);
  }

  goToDevice(event: Event, login: Login): void {
    event.stopPropagation();
    if (!login.device?.id) return;

    this.router.navigate(['/admin/devices', login.device.id]);
  }

}
