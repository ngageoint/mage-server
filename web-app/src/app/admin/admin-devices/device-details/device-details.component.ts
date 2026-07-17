import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { DeleteDeviceComponent } from '../delete-device/delete-device.component';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';
import { Device } from '../../../entities/device/device';
import { AdminDeviceService } from '../../services/admin-device.service';
import { deviceIconName } from '../../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'mage-device-details',
    templateUrl: './device-details.component.html',
    styleUrls: ['./device-details.component.scss'],
    standalone: false
})
export class DeviceDetailsComponent implements OnInit, OnDestroy {
  device: Device | null = null;

  currentUserDisplayName: string | null = null;

  hasUpdatePermission = false;
  hasDeletePermission = false;

  #breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Devices',
    icon: 'devices',
    route: ['/admin/devices']
  }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this.#breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this.#breadcrumbs;
  }

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  saving = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private deviceService: AdminDeviceService,
    private sessionService: SessionService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    const deviceId = this.route.snapshot.paramMap.get('deviceId');
    if (!deviceId) {
      this.error = 'Missing deviceId route param';
      return;
    }

    this.hasUpdatePermission =
      this.sessionService.hasPermission('UPDATE_DEVICE');

    this.hasDeletePermission =
      this.sessionService.hasPermission('DELETE_DEVICE');

    this.loadDevice(deviceId);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private loadDevice(deviceId: string): void {
    this.deviceService.getDeviceById(deviceId).subscribe({
      next: (device: Device) => {
        this.applyDevice(device);
      },
      error: () => {
        this.error = 'Failed to load device';
      }
    });
  }

  private applyDevice(device: Device): void {
    this.device = device;
    this.breadcrumbs = [{
      title: 'Devices',
      icon: 'devices',
      route: ['/admin/devices']
    },{
      title: device?.uid || 'Device'
    }];

    this.currentUserDisplayName = device?.user?.displayName || null;
  }

  private reloadDevice(): void {
    if (!this.device?.id) return;

    const deviceId = this.device.id;
    this.deviceService.getDeviceById(deviceId).subscribe({
      next: (d: Device) => {
        this.applyDevice(d);
      },
      error: () => {
        this.error = 'Failed to reload device';
      }
    });
  }

  editDeviceDetails(): void {
    if (!this.device) return;

    const dialogRef = this.dialog.open(CreateDeviceDialogComponent, {
      width: '600px',
      data: { device: this.device }
    });

    dialogRef.afterClosed().subscribe((updatedDevice?: Device) => {
      if (!updatedDevice) return;
      this.applyDevice(updatedDevice);
    });
  }

  get registerToggleLabel(): string {
    if (!this.device) return '';
    return this.device.registered ? 'Deactivate Device' : 'Activate Device';
  }

  get registerToggleIcon(): string {
    if (!this.device) return '';
    return this.device.registered ? 'block' : 'check_circle';
  }

  get registerToggleHelpText(): string {
    if (!this.device) return '';
    return this.device.registered
      ? 'Deactivating will deny device from accessing MAGE data. All device information will be retained.'
      : 'Activating will allow device to access MAGE data. The device can be deactivated at any time.';
  }

  toggleRegistration(): void {
    if (!this.device) return;

    this.device.registered
      ? this.unregisterDevice(this.device)
      : this.registerDevice(this.device);
  }

  registerDevice(device: Device): void {
    if (!device?.id || this.saving) return;

    this.saving = true;
    this.error = null;

    this.deviceService.updateDevice(device.id, { registered: true }).subscribe({
      next: (updated) => {
        if (updated) this.applyDevice(updated);

        this.saving = false;
        this.reloadDevice();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to register device';
        this.saving = false;
      }
    });
  }

  unregisterDevice(device: Device): void {
    if (!device?.id || this.saving) return;

    this.saving = true;
    this.error = null;

    this.deviceService.updateDevice(device.id, { registered: false }).subscribe({
      next: (updated) => {
        if (updated) this.applyDevice(updated);

        this.saving = false;
        this.reloadDevice();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to unregister device';
        this.saving = false;
      }
    });
  }

  confirmDeleteDevice(): void {
    if (!this.device) return;

    const dialogRef = this.dialog.open(DeleteDeviceComponent, {
      width: '600px',
      data: { device: this.device }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) {
        this.deleteDevice();
      }
    });
  }

  private deleteDevice(): void {
    if (!this.device?.id || this.saving) return;

    this.saving = true;
    this.error = null;

    this.deviceService.deleteDevice(this.device.id).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/admin/devices']);
      },
      error: () => {
        this.error = 'Failed to delete device';
        this.saving = false;
      }
    });
  }

  iconClass(device: Device): string {
    return deviceIconName(device);
  }
}
