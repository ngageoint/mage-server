import {
  Component,
  EventEmitter,
  Output,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';

import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import {
  AdminDeviceService,
  DashboardDevicePageInfo
} from '../services/admin-device.service';
import { UserService } from '../../user/user.service';
import { UserPagingService } from '../services/user-paging.service';
import { platformLabel, deviceIconName } from '../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'admin-dashboard',
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.scss'],
    standalone: false
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @Output() onUserActivated = new EventEmitter<any>();
  @Output() onDeviceEnabled = new EventEmitter<any>();

  userSearch = '';
  userState = 'inactive';

  deviceSearch = '';
  deviceState = 'unregistered';

  stateAndData!: ReturnType<UserPagingService['constructDefault']>;

  inactiveUsers: Array<ReturnType<UserPagingService['users']>[number]> = [];
  unregisteredDevices: any[] = [];

  readonly userPageSize = 5;
  readonly devicePageSize = 5;

  userPageIndex = 0;
  loadingUsersPage = false;
  loadingDevicesPage = false;

  private allInactiveUsers: Array<
    ReturnType<UserPagingService['users']>[number]
  > = [];

  deviceStart = 0;
  deviceNextStart: number | null = null;
  devicePrevStart: number | null = null;
  deviceTotalCount = 0;

  private devicePageCache = new Map<number, DashboardDevicePageInfo>();

  breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Dashboard', icon: 'analytics' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private deviceService: AdminDeviceService,
    private userPagingService: UserPagingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.stateAndData = this.userPagingService.constructDefault();

    this.refreshDevices();
    this.refreshUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToUser(user: any): void {
    if (!user?.id) return;

    this.router.navigate(['../users', user.id], { relativeTo: this.route });
  }

  goToDevice(device: any): void {
    if (!device?.id) return;

    this.router.navigate(['../devices', device.id], { relativeTo: this.route });
  }

  count(): number {
    const state = this.stateAndData?.[this.userState];

    if (!state) {
      return this.allInactiveUsers.length;
    }

    const serviceCount = this.userPagingService.count(state);

    return serviceCount || this.allInactiveUsers.length;
  }

  deviceCount(): number {
    return this.deviceTotalCount || this.unregisteredDevices.length;
  }

  hasNext(): boolean {
    return (this.userPageIndex + 1) * this.userPageSize < this.count();
  }

  next(): void {
    if (!this.hasNext() || this.loadingUsersPage) return;

    this.userPageIndex += 1;
    this.applyUserPage();
  }

  hasPrevious(): boolean {
    return this.userPageIndex > 0;
  }

  previous(): void {
    if (!this.hasPrevious() || this.loadingUsersPage) return;

    this.userPageIndex -= 1;
    this.applyUserPage();
  }

  hasNextDevice(): boolean {
    return this.deviceNextStart !== null && !this.loadingDevicesPage;
  }

  nextDevice(): void {
    if (!this.hasNextDevice() || this.deviceNextStart === null) return;

    this.loadDevicePage(this.deviceNextStart);
  }

  hasPreviousDevice(): boolean {
    return this.devicePrevStart !== null && !this.loadingDevicesPage;
  }

  previousDevice(): void {
    if (!this.hasPreviousDevice() || this.devicePrevStart === null) return;

    this.loadDevicePage(this.devicePrevStart);
  }

  onUserPage(event: PageEvent): void {
    this.userPageIndex = event.pageIndex;
    this.applyUserPage();
  }

  onDevicePage(event: PageEvent): void {
    if (event.pageIndex > event.previousPageIndex!) {
      this.nextDevice();
    } else {
      this.previousDevice();
    }
  }

  search(): void {
    this.userPageIndex = 0;
    this.loadingUsersPage = true;

    this.userPagingService
      .search(this.stateAndData[this.userState], this.userSearch)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.setUsers(users);
          this.loadingUsersPage = false;
        },
        error: () => {
          this.loadingUsersPage = false;
        }
      });
  }

  searchDevices(): void {
    this.devicePageCache.clear();
    this.loadDevicePage(0);
  }

  iconName(device: any): string {
    return deviceIconName(device);
  }

  platformLabel(device: any): string {
    return platformLabel(device);
  }

  hasPermission(permission: string): boolean {
    return this.sessionService.hasPermission(permission);
  }

  activateUser(user: any): void {
    if (!user?.id) return;

    user.active = true;

    this.userService
      .updateUser(user.id, user)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshUsers();
        this.onUserActivated.emit({ user });
      });
  }

  registerDevice(event: MouseEvent, device: any): void {
    event.preventDefault();
    event.stopPropagation();

    if (!device?.id) return;

    this.deviceService
      .updateDevice(device.id, { registered: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((updatedDevice) => {
        this.devicePageCache.clear();
        this.refreshDevices();
        this.onDeviceEnabled.emit({ device: updatedDevice });
      });
  }

  private refreshUsers(): void {
    this.userPageIndex = 0;
    this.loadingUsersPage = true;

    this.userPagingService
      .refresh(this.stateAndData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const users = this.userPagingService.users(
            this.stateAndData[this.userState]
          );

          this.setUsers(users);
          this.loadingUsersPage = false;
        },
        error: () => {
          this.loadingUsersPage = false;
        }
      });
  }

  private refreshDevices(): void {
    this.devicePageCache.clear();
    this.loadDevicePage(0);
  }

  private loadDevicePage(start: number): void {
    const cached = this.devicePageCache.get(start);

    if (cached) {
      this.applyDevicePage(cached);
      return;
    }

    this.loadingDevicesPage = true;

    this.deviceService
      .getDashboardDevicePage({
        start,
        limit: this.devicePageSize,
        registered: false,
        user: true,
        includePagination: true,
        term: this.deviceSearch || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.devicePageCache.set(start, page);
          this.applyDevicePage(page);
          this.loadingDevicesPage = false;
        },
        error: () => {
          this.unregisteredDevices = [];
          this.deviceNextStart = null;
          this.devicePrevStart = null;
          this.loadingDevicesPage = false;
        }
      });
  }

  private applyDevicePage(page: DashboardDevicePageInfo): void {
    this.deviceStart = page.start;
    this.deviceNextStart = page.nextStart;
    this.devicePrevStart = page.prevStart;
    this.deviceTotalCount = page.totalCount;
    this.unregisteredDevices = page.devices || [];
  }

  private setUsers(
    users: Array<ReturnType<UserPagingService['users']>[number]> = []
  ): void {
    this.allInactiveUsers = users || [];
    this.clampUserPageIndex();
    this.applyUserPage();
  }

  private applyUserPage(): void {
    const start = this.userPageIndex * this.userPageSize;
    const end = start + this.userPageSize;

    this.inactiveUsers = this.allInactiveUsers.slice(start, end);
  }

  private clampUserPageIndex(): void {
    const maxPageIndex = this.maxUserPageIndex();

    if (this.userPageIndex > maxPageIndex) {
      this.userPageIndex = maxPageIndex;
    }
  }

  private maxUserPageIndex(): number {
    const total = this.count();

    if (!total) return 0;

    return Math.ceil(total / this.userPageSize) - 1;
  }
}
