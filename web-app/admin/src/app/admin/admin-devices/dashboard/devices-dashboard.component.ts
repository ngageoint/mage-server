import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import {
  AdminDeviceService,
  DevicesResponse,
  SearchOptions
} from '../../services/admin-device.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { Device } from '../../../../@types/dashboard/devices-dashboard';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';
import { AdminUserService } from '../../services/admin-user.service';
import { Subject, takeUntil } from 'rxjs';
import { AdminToastService } from '../../services/admin-toast.service';

@Component({
  selector: 'admin-devices',
  templateUrl: './devices-dashboard.component.html',
  styleUrls: ['./devices-dashboard.component.scss']
})
export class DeviceDashboardComponent implements OnInit, OnDestroy {
  devices!: DevicesResponse;
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
    { title: 'Devices', iconClass: 'fa fa-mobile' }
  ];

  private destroy$ = new Subject<void>();
  currentUser: any = null;

  constructor(
    private modal: MatDialog,
    private router: Router,
    private deviceService: AdminDeviceService,
    private userService: AdminUserService,
    private toastService: AdminToastService
  ) {}

  ngOnInit(): void {
    this.subscribeToUser();
    this.refreshDevices();
    this.updateResponsiveLayout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToUser(): void {
    this.userService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
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

  onSearchTermChanged(term: string): void {
    this.deviceSearch = term;

    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      term: term.trim() || undefined
    };

    this.refreshDevices();
  }

  onSearchCleared(): void {
    this.deviceSearch = '';
    this.searchOptions = {
      ...this.searchOptions,
      page: 0,
      term: undefined
    };
    this.refreshDevices();
  }

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

  onPageChange(device: PageEvent): void {
    this.searchOptions = {
      ...this.searchOptions,
      page: device.pageIndex,
      page_size: device.pageSize
    };
    this.refreshDevices();
  }

  onStatusFilterChange(value: 'all' | 'registered' | 'unregistered'): void {
    this.searchOptions = { ...this.searchOptions, state: value, page: 0 };
    this.refreshDevices();
  }

  createDevice(): void {
    const dialogRef = this.modal.open(CreateDeviceDialogComponent, {
      width: '80%',
      data: { device: { uid: '', description: '', user: { id: '' } } }
    });

    dialogRef.afterClosed().subscribe((newDevice: Device) => {
      if (newDevice) {
        this.toastService.show(
          'Device Created',
          ['../devices', newDevice.id],
          'Go to Device'
        );
        this.refreshDevices();
      } 
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }

  iconClass(device: Device): string {
    if (!device) return 'fa fa-mobile admin-generic-icon';

    const userAgent = (device.userAgent || '').toLowerCase();

    if (device.appVersion === 'Web Client') {
      return 'fa fa-desktop admin-desktop-icon';
    }

    if (userAgent.includes('android')) {
      return 'fa fa-android admin-android-icon';
    }

    if (userAgent.includes('ios')) {
      return 'fa fa-apple admin-apple-icon';
    }

    return 'fa fa-mobile admin-generic-icon';
  }
}
