import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { StateService } from '@uirouter/angular';
import {
  LocalStorageService,
  UserService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import {
  DevicesResponse,
  DevicesService,
  SearchOptions
} from '../devices.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';

@Component({
  selector: 'admin-devices',
  templateUrl: './devices-dashboard.component.html',
  styleUrls: ['./devices-dashboard.component.scss']
})
export class DeviceDashboardComponent implements OnInit {
  devices: DevicesResponse;
  filteredDevices: Device[] = [];
  displayedColumns: string[] = ['device'];

  numChars = 180;
  toolTipWidth = '1000px';
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

  breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Devices', iconClass: 'fa fa-calendar' }
  ];

  constructor(
    private modal: MatDialog,
    private localStorageService: LocalStorageService,
    private stateService: StateService,
    private deviceService: DevicesService,
    @Inject(UserService) private userService
  ) {}

  ngOnInit(): void {
    this.initPermissions();
    this.refreshDevices();
    this.updateResponsiveLayout();
  }

  /** Initialize permission flags */
  private initPermissions(): void {
    const permissions = this.userService.myself?.role?.permissions || [];
    this.hasDeviceCreatePermission = permissions.includes('CREATE_USER');
  }

  /** Fetch and apply filters to the device list */
  refreshDevices(): void {
    this.deviceService.getDevices(this.searchOptions).subscribe({
      next: (devices) => {
        this.devices = devices;
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching devices:', err)
    });
  }

  /** Apply search term filter */
  private applyFilters(): void {
    if (!this.devices) return;

    this.filteredDevices = this.devices.items.devices || [];
    this.totalDevices = this.devices.totalCount ?? this.filteredDevices.length;
  }

  /** Handle search term change */
  onSearchTermChanged(term: string): void {
    this.deviceSearch = term;

    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      term: term.trim() || undefined
    };

    this.refreshDevices();
  }

  /** Clear search */
  onSearchCleared(): void {
    this.deviceSearch = '';
    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      term: undefined
    };
    this.refreshDevices();
  }

  /** Reset all filters and pagination */
  reset(): void {
    this.deviceSearch = '';
    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      state: 'all',
      term: undefined
    };
    this.refreshDevices();
  }

  /** Handle pagination change */
  onPageChange(device: PageEvent): void {
    this.searchOptions = {
      ...this.searchOptions,
      page: device.pageIndex,
      page_size: device.pageSize
    };
    this.refreshDevices();
  }

  /** Navigate to device detail */
  gotoDevice(device: Device): void {
    this.stateService.go('admin.device', { deviceId: device.id });
  }

  /** Handle status filter change */
  onStatusFilterChange(value: 'all' | 'registered' | 'unregistered'): void {
    this.searchOptions = { ...this.searchOptions, state: value, page: 0 };
    this.refreshDevices();
  }

  /** Open create device dialog */
  createDevice(): void {
    const dialogRef = this.modal.open(CreateDeviceDialogComponent, {
      maxWidth: '100vw',
      data: { device: { uid: '', description: '', user: { id: '' } } }
    });

    dialogRef.afterClosed().subscribe((newDevice) => {
      if (newDevice) this.refreshDevices();
    });
  }

  /** Update layout-related values on resize */
  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  /** Calculates responsive values */
  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }
}
