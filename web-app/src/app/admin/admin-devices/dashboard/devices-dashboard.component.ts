import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  AdminDeviceService,
  DevicesResponse,
  SearchOptions
} from '../../services/admin-device.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { Device } from '../../../entities/device/device';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';
import { AdminToastService } from '../../services/admin-toast.service';
import { deviceIconName, platformLabel as getDevicePlatformLabel } from '../../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'admin-devices',
    templateUrl: './devices-dashboard.component.html',
    styleUrls: ['./devices-dashboard.component.scss'],
    imports: [
      MatCardModule,
      MatChipsModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatButtonModule,
      MatListModule,
      MatPaginatorModule,
      FormsModule,
      RouterLink
    ]
})
export class DeviceDashboardComponent implements OnInit, OnDestroy {
  devices!: DevicesResponse;
  readonly filteredDevices = signal<Device[]>([]);

  deviceSearch = '';

  searchOptions: SearchOptions = {
    page: 0,
    page_size: 10,
    state: 'all'
  };

  readonly totalDevices = signal(0);
  pageSizeOptions = [5, 10, 25, 50];
  get hasDeviceCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_DEVICE');
  }

  deviceStatusFilter: 'all' | 'registered' | 'unregistered' = 'all';

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Devices', icon: 'devices' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  private readonly refresh$ = new Subject<void>();
  private readonly searchTerm$ = new Subject<string>();

  constructor(
    private modal: MatDialog,
    private deviceService: AdminDeviceService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.refresh$
      .pipe(
        switchMap(() => this.deviceService.getDevices(this.searchOptions).pipe(
          catchError((err) => {
            console.error('Error fetching devices:', err);
            return EMPTY;
          })
        )),
        takeUntilDestroyed()
      )
      .subscribe((devices) => {
        this.devices = devices;
        this.applyFilters();
      });

    this.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchOptions = { ...this.searchOptions, page: 0, term: term.trim() || undefined };
        this.refreshDevices();
      });
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.refreshDevices();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  refreshDevices(): void {
    this.refresh$.next();
  }

  private applyFilters(): void {
    if (!this.devices) return;

    const devices = this.devices.items.devices || [];
    this.filteredDevices.set(devices);
    this.totalDevices.set(this.devices.totalCount ?? devices.length);
  }

  iconName(device: Device): string {
    return deviceIconName(device);
  }

  platformName(device: Device): string {
    return getDevicePlatformLabel(device);
  }

  onSearchTermChanged(term: string): void {
    this.deviceSearch = term;
    this.searchTerm$.next(term);
  }

  onSearchCleared(): void {
    this.deviceSearch = '';
    this.searchTerm$.next('');
  }

  onPageChange(event: PageEvent): void {
    this.searchOptions = {
      ...this.searchOptions,
      page: event.pageIndex,
      page_size: event.pageSize
    };
    this.refreshDevices();
  }

  onStatusFilterChange(value: 'all' | 'registered' | 'unregistered'): void {
    this.searchOptions = { ...this.searchOptions, state: value, page: 0 };
    this.refreshDevices();
  }

  createDevice(): void {
    const dialogRef = this.modal.open(CreateDeviceDialogComponent, {
      width: '600px',
      data: { device: { uid: '', description: '', user: { id: '' } } }
    });

    dialogRef.afterClosed().subscribe((newDevice: Device) => {
      if (newDevice) {
        this.toastService.show(
          'Device Created',
          ['/admin/devices', newDevice.id],
          'Go to Device'
        );
        this.refreshDevices();
      }
    });
  }
}
