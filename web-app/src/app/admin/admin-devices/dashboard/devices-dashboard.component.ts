import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import {
  AdminDeviceService,
  DevicesResponse,
  SearchOptions
} from '../../services/admin-device.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { Device } from '../../../entities/device/device';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';
import { Subject, takeUntil } from 'rxjs';
import { AdminToastService } from '../../services/admin-toast.service';
import { deviceIconName, platformLabel as getDevicePlatformLabel } from '../../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'admin-devices',
    templateUrl: './devices-dashboard.component.html',
    styleUrls: ['./devices-dashboard.component.scss'],
    standalone: false
})
export class DeviceDashboardComponent implements OnInit, OnDestroy {
  devices!: DevicesResponse;
  filteredDevices: Device[] = [];

  deviceSearch = '';

  searchOptions: SearchOptions = {
    page: 0,
    page_size: 10,
    state: 'all'
  };

  totalDevices = 0;
  pageSizeOptions = [5, 10, 25, 50];
  hasDeviceCreatePermission = false;

  deviceStatusFilter: 'all' | 'registered' | 'unregistered' = 'all';

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Devices', icon: 'devices' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  private destroy$ = new Subject<void>();

  constructor(
    private modal: MatDialog,
    private deviceService: AdminDeviceService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.subscribeToUser();
    this.refreshDevices();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToUser(): void {
    this.sessionService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.hasDeviceCreatePermission =
          user?.role?.permissions?.includes('CREATE_DEVICE') || false;
      });
  }

  refreshDevices(): void {
    this.deviceService.getDevices(this.searchOptions).subscribe({
      next: (devices) => {
        this.devices = devices;
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching devices:', err)
    });
  }

  private applyFilters(): void {
    if (!this.devices) return;

    this.filteredDevices = this.devices.items.devices || [];
    this.totalDevices = this.devices.totalCount ?? this.filteredDevices.length;
  }

  iconName(device: Device): string {
    return deviceIconName(device);
  }

  platformName(device: Device): string {
    return getDevicePlatformLabel(device);
  }

  onSearchTermChanged(term: string): void {
    this.deviceSearch = term;
    this.searchOptions = { ...this.searchOptions, page: 0, term: term.trim() || undefined };
    this.refreshDevices();
  }

  onSearchCleared(): void {
    this.deviceSearch = '';
    this.searchOptions = { ...this.searchOptions, page: 0, term: undefined };
    this.refreshDevices();
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
