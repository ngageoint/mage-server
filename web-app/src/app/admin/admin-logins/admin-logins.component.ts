import { Component, OnInit, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import type { PageEvent } from '@angular/material/paginator';
import moment from 'moment';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { User } from '../admin-users/user';
import { Device, platformLabel as getDevicePlatformLabel, deviceIconName } from '../../entities/device/device';
import { LoginFilter, LoginPage, Login } from '../../entities/login/login';

import { DeviceService, DeviceStateAndData } from '../admin-devices/device.service';
import { UserPagingService, UsersStateAndData } from '../services/user-paging.service';
import { LoginService } from './login.service';

@Component({
    selector: 'mage-logins',
    templateUrl: './admin-logins.component.html',
    styleUrls: ['./admin-logins.component.scss'],
    imports: [
        FormsModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatListModule,
        MatPaginatorModule
    ]
})
export class LoginsComponent implements OnInit {
  readonly userId = input<string>();
  readonly deviceId = input<string>();

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly loginService: LoginService = inject(LoginService);
  private readonly userPagingService: UserPagingService = inject(UserPagingService);
  private readonly deviceService: DeviceService = inject(DeviceService);
  private readonly router: Router = inject(Router);

  login = {
    startDate: null as Date | null,
    endDate: null as Date | null
  };

  readonly loginPage = signal<LoginPage | null>(null);
  loginResultsLimit = 10;
  readonly loginPageIndex = signal(0);

  readonly loginSearchResults = signal<User[]>([]);
  readonly loginDeviceSearchResults = signal<Device[]>([]);

  filter: LoginFilter = {};

  user: User | null = null;
  device: Device | null = null;

  deviceText = '';
  userText = '';

  private userStateAndData: UsersStateAndData | null = null;
  private deviceStateAndData: DeviceStateAndData | null = null;

  ngOnInit(): void {
    const userId = this.userId();
    if (userId) {
      this.filter.user = { id: userId };
    }

    const deviceId = this.deviceId();
    if (deviceId) {
      this.filter.device = { id: deviceId };
    }

    this.initUserSourceIfNeeded();
    this.initDeviceSourceIfNeeded();
    this.loadInitialLogins();
  }

  private isValidPageLink(link: string | null | undefined): link is string {
    return typeof link === 'string' && link.trim().length > 0;
  }

  get hasNext(): boolean {
    const loginPage = this.loginPage();
    if (!this.isValidPageLink(loginPage?.next)) return false;
    if (!loginPage?.logins?.length) return false;
    return true;
  }

  private normalizePageLinks(page: LoginPage): void {
    if (!page) return;
    page.prev = this.isValidPageLink(page.prev) ? page.prev : null;
    page.next = this.isValidPageLink(page.next) ? page.next : null;
  }

  private initUserSourceIfNeeded(): void {
    if (this.userId()) return;

    this.userStateAndData = this.userPagingService.constructDefault();

    this.userPagingService.refresh(this.userStateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.userPagingService.users(
          this.userStateAndData['all']
        );
        this.loginSearchResults.set(initial || []);
      });
  }

  private initDeviceSourceIfNeeded(): void {
    if (this.deviceId()) return;

    this.deviceStateAndData = this.deviceService.constructDefault();

    this.deviceService.refresh(this.deviceStateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(() => {
        const initial = this.deviceService.devices(
          this.deviceStateAndData['all']
        );
        this.loginDeviceSearchResults.set(initial || []);
      });
  }

  onLoginPage(event: PageEvent): void {
    if (event.pageSize !== +this.loginResultsLimit) {
      this.loginResultsLimit = event.pageSize;
      this.filterLogins();
      return;
    }
    this.loginPageIndex.set(event.pageIndex);
    if (event.pageIndex > (event.previousPageIndex ?? 0)) {
      this.pageLogin(this.loginPage()?.next);
    } else {
      this.pageLogin(this.loginPage()?.prev);
    }
  }

  loadInitialLogins(): void {
    this.loginPageIndex.set(0);
    this.loginService.query({ filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe((loginPage) => {
        if (!loginPage) return;
        this.normalizePageLinks(loginPage);
        this.loginPage.set(loginPage);
      });
  }

  pageLogin(url: string | null | undefined): void {
    if (!this.isValidPageLink(url)) return;

    this.loginService.query({ url, filter: this.filter, limit: this.loginResultsLimit })
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe((nextPage) => {
        if (!nextPage) return;

        this.normalizePageLinks(nextPage);

        if (!nextPage?.logins?.length) {
          this.loginPage.update((page) => page && { ...page, next: null });
          this.loginPageIndex.update((index) => Math.max(0, index - 1));
          return;
        }

        this.loginPage.set(nextPage);
      });
  }

  filterLogins(): void {
    const userId = this.userId();
    this.filter.user = userId
      ? { id: userId }
      : this.user
        ? { id: this.user.id }
        : null;

    const deviceId = this.deviceId();
    this.filter.device = deviceId
      ? { id: deviceId }
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
    if (this.userId()) return;

    this.userText = term;
    this.user = null;

    const searchTerm = term === '.*' ? '' : term;
    this.userPagingService.search(this.userStateAndData['all'], searchTerm)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of([] as User[])))
      .subscribe((users: User[]) => {
        this.loginSearchResults.set((users || []).slice(0, 10));
      });

    if (!term) {
      this.filterLogins();
    }
  }

  onDeviceSearchChange(term: string): void {
    if (this.deviceId()) return;

    this.deviceText = term;
    this.device = null;

    this.deviceService.search(
      this.deviceStateAndData['all'],
      term,
      null
    )
    .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of([] as Device[])))
    .subscribe((devices: Device[]) => {
      this.loginDeviceSearchResults.set(devices || []);
    });

    if (!term) {
      this.filterLogins();
    }
  }

  selectUser(u: User): void {
    this.user = u;
    this.userText = this.displayUser(u);
    this.loginSearchResults.set([]);
    this.filterLogins();
  }

  selectDevice(d: Device): void {
    if (this.deviceId()) return;
    this.device = d;
    this.deviceText = String(d?.uid ?? '');
    this.loginDeviceSearchResults.set([]);
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
