import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../admin-breadcrumb/admin-breadcrumb.service';
import {
  AdminDeviceService,
  DashboardDevicePageInfo
} from '../services/admin-device.service';
import { UserService } from '../../user/user.service';
import { UserPagingService } from '../services/user-paging.service';
import { platformLabel, deviceIconName } from '../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';
import { LoginsComponent } from '../admin-logins/admin-logins.component';

@Component({
    selector: 'admin-dashboard',
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.scss'],
    imports: [
      FormsModule,
      RouterModule,
      LoginsComponent,
      MatCardModule,
      MatBadgeModule,
      MatFormFieldModule,
      MatInputModule,
      MatListModule,
      MatIconModule,
      MatButtonModule,
      MatTooltipModule,
      MatPaginatorModule
    ]
})
export class AdminDashboardComponent implements OnInit {
  private userService = inject(UserService);
  private sessionService = inject(SessionService);
  private deviceService = inject(AdminDeviceService);
  private userPagingService = inject(UserPagingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private breadcrumbService = inject(AdminBreadcrumbService);
  private destroyRef = inject(DestroyRef);

  @Output() onUserActivated = new EventEmitter<any>();
  @Output() onDeviceEnabled = new EventEmitter<any>();

  userSearch = '';
  userState = 'inactive';

  deviceSearch = '';
  deviceState = 'unregistered';

  stateAndData!: ReturnType<UserPagingService['constructDefault']>;

  readonly inactiveUsers = signal<
    Array<ReturnType<UserPagingService['users']>[number]>
  >([]);
  readonly unregisteredDevices = signal<any[]>([]);

  readonly userPageSize = 5;
  readonly devicePageSize = 5;

  readonly userPageIndex = signal(0);
  loadingUsersPage = false;
  loadingDevicesPage = false;

  private allInactiveUsers: Array<
    ReturnType<UserPagingService['users']>[number]
  > = [];

  readonly deviceStart = signal(0);
  readonly deviceNextStart = signal<number | null>(null);
  readonly devicePrevStart = signal<number | null>(null);
  readonly deviceTotalCount = signal(0);

  private devicePageCache = new Map<number, DashboardDevicePageInfo>();

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Dashboard', icon: 'analytics' }];

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.stateAndData = this.userPagingService.constructDefault();

    this.refreshDevices();
    this.refreshUsers();
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
    return this.deviceTotalCount() || this.unregisteredDevices().length;
  }

  hasNext(): boolean {
    return (this.userPageIndex() + 1) * this.userPageSize < this.count();
  }

  next(): void {
    if (!this.hasNext() || this.loadingUsersPage) return;

    this.userPageIndex.update((i) => i + 1);
    this.applyUserPage();
  }

  hasPrevious(): boolean {
    return this.userPageIndex() > 0;
  }

  previous(): void {
    if (!this.hasPrevious() || this.loadingUsersPage) return;

    this.userPageIndex.update((i) => i - 1);
    this.applyUserPage();
  }

  hasNextDevice(): boolean {
    return this.deviceNextStart() !== null && !this.loadingDevicesPage;
  }

  nextDevice(): void {
    const next = this.deviceNextStart();
    if (!this.hasNextDevice() || next === null) return;

    this.loadDevicePage(next);
  }

  hasPreviousDevice(): boolean {
    return this.devicePrevStart() !== null && !this.loadingDevicesPage;
  }

  previousDevice(): void {
    const prev = this.devicePrevStart();
    if (!this.hasPreviousDevice() || prev === null) return;

    this.loadDevicePage(prev);
  }

  onUserPage(event: PageEvent): void {
    this.userPageIndex.set(event.pageIndex);
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
    this.userPageIndex.set(0);
    this.loadingUsersPage = true;

    this.userPagingService
      .search(this.stateAndData[this.userState], this.userSearch)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedDevice) => {
        this.devicePageCache.clear();
        this.refreshDevices();
        this.onDeviceEnabled.emit({ device: updatedDevice });
      });
  }

  private refreshUsers(): void {
    this.userPageIndex.set(0);
    this.loadingUsersPage = true;

    this.userPagingService
      .refresh(this.stateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.devicePageCache.set(start, page);
          this.applyDevicePage(page);
          this.loadingDevicesPage = false;
        },
        error: () => {
          this.unregisteredDevices.set([]);
          this.deviceNextStart.set(null);
          this.devicePrevStart.set(null);
          this.loadingDevicesPage = false;
        }
      });
  }

  private applyDevicePage(page: DashboardDevicePageInfo): void {
    this.deviceStart.set(page.start);
    this.deviceNextStart.set(page.nextStart);
    this.devicePrevStart.set(page.prevStart);
    this.deviceTotalCount.set(page.totalCount);
    this.unregisteredDevices.set(page.devices || []);
  }

  private setUsers(
    users: Array<ReturnType<UserPagingService['users']>[number]> = []
  ): void {
    this.allInactiveUsers = users || [];
    this.clampUserPageIndex();
    this.applyUserPage();
  }

  private applyUserPage(): void {
    const start = this.userPageIndex() * this.userPageSize;
    const end = start + this.userPageSize;

    this.inactiveUsers.set(this.allInactiveUsers.slice(start, end));
  }

  private clampUserPageIndex(): void {
    const maxPageIndex = this.maxUserPageIndex();

    if (this.userPageIndex() > maxPageIndex) {
      this.userPageIndex.set(maxPageIndex);
    }
  }

  private maxUserPageIndex(): number {
    const total = this.count();

    if (!total) return 0;

    return Math.ceil(total / this.userPageSize) - 1;
  }
}
